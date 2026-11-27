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
import { ConsoleMailer, type Mailer } from './mail/mailer.js'
import { SmtpMailer } from './mail/smtp-mailer.js'
import { createPrismaAuthRepository } from './modules/auth/auth.repository.js'
import { createAuthService } from './modules/auth/auth.service.js'
import { createGoogleOAuthClient } from './modules/auth/google.client.js'

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

let mailer: Mailer

if (env.SMTP_HOST && env.MAIL_FROM) {
  const smtp = new SmtpMailer({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE
      ? env.SMTP_SECURE === 'true'
      : env.SMTP_PORT === 465,
    user: env.SMTP_USER ?? '',
    pass: env.SMTP_PASS ?? '',
    from: env.MAIL_FROM,
  })
  // Só avisa: o servidor sobe mesmo com o SMTP fora do ar.
  smtp
    .verify()
    .then(() => console.info(`E-mails enviados por SMTP (${env.SMTP_HOST}).`))
    .catch((error: unknown) => {
      console.error('Não foi possível conectar ao SMTP. Verifique SMTP_*.')
      console.error(error)
    })
  mailer = smtp
} else {
  // Transporte de desenvolvimento: os e-mails aparecem neste terminal.
  mailer = new ConsoleMailer()
  console.warn(
    'SMTP_HOST não definido: os e-mails serão escritos no terminal, sem envio real.',
  )
}

const google =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? createGoogleOAuthClient({
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        redirectUri: env.GOOGLE_REDIRECT_URI,
      })
    : null

if (!google) {
  console.warn(
    'GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET não definidos: login com Google desativado.',
  )
}

const app = createApp({
  auth: {
    service: createAuthService({
      repository: createPrismaAuthRepository(prisma),
      mailer,
      appUrl: env.APP_URL,
    }),
    google,
    appUrl: env.APP_URL,
  },
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
