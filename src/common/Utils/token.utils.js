import jwt from "jsonwebtoken"
import { BadRequestException, NotFoundException } from "./Errors/exception.error.js"
import UserRepository from "../../DB/Repositories/user.repository.js"
import { tokenTypeEnum } from "../constants.js"
import envConfig from "../../../config/config.js"

const userRepo = new UserRepository()

export const generateToken = (payload, secret, options) => {
    return jwt.sign(payload, secret, options)
}
export const verifyToken = (token, secret) => {
    return jwt.verify(token, secret,)
}

export const decodeToken = async ({token, tokentype}) => {
    const data = jwt.decode(token)
    if (!data.role) {
        throw new BadRequestException('Role not found in token', null, 'MISSING_ROLE')
    }


   

    let signature
    console.log("tokentype:", tokentype);
console.log("ACCESS_TOKEN:", tokenTypeEnum.ACCESS_TOKEN);
    switch (tokentype) {
        case tokenTypeEnum.ACCESS_TOKEN:
            signature = envConfig.jwt[data.role].access_token_secret
            break
        case tokenTypeEnum.REFRESH_TOKEN:
            signature =envConfig.jwt[data.role].refresh_token_secret
            break
        default:
            throw new BadRequestException('Invalid token type', null, 'INVALID_TOKEN_TYPE')
    }

    const decodedData = verifyToken(token, signature)

    const user = await userRepo.findDocumentById(decodedData._id)
    if (!user) {
        throw new NotFoundException("no user found")
    }

    return user
}