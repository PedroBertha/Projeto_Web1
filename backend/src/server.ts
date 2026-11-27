import connectPgSimple from 'connect-pg-simple'
import session from 'express-session'
import pg from 'pg'
import { createApp } from './app.js'
import { env } from './config/env.js'
import { generateDevelopmentSecret } from './config/session.js'
import {
  checkDatabaseConnection,
  disconnectDatabase,
  prisma,
} from './database/prisma.js'
import { ConsoleMailer } from './mail/mailer.js'
import { createPrismaAuthRepository } from './modules/auth/auth.repository.js'
import { createAuthService } from './modules/auth/auth.service.js'

try {
  await checkDatabaseConnection()
} catch (error) {
  console.error(
    'Não foi possível conectar ao PostgreSQL. Verifique DATABASE_URL e se o banco está em execução (docker compose up -d).',
  )
  console.error(error)
  process.exit(1)
}

let sessionSecret = env.SESSION_SECRET

if (!sessionSecret) {
  sessionSecret = generateDevelopmentSecret()
  console.warn(
    'SESSION_SECRET não definido: usando um segredo temporário. As sessões serão perdidas ao reiniciar o servidor.',
  )
}

// Sessões gravadas na tabela "sessions", criada pela migração do Prisma.
const sessionPool = new pg.Pool({ connectionString: env.DATABASE_URL })
const PgStore = connectPgSimple(session)
const sessionStore = new PgStore({
  pool: sessionPool,
  tableName: 'sessions',
  createTableIfMissing: false,
})

const app = createApp({
  authService: createAuthService({
    repository: createPrismaAuthRepository(prisma),
    // Transporte de desenvolvimento: os e-mails aparecem neste terminal.
    mailer: new ConsoleMailer(),
    appUrl: env.APP_URL,
  }),
  session: {
    store: sessionStore,
    secret: sessionSecret,
    secureCookie: env.NODE_ENV === 'production',
  },
})

const server = app.listen(env.PORT, () => {
  console.info(`API disponível em http://localhost:${env.PORT}`)
})

const shutdown = () => {
  server.close(() => {
    void Promise.allSettled([disconnectDatabase(), sessionPool.end()]).finally(
      () => process.exit(0),
    )
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
