import type { Request, RequestHandler, Response } from 'express'
import { SESSION_COOKIE_NAME } from '../../config/session.js'
import { AppError } from '../../errors/app-error.js'
import type { ValidatedHandler } from '../../middlewares/validation.middleware.js'
import type {
  confirmEmailSchema,
  googleCallbackSchema,
  loginSchema,
  registerSchema,
  resendConfirmationSchema,
} from './auth.schemas.js'
import type { AuthService } from './auth.service.js'
import { generateToken } from './auth.tokens.js'
import {
  type GoogleOAuthClient,
  generateCodeVerifier,
} from './google.client.js'

const GOOGLE_STATE_TTL_MS = 10 * 60 * 1000

export interface AuthControllerDependencies {
  service: AuthService
  // null quando GOOGLE_CLIENT_ID/SECRET não estão configurados.
  google: GoogleOAuthClient | null
  // Endereço do frontend, destino dos redirecionamentos do login com Google.
  appUrl: string
}

// Troca o id da sessão antes de gravar o usuário (evita fixação de sessão).
async function startSession(req: Request, userId: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    req.session.regenerate((error) => (error ? reject(error) : resolve()))
  })
  req.session.userId = userId
  await saveSession(req)
}

function saveSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.save((error) => (error ? reject(error) : resolve()))
  })
}

export function createAuthController({
  service,
  google,
  appUrl,
}: AuthControllerDependencies) {
  const redirectToApp = (res: Response, path: string, error?: string) => {
    const url = new URL(path, appUrl)

    if (error) url.searchParams.set('erro', error)

    res.redirect(302, url.toString())
  }

  // Leva o navegador para a tela de escolha de conta do Google.
  const startGoogle: RequestHandler = async (req, res) => {
    if (!google) {
      throw new AppError(
        503,
        'GOOGLE_LOGIN_NOT_CONFIGURED',
        'O login com Google não está configurado neste servidor.',
      )
    }

    const state = generateToken()
    const codeVerifier = generateCodeVerifier()
    req.session.googleOAuth = { state, codeVerifier, createdAt: Date.now() }
    await saveSession(req)
    res.redirect(302, google.buildAuthorizationUrl({ state, codeVerifier }))
  }

  // O Google devolve o navegador para cá. Erros voltam para a tela de login
  // do frontend com ?erro=<código>.
  const googleCallback: ValidatedHandler<typeof googleCallbackSchema> = async (
    req,
    res,
  ) => {
    if (!google) {
      redirectToApp(res, '/login', 'google_nao_configurado')
      return
    }

    const { code, state, error } = res.locals.validated.query
    const pending = req.session.googleOAuth
    delete req.session.googleOAuth

    if (error || !code) {
      redirectToApp(res, '/login', 'google_cancelado')
      return
    }

    const valid =
      pending &&
      pending.state === state &&
      Date.now() - pending.createdAt < GOOGLE_STATE_TTL_MS

    if (!valid) {
      redirectToApp(res, '/login', 'google_sessao_expirada')
      return
    }

    try {
      const profile = await google.fetchProfile({
        code,
        codeVerifier: pending.codeVerifier,
      })
      const user = await service.loginWithGoogle(profile)
      await startSession(req, user.id)
      redirectToApp(res, '/')
    } catch (caught) {
      if (caught instanceof AppError) {
        redirectToApp(res, '/login', caught.code.toLowerCase())
        return
      }

      console.error('Falha no login com Google.', caught)
      redirectToApp(res, '/login', 'google_falhou')
    }
  }

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

  return {
    register,
    confirmEmail,
    resendConfirmation,
    login,
    logout,
    me,
    startGoogle,
    googleCallback,
  }
}
