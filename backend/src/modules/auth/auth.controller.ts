import type { Request, RequestHandler } from 'express'
import { AppError } from '../../errors/app-error.js'
import { SESSION_COOKIE_NAME } from '../../config/session.js'
import type { ValidatedHandler } from '../../middlewares/validation.middleware.js'
import type {
  confirmEmailSchema,
  loginSchema,
  registerSchema,
  resendConfirmationSchema,
} from './auth.schemas.js'
import type { AuthService } from './auth.service.js'

// Troca o id da sessão antes de gravar o usuário (evita fixação de sessão).
async function startSession(req: Request, userId: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    req.session.regenerate((error) => (error ? reject(error) : resolve()))
  })
  req.session.userId = userId
  await new Promise<void>((resolve, reject) => {
    req.session.save((error) => (error ? reject(error) : resolve()))
  })
}

export function createAuthController(service: AuthService) {
  // Cria a conta sem abrir sessão: o acesso só é liberado após confirmar o
  // e-mail.
  const register: ValidatedHandler<typeof registerSchema> = async (
    _req,
    res,
  ) => {
    const user = await service.register(res.locals.validated.body)
    res.status(201).json({
      user,
      message:
        'Conta criada. Enviamos um link para o seu e-mail; confirme-o para entrar.',
    })
  }

  // Confirma o e-mail e já deixa o usuário conectado.
  const confirmEmail: ValidatedHandler<typeof confirmEmailSchema> = async (
    req,
    res,
  ) => {
    const user = await service.confirmEmail(res.locals.validated.body)
    await startSession(req, user.id)
    res.status(200).json({ user })
  }

  const resendConfirmation: ValidatedHandler<
    typeof resendConfirmationSchema
  > = async (_req, res) => {
    await service.resendConfirmation(res.locals.validated.body)
    res.status(202).json({
      message:
        'Se houver uma conta não confirmada com este e-mail, enviaremos um novo link.',
    })
  }

  const login: ValidatedHandler<typeof loginSchema> = async (req, res) => {
    const user = await service.login(res.locals.validated.body)
    await startSession(req, user.id)
    res.status(200).json({ user })
  }

  const logout: RequestHandler = async (req, res) => {
    await new Promise<void>((resolve, reject) => {
      req.session.destroy((error) => (error ? reject(error) : resolve()))
    })
    res.clearCookie(SESSION_COOKIE_NAME)
    res.status(204).end()
  }

  const me: RequestHandler = () => {
    throw new AppError(
      501,
      'CURRENT_USER_NOT_IMPLEMENTED',
      'A consulta do usuário autenticado ainda não foi implementada.',
    )
  }

  return { register, confirmEmail, resendConfirmation, login, logout, me }
}
