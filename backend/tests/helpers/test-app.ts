import type { MailMessage, Mailer } from '../../src/mail/mailer.js'
import { createApp } from '../../src/app.js'
import { createAuthService } from '../../src/modules/auth/auth.service.js'
import type {
  GoogleOAuthClient,
  GoogleProfile,
} from '../../src/modules/auth/google.client.js'
import { InMemoryAuthRepository } from './in-memory-auth-repository.js'

// Simula o Google: o perfil devolvido no callback é definido pelo teste.
export class FakeGoogleClient implements GoogleOAuthClient {
  profile: GoogleProfile = {
    googleId: 'google-sub-1',
    email: 'pedro@gmail.com',
    emailVerified: true,
    name: 'Pedro Google',
    picture: 'https://lh3.googleusercontent.com/a/foto',
  }
  readonly exchanges: { code: string; codeVerifier: string }[] = []
  failWith: Error | null = null

  buildAuthorizationUrl({ state }: { state: string }) {
    return `https://accounts.google.test/auth?state=${state}`
  }

  async fetchProfile(params: { code: string; codeVerifier: string }) {
    this.exchanges.push(params)

    if (this.failWith) throw this.failWith

    return this.profile
  }
}

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

export function buildTestApp(
  options: { now?: () => Date; googleEnabled?: boolean } = {},
) {
  const repository = new InMemoryAuthRepository()
  const mailer = new CapturingMailer()
  const google = new FakeGoogleClient()
  const app = createApp({
    auth: {
      service: createAuthService({
        repository,
        mailer,
        appUrl: TEST_APP_URL,
        ...(options.now ? { now: options.now } : {}),
      }),
      google: options.googleEnabled === false ? null : google,
      appUrl: TEST_APP_URL,
    },
    // Sem store: sessões em memória.
    session: { secret: 'test-secret', secureCookie: false },
  })

  return { app, repository, mailer, google }
}

export const { app } = buildTestApp()
