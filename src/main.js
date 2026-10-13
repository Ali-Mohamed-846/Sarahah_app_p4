import express from "express"
import envConfig from "../config/config.js";
import dbConnection from "./DB/connection.js"
import routerAuth from "./modules/auth/auth.controller.js"
import routerUsers from "./modules/users/users.controller.js"
import routerMessage from "./modules/message/message.controller.js"
import { globalErrorHandler } from "./Middlewares/global-error-handler.middleware.js";

const app = express()
dbConnection()
app.use(express.json())

app.use('/api/auth/',routerAuth)
app.use('/api/users/',routerUsers)
app.use(routerMessage)


app.all("{/*dummy}", (req, res) => {
    return res.status(404).json({ message: "Invaild routing" })
})

app.use(globalErrorHandler) 
app.listen(envConfig.port, () => {
    console.log("server is running on", envConfig.port)
})

