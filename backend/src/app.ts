import express from 'express'
import helmet from 'helmet'
import { AppError } from './errors/app-error.js'
import { errorHandler } from './middlewares/error-handler.middleware.js'
import { authRouter } from './modules/auth/auth.routes.js'
import { columnsRouter } from './modules/columns/columns.routes.js'
import {
  invitationsRouter,
  projectInvitationsRouter,
} from './modules/invitations/invitations.routes.js'
import { projectsRouter } from './modules/projects/projects.routes.js'
import { tasksRouter } from './modules/tasks/tasks.routes.js'
import { usersRouter } from './modules/users/users.routes.js'

export const app = express()

app.disable('x-powered-by')
app.use(helmet())
app.use(express.json({ limit: '100kb' }))

// Verifica o processo HTTP; ainda nao verifica conexao com o banco.
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok' })
})

app.use('/api/auth', authRouter)
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
