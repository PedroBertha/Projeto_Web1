import argon2 from 'argon2'
import { AppError } from '../../errors/app-error.js'
import type { Mailer } from '../../mail/mailer.js'
import { buildConfirmationEmail } from './auth.emails.js'
import {
  type AuthRepository,
  type AuthUser,
  DuplicateUserError,
} from './auth.repository.js'
import type {
  ConfirmEmailInput,
  LoginInput,
  RegisterInput,
  ResendConfirmationInput,
} from './auth.schemas.js'
import { generateToken, hashToken } from './auth.tokens.js'
import type { GoogleProfile } from './google.client.js'
import { usernameBaseFromEmail, usernameCandidates } from './username.js'

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000

// Dados da conta que podem ser devolvidos ao próprio usuário.
export interface PublicUser {
  id: number
  name: string
  username: string
  email: string
  avatarUrl: string | null
  emailVerifiedAt: Date | null
  // Ajuda o frontend a mostrar "definir senha" e o vínculo com o Google.
  hasPassword: boolean
  googleLinked: boolean
  createdAt: Date
}

export interface AuthServiceDependencies {
  repository: AuthRepository
  mailer: Mailer
  // Endereço do frontend; o link de confirmação aponta para ele.
  appUrl: string
  now?: () => Date
}

export function toPublicUser(user: AuthUser): PublicUser {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
    emailVerifiedAt: user.emailVerifiedAt,
    hasPassword: user.passwordHash !== null,
    googleLinked: user.googleId !== null,
    createdAt: user.createdAt,
  }
}

const invalidCredentials = () =>
  new AppError(401, 'INVALID_CREDENTIALS', 'Login ou senha incorretos.')

