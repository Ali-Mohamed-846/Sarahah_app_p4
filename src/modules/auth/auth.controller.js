import { Router } from "express";
import * as authService from "./auth.service.js"
import * as validators from "./auth.validation.js";
import { validation } from "../../Middlewares/validation.middleware.js";
import { BadRequestException } from "../../common/utils/Errors/exception.error.js";
const router = Router()

router.post('/register', validation(validators.signup), async (req, res) => {

  const { firstName, lastName, email, password, gender, age, phoneNumber } = req.validate.body
  const result = await authService.registerUser({ firstName, lastName, email, password, gender, age, phoneNumber })
  res.status(201).json({ message: "User registered successfully ", data: result })
})
router.post('/login', validation(validators.login), async (req, res) => {

  const { email, password } = req.validate.body
  const user = await authService.signin({ email, password })
  res.json({ message: "User logged in successfully ", token: user })
}) 

router.post('/refresh-token', async (req, res, next) => {
  const { refreshtoken } = req.headers
  if (!refreshtoken) {
    throw new BadRequestException('Refresh token is required', null, 'MISSING_REFRESH_TOKEN')
  }

  const result = await authService.refreshToken(refreshtoken)
  res.status(200).json({ message: 'Token refreshed successfully', token: result })
})

export default router