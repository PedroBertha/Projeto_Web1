import { Router } from 'express'
import { validateRequest } from '../../middlewares/validation.middleware.js'
import { createAuthController } from './auth.controller.js'
import {
  confirmEmailSchema,
  loginSchema,
  registerSchema,
  resendConfirmationSchema,
} from './auth.schemas.js'
import type { AuthService } from './auth.service.js'

export function createAuthRouter(service: AuthService): Router {
  const controller = createAuthController(service)
  const authRouter = Router()

  authRouter.post(
    '/register',
    validateRequest(registerSchema),
    controller.register,
  )

  // O link do e-mail abre uma página do frontend, que envia o token por POST
  // (leitores de e-mail podem abrir links automaticamente).
  authRouter.post(
    '/confirm-email',
    validateRequest(confirmEmailSchema),
    controller.confirmEmail,
  )

  authRouter.post(
    '/resend-confirmation',
    validateRequest(resendConfirmationSchema),
    controller.resendConfirmation,
  )

  authRouter.post('/login', validateRequest(loginSchema), controller.login)
  authRouter.post('/logout', controller.logout)
  authRouter.get('/me', controller.me)

  return authRouter
}
