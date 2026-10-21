import { providersEnum, tokenTypeEnum } from '../../common/constants.js'
import { decodeToken } from '../../common/utils/token.utils.js'
import envConfig from '../../../config/config.js'
import UserRepository from "../../DB/Repositories/user.repository.js"
import HttpAppError from "../../common/utils/Errors/app.error.js"
import { BadRequestException, ConflictException, NotFoundException } from "../../common/utils/Errors/exception.error.js"
import { encrypt } from "../../common/utils/Security/encryption.security.js"
import { compareTwoHashes, hash } from "../../common/utils/Security/hash.security.js"
import crypto from "node:crypto"
import { generateToken } from '../../common/utils/token.utils.js'
import  {OAuth2Client} from 'google-auth-library'
import { calculateTTL, set } from '../../common/Services/redis.services.js'
import {v4 as uuidv4} from 'uuid'
import { uuid } from 'zod/mini'

const userRepo = new UserRepository()


export const registerUser = async (data)=>{
const {firstName, lastName, email , password ,gender , age ,phoneNumber,role} = data

const isExistingUser = await userRepo.findUserByEmail(email)
if(isExistingUser){
    throw new ConflictException("Email already exists")
}
let encryptedPhone 
if(phoneNumber) encryptedPhone = encrypt(phoneNumber)
const hashedPassword = await hash(password)
return userRepo.createDocument({firstName, lastName, email , password:hashedPassword ,gender , age ,phoneNumber :encryptedPhone || undefined,role} )

}

const buildTokens = (user) => {
  const tokensPayload = {
    _id: user._id,
    email: user.email,
    role: user.role,
  };

  // generate access token
  const accessToken = generateToken(
    tokensPayload,
    envConfig.jwt.user.access_token_secret,
    { expiresIn: envConfig.jwt.user.access_token_expires_in , jwtid : uuidv4()},
  );

  const refreshToken = generateToken(
    tokensPayload,
    envConfig.jwt.user.refresh_token_secret,
    { expiresIn: envConfig.jwt.user.refresh_token_expires_in , jwtid : uuidv4()},
  );

  return { accessToken, refreshToken };
};

export const signin = async (data)=>{
const { email , password } = data

const user = await userRepo.findOneDocument({email , provider:providersEnum.SYSTEM })

if(!user){
  throw new NotFoundException("Invalid email or password")
}
const isPasswordMatched  = await compareTwoHashes(user.password , password)

  if(!isPasswordMatched)  throw new NotFoundException("Invalid email or password")


 return buildTokens(user) 
}  
 

export const refreshToken = async (userRefreshToken) => {
    const user = await decodeToken({
        token: userRefreshToken,
        tokentype: tokenTypeEnum.REFRESH_TOKEN
    })

    const accessToken = generateToken(
        { _id: user._id, email: user.email, role: user.role },
        envConfig.jwt.user.access_token_secret,
        { expiresIn: envConfig.jwt.user.access_token_expires_in , jwtid : uuidv4()}
    )

    return { accessToken }
}


 const verifyIdToken =async(token)=>{

const client = new OAuth2Client();
async function verify() {
  const ticket = await client.verifyIdToken({
      idToken: token,
      audience: envConfig.GCP.client_id
  });
  const payload = ticket.getPayload();
return payload
}
  return verify();


}

const updateOrCreateUser = async(user ,googleTokenPayload )=>{
    const {sub ,email ,given_name , family_name} = googleTokenPayload

    if (user){
        return userRepo.updateDocument(user._id,{ googleSub:sub ,email ,firstName:given_name , lastName:family_name},{new:true})
    }
   
    else{
         const hashedPassword = await hash(crypto.randomBytes(12).toString('hex'))
        return userRepo.createDocument({
            googleSub:sub,
            firstName:given_name,
            lastName:family_name,
            provider:providersEnum.GOOGLE,
            email,
            password:hashedPassword
        })
    }
}

export const googleRegister=async (token)=>{
const googleTokenPayload = await verifyIdToken(token)
if (!googleTokenPayload|| !googleTokenPayload.email_verified) throw new BadRequestException("Not Verified User Email" , null , "GOOGLE_EMAIL_NOT_VERIFIED")
    const user = await userRepo.findOneDocument({googleSub:googleTokenPayload.sub , provider:providersEnum.GOOGLE})
const handledUser = await updateOrCreateUser(user ,googleTokenPayload)
 return buildTokens(handledUser)   

}

export const googleLogin = async (idToken) => {
  const googleTokenPayload = await verifyIdToken(idToken);

  if (!googleTokenPayload || !googleTokenPayload.email_verified) {
    throw new BadRequestException( 'Not verified user email', null,'GOOGLE_EMAIL_NOT_VERIFIED',);
  }

  const user = await userRepo.findOneDocument({googleSub: googleTokenPayload.sub,provider: providersEnum.GOOGLE,});

  if (!user) {
    throw new BadRequestException('User not found',  null, 'USER_NOT_FOUND',);
  }

  return buildTokens(user);
};


export const logout = async (accessTokenData, refreshTokenData) => {
  const { exp: accessExpiration, jti: accessId } = accessTokenData;
  const { exp: refreshExpiration, jti: refreshId } = refreshTokenData;

  const accessTTL = calculateTTL(accessExpiration);
  const refreshTTL = calculateTTL(refreshExpiration);

  await Promise.all([
  set({key: `bl_${tokenTypeEnum.ACCESS_TOKEN}_${accessId}`, value: 'true',options: { EX: accessTTL }}),
    set({ key: `bl_${tokenTypeEnum.REFRESH_TOKEN}_${refreshId}`, value: 'true', options: { EX: refreshTTL }})

  ]);

  return { accessTTL, refreshTTL };
};