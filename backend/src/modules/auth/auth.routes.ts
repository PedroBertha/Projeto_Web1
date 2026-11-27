import { Router } from 'express'
import { validateRequest } from '../../middlewares/validation.middleware.js'
import {
  type AuthControllerDependencies,
  createAuthController,
} from './auth.controller.js'
import {
  confirmEmailSchema,
  googleCallbackSchema,
  loginSchema,
  registerSchema,
  resendConfirmationSchema,
} from './auth.schemas.js'

export function createAuthRouter(deps: AuthControllerDependencies): Router {
  const controller = createAuthController(deps)
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

  // Cadastro e login com Google: o frontend só cria um link para
  // /api/auth/google; o callback abre a sessão e volta para o APP_URL.
  authRouter.get('/google', controller.startGoogle)
  authRouter.get(
    '/google/callback',
    validateRequest(googleCallbackSchema),
    controller.googleCallback,
  )

  return authRouter
}
