import { tokenTypeEnum } from '../../common/constants.js'
import { decodeToken } from '../../common/utils/token.utils.js'
import envConfig from '../../../config/config.js'
import UserRepository from "../../DB/Repositories/user.repository.js"
import HttpAppError from "../../common/utils/Errors/app.error.js"
import { ConflictException, NotFoundException } from "../../common/utils/Errors/exception.error.js"
import { encrypt } from "../../common/utils/Security/encryption.security.js"
import { compareTwoHashes, hash } from "../../common/utils/Security/hash.security.js"
import { generateToken } from '../../common/utils/token.utils.js'

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

export const signin = async (data)=>{
const { email , password } = data

const user = await userRepo.findUserByEmail(email)

if(!user){
  throw new NotFoundException("Invalid email or password")
}
const isPasswordMatched  = await compareTwoHashes(user.password , password)

  if(!isPasswordMatched)  throw new NotFoundException("Invalid email or password")


    
 const accessToken = generateToken(
  {_id:user._id, email:user.email,role:user.role},
    envConfig.jwt.user.access_token_secret ,
{expiresIn: envConfig.jwt.user.access_token_expires_in})



 const refreshToken = generateToken(
  {_id:user._id, email:user.email,role:user.role},
    envConfig.jwt.user.refresh_token_secret ,
{expiresIn: envConfig.jwt.user.refresh_token_expires_in})
return { accessToken, refreshToken }
}

export const refreshToken = async (userRefreshToken) => {
    const user = await decodeToken({
        token: userRefreshToken,
        tokentype: tokenTypeEnum.REFRESH_TOKEN
    })

    const accessToken = generateToken(
        { _id: user._id, email: user.email, role: user.role },
        envConfig.jwt.user.access_token_secret,
        { expiresIn: envConfig.jwt.user.access_token_expires_in }
    )

    return { accessToken }
}