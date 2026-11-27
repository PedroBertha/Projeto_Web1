import { randomBytes } from 'node:crypto'
import type { RequestHandler } from 'express'
import session from 'express-session'

declare module 'express-session' {
  interface SessionData {
    userId: number
    // Dados temporários entre a ida ao Google e o retorno no callback.
    googleOAuth: { state: string; codeVerifier: string; createdAt: number }
  }
}

export const SESSION_COOKIE_NAME = 'sid'
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export interface SessionOptions {
  // Sem store, o express-session usa memória (apenas para testes).
  store?: session.Store
  secret: string
  secureCookie: boolean
}

export function createSessionMiddleware(
  options: SessionOptions,
): RequestHandler {
  return session({
    name: SESSION_COOKIE_NAME,
    secret: options.secret,
    ...(options.store ? { store: options.store } : {}),
    resave: false,
    // O cookie só é criado quando o usuário entra (login ou confirmação).
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: options.secureCookie,
      maxAge: SESSION_MAX_AGE_MS,
    },
  })
}

// Usado quando SESSION_SECRET está vazio fora de produção. As sessões deixam
// de valer a cada reinício do servidor.
export function generateDevelopmentSecret(): string {
  return randomBytes(32).toString('hex')
}