export function createAuthService(deps: AuthServiceDependencies) {
  const now = deps.now ?? (() => new Date())
  // Hash usado quando a conta não existe, para que a resposta leve o mesmo
  // tempo e não revele quais logins estão cadastrados.
  const dummyHash = argon2.hash('senha-inexistente-para-comparacao')

  function newVerificationToken() {
    const token = generateToken()

    return {
      token,
      data: {
        tokenHash: hashToken(token),
        expiresAt: new Date(now().getTime() + VERIFICATION_TOKEN_TTL_MS),
      },
    }
  }

  async function sendConfirmation(user: AuthUser, token: string) {
    const url = new URL('/confirmar-email', deps.appUrl)
    url.searchParams.set('token', token)

    try {
      await deps.mailer.send(
        buildConfirmationEmail({
          to: user.email,
          name: user.name,
          confirmUrl: url.toString(),
        }),
      )
    } catch (error) {
      // A conta continua criada; o usuário pode pedir um novo e-mail.
      console.error('Falha ao enviar o e-mail de confirmação.', error)
    }
  }

  async function ensureAvailable(email: string, username: string) {
    if (await deps.repository.findUserByEmail(email)) {
      throw new AppError(
        409,
        'EMAIL_ALREADY_REGISTERED',
        'Já existe uma conta com este e-mail.',
      )
    }

    if (await deps.repository.findUserByUsername(username)) {
      throw new AppError(
        409,
        'USERNAME_ALREADY_TAKEN',
        'Este nome de usuário já está em uso.',
      )
    }
  }

  return {
    async register(input: RegisterInput): Promise<PublicUser> {
      await ensureAvailable(input.email, input.username)

      const passwordHash = await argon2.hash(input.password, {
        type: argon2.argon2id,
      })
      const { token, data } = newVerificationToken()
      let user: AuthUser

      try {
        user = await deps.repository.createUserWithVerificationToken(
          {
            name: input.name,
            username: input.username,
            email: input.email,
            passwordHash,
          },
          data,
        )
      } catch (error) {
        // Outro cadastro com os mesmos dados terminou entre a checagem e a
        // inserção: repete a checagem para devolver o conflito certo.
        if (error instanceof DuplicateUserError) {
          await ensureAvailable(input.email, input.username)
          throw new AppError(
            409,
            'EMAIL_ALREADY_REGISTERED',
            'Já existe uma conta com este e-mail.',
          )
        }

        throw error
      }

      await sendConfirmation(user, token)

      return toPublicUser(user)
    },

    async confirmEmail(input: ConfirmEmailInput): Promise<PublicUser> {
      const at = now()
      const user = await deps.repository.consumeVerificationToken(
        hashToken(input.token),
        at,
      )

      if (!user) {
        throw new AppError(
          400,
          'INVALID_OR_EXPIRED_TOKEN',
          'O link de confirmação é inválido ou expirou.',
        )
      }

      await deps.repository.recordLogin(user.id, at)

      return toPublicUser(user)
    },

    // Sempre termina sem erro, para não revelar quais e-mails têm conta.
    async resendConfirmation(input: ResendConfirmationInput): Promise<void> {
      const user = await deps.repository.findUserByEmail(input.email)

      if (!user || user.emailVerifiedAt) return

      const { token, data } = newVerificationToken()
      await deps.repository.replaceVerificationToken(user.id, data)
      await sendConfirmation(user, token)
    },

    async login(input: LoginInput): Promise<PublicUser> {
      const user = input.login.includes('@')
        ? await deps.repository.findUserByEmail(input.login)
        : await deps.repository.findUserByUsername(input.login)

      // Conta inexistente ou criada pelo Google sem senha.
      if (!user?.passwordHash) {
        await argon2.verify(await dummyHash, input.password)
        throw invalidCredentials()
      }

      if (!(await argon2.verify(user.passwordHash, input.password))) {
        throw invalidCredentials()
      }

      // Só depois da senha correta, para não expor o estado da conta.
      if (!user.emailVerifiedAt) {
        throw new AppError(
          403,
          'EMAIL_NOT_VERIFIED',
          'Confirme seu e-mail antes de entrar.',
        )
      }

      await deps.repository.recordLogin(user.id, now())

      return toPublicUser(user)
    },

    // Entra com a conta Google, criando ou vinculando a conta se preciso.
    async loginWithGoogle(profile: GoogleProfile): Promise<PublicUser> {
      if (!profile.emailVerified) {
        throw new AppError(
          403,
          'GOOGLE_EMAIL_NOT_VERIFIED',
          'O e-mail desta conta Google não está verificado.',
        )
      }

      const at = now()
      const user =
        (await deps.repository.findUserByGoogleId(profile.googleId)) ??
        (await linkOrCreateGoogleUser(profile, at))

      await deps.repository.recordLogin(user.id, at)

      return toPublicUser(user)
    },
  }

  async function linkOrCreateGoogleUser(
    profile: GoogleProfile,
    at: Date,
  ): Promise<AuthUser> {
    const name = googleDisplayName(profile)
    const existing = await deps.repository.findUserByEmail(profile.email)

    if (existing) {
      if (existing.googleId && existing.googleId !== profile.googleId) {
        throw new AppError(
          409,
          'GOOGLE_ACCOUNT_CONFLICT',
          'Esta conta já está vinculada a outra conta Google.',
        )
      }

      return deps.repository.linkGoogleAccount({
        userId: existing.id,
        googleId: profile.googleId,
        googleName: name,
        now: at,
      })
    }

    // Tenta "pedro", "pedro2"... Um conflito na inserção (cadastro simultâneo)
    // leva ao próximo candidato.
    for (const username of usernameCandidates(
      usernameBaseFromEmail(profile.email),
    )) {
      if (await deps.repository.findUserByUsername(username)) continue

      try {
        return await deps.repository.createGoogleUser({
          name,
          username,
          email: profile.email,
          googleId: profile.googleId,
          avatarUrl: profile.picture,
          emailVerifiedAt: at,
        })
      } catch (error) {
        if (!(error instanceof DuplicateUserError)) throw error

        // O e-mail ou o Google foram cadastrados ao mesmo tempo em outra
        // requisição: usa a conta que já existe.
        const winner =
          (await deps.repository.findUserByGoogleId(profile.googleId)) ??
          (await deps.repository.findUserByEmail(profile.email))

        if (winner) return winner
      }
    }

    throw new AppError(
      409,
      'USERNAME_UNAVAILABLE',
      'Não foi possível gerar um nome de usuário disponível.',
    )
  }
}

// Nome do perfil do Google, ajustado ao limite de 2 a 100 caracteres.
function googleDisplayName(profile: GoogleProfile): string {
  const name = (profile.name ?? '').slice(0, 100).trim()

  if (name.length >= 2) return name

  return usernameBaseFromEmail(profile.email)
}

export type AuthService = ReturnType<typeof createAuthService>
