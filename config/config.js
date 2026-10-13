import dotenv from "dotenv"

dotenv.config({ path: [`config/.env.${process.env.NODE_ENV}`, "config/.env"] })

const envConfig = {
    port: process.env.PORT || 3000,
    database: {
        url: process.env.DB_URL ?? 'mongodb://localhost:27017/test_db'
    },
    encryption: {
        key: process.env.ENCRYPTION_KEY,
        iV: parseInt(process.env.IV_LENGTH)

    },
    jwt: {
           user: {
            access_token_secret: process.env.USER_ACCESS_TOKEN_SECRET,
            access_token_expires_in: process.env.USER_ACCESS_TOKEN_EXPIRES_IN,
            refresh_token_secret: process.env.USER_REFRESH_TOKEN_SECRET,
            refresh_token_expires_in: process.env.USER_REFRESH_TOKEN_EXPIRES_IN,
        },

        admin: {
            access_token_secret: process.env.ADMIN_ACCESS_TOKEN_SECRET,
            access_token_expires_in: process.env.ADMIN_ACCESS_TOKEN_EXPIRES_IN,
            refresh_token_secret: process.env.ADMIN_REFRESH_TOKEN_SECRET,
            refresh_token_expires_in: process.env.ADMIN_REFRESH_TOKEN_EXPIRES_IN,
        }
    
    },
}
export default envConfig