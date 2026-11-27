import express, { type Express } from 'express'
import helmet from 'helmet'
import {
  createSessionMiddleware,
  type SessionOptions,
} from './config/session.js'
import { AppError } from './errors/app-error.js'
import { errorHandler } from './middlewares/error-handler.middleware.js'
import { createAuthRouter } from './modules/auth/auth.routes.js'
import type { AuthControllerDependencies } from './modules/auth/auth.controller.js'
import { columnsRouter } from './modules/columns/columns.routes.js'
import {
  invitationsRouter,
  projectInvitationsRouter,
} from './modules/invitations/invitations.routes.js'
import { projectsRouter } from './modules/projects/projects.routes.js'
import { tasksRouter } from './modules/tasks/tasks.routes.js'
import { usersRouter } from './modules/users/users.routes.js'

export interface AppDependencies {
  auth: AuthControllerDependencies
  session: SessionOptions
}

// O servidor monta as dependências reais (Prisma, PostgreSQL, e-mail); os
// testes usam versões em memória.
export function createApp(deps: AppDependencies): Express {
  const app = express()

  app.disable('x-powered-by')

  // Atrás do proxy HTTPS (Vercel), confia no X-Forwarded-Proto para o cookie
  // Secure.
  if (deps.session.secureCookie) app.set('trust proxy', 1)

  app.use(helmet())
  app.use(express.json({ limit: '100kb' }))
  app.use(createSessionMiddleware(deps.session))

  // Verifica o processo HTTP; ainda nao verifica conexao com o banco.
  app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok' })
  })

  app.use('/api/auth', createAuthRouter(deps.auth))
  app.use('/api/projects/:projectId/columns', columnsRouter)
  app.use('/api/projects/:projectId/tasks', tasksRouter)
  app.use('/api/projects/:projectId/invitations', projectInvitationsRouter)
  app.use('/api/projects', projectsRouter)
  app.use('/api/users', usersRouter)
  app.use('/api/invitations', invitationsRouter)

  app.use((_req, _res, next) => {
    next(new AppError(404, 'ROUTE_NOT_FOUND', 'Rota não encontrada.'))
  })

  app.use(errorHandler)

  return app
}
