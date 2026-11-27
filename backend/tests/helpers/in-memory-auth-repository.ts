import {
  type AuthRepository,
  type AuthUser,
  DuplicateUserError,
  type NewTokenData,
} from '../../src/modules/auth/auth.repository.js'

interface StoredToken extends NewTokenData {
  userId: number
  usedAt: Date | null
}

// Substitui o Prisma nos testes, com as mesmas regras de unicidade.
export class InMemoryAuthRepository implements AuthRepository {
  readonly users: AuthUser[] = []
  readonly tokens: StoredToken[] = []
  readonly logins: { userId: number; at: Date }[] = []
  private nextId = 1

  async findUserByEmail(email: string) {
    return this.users.find((user) => user.email === email) ?? null
  }

  async findUserByUsername(username: string) {
    return this.users.find((user) => user.username === username) ?? null
  }

  async createUserWithVerificationToken(
    data: Parameters<AuthRepository['createUserWithVerificationToken']>[0],
    token: NewTokenData,
  ) {
    const duplicate = this.users.some(
      (user) => user.email === data.email || user.username === data.username,
    )

    if (duplicate) throw new DuplicateUserError()

    const user: AuthUser = {
      id: this.nextId++,
      ...data,
      avatarUrl: null,
      emailVerifiedAt: null,
      createdAt: new Date(),
    }
    this.users.push(user)
    this.tokens.push({ ...token, userId: user.id, usedAt: null })

    return user
  }

  async replaceVerificationToken(userId: number, token: NewTokenData) {
    for (const stored of this.tokens) {
      if (stored.userId === userId && !stored.usedAt) stored.usedAt = new Date()
    }

    this.tokens.push({ ...token, userId, usedAt: null })
  }

  async consumeVerificationToken(tokenHash: string, now: Date) {
    const token = this.tokens.find(
      (stored) =>
        stored.tokenHash === tokenHash &&
        !stored.usedAt &&
        stored.expiresAt > now,
    )

    if (!token) return null

    for (const stored of this.tokens) {
      if (stored.userId === token.userId && !stored.usedAt) stored.usedAt = now
    }

    const user = this.users.find((candidate) => candidate.id === token.userId)

    if (!user) return null

    user.emailVerifiedAt ??= now

    return user
  }

  async recordLogin(userId: number, at: Date) {
    this.logins.push({ userId, at })
  }
}
