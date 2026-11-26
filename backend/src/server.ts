import { app } from './app.js'
import { env } from './config/env.js'
import {
  checkDatabaseConnection,
  disconnectDatabase,
} from './database/prisma.js'

try {
  await checkDatabaseConnection()
} catch (error) {
  console.error(
    'Não foi possível conectar ao PostgreSQL. Verifique DATABASE_URL e se o banco está em execução (docker compose up -d).',
  )
  console.error(error)
  process.exit(1)
}

const server = app.listen(env.PORT, () => {
  console.info(`API disponível em http://localhost:${env.PORT}`)
})

const shutdown = () => {
  server.close(() => {
    void disconnectDatabase().finally(() => process.exit(0))
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
