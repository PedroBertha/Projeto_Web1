import type { MailMessage, Mailer } from '../../src/mail/mailer.js'
import { createApp } from '../../src/app.js'
import { createAuthService } from '../../src/modules/auth/auth.service.js'
import { InMemoryAuthRepository } from './in-memory-auth-repository.js'

export class CapturingMailer implements Mailer {
  readonly sent: MailMessage[] = []

  async send(message: MailMessage) {
    this.sent.push(message)
  }

  // Extrai o token do link de confirmação da última mensagem enviada.
  lastToken(): string {
    const text = this.sent.at(-1)?.text ?? ''
    const match = /[?&]token=([A-Za-z0-9_-]{43})/.exec(text)

    if (!match?.[1]) throw new Error('Nenhum link de confirmação enviado.')

    return match[1]
  }
}

export const TEST_APP_URL = 'http://localhost:5173'

export function buildTestApp(options: { now?: () => Date } = {}) {
  const repository = new InMemoryAuthRepository()
  const mailer = new CapturingMailer()
  const app = createApp({
    authService: createAuthService({
      repository,
      mailer,
      appUrl: TEST_APP_URL,
      ...(options.now ? { now: options.now } : {}),
    }),
    // Sem store: sessões em memória.
    session: { secret: 'test-secret', secureCookie: false },
  })

  return { app, repository, mailer }
}

export const { app } = buildTestApp()
