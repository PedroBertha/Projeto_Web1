import type { PrismaClient } from '../../generated/prisma/client.js'
import { Prisma } from '../../generated/prisma/client.js'

export interface AuthUser {
  id: number
  name: string
  username: string
  email: string
  passwordHash: string
  avatarUrl: string | null
  emailVerifiedAt: Date | null
  createdAt: Date
}

export interface NewUserData {
  name: string
  username: string
  email: string
  passwordHash: string
}

export interface NewTokenData {
  tokenHash: string
  expiresAt: Date
}

// E-mail ou username já usado por outra conta (violação de índice único).
export class DuplicateUserError extends Error {
  constructor() {
    super('E-mail ou nome de usuário já cadastrado.')
    this.name = 'DuplicateUserError'
  }
}

export interface AuthRepository {
  findUserByEmail(email: string): Promise<AuthUser | null>
  findUserByUsername(username: string): Promise<AuthUser | null>
  // Cria a conta e o token de confirmação de e-mail na mesma transação.
  createUserWithVerificationToken(
    user: NewUserData,
    token: NewTokenData,
  ): Promise<AuthUser>
  // Invalida os tokens de confirmação ainda não usados e cria um novo.
  replaceVerificationToken(userId: number, token: NewTokenData): Promise<void>
  // Consome um token válido (não usado e não expirado) e marca o e-mail como
  // confirmado. Retorna null se o token não puder ser usado.
  consumeVerificationToken(
    tokenHash: string,
    now: Date,
  ): Promise<AuthUser | null>
  recordLogin(userId: number, at: Date): Promise<void>
}

const userSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  passwordHash: true,
  avatarUrl: true,
  emailVerifiedAt: true,
  createdAt: true,
} as const

export function createPrismaAuthRepository(
  prisma: PrismaClient,
): AuthRepository {
  return {
    findUserByEmail(email) {
      return prisma.user.findUnique({ where: { email }, select: userSelect })
    },

    findUserByUsername(username) {
      return prisma.user.findUnique({
        where: { username },
        select: userSelect,
      })
    },

    async createUserWithVerificationToken(user, token) {
      try {
        return await prisma.user.create({
          data: {
            ...user,
            tokens: { create: { type: 'EMAIL_VERIFICATION', ...token } },
          },
          select: userSelect,
        })
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new DuplicateUserError()
        }

        throw error
      }
    },

    async replaceVerificationToken(userId, token) {
      await prisma.$transaction([
        prisma.userToken.updateMany({
          where: { userId, type: 'EMAIL_VERIFICATION', usedAt: null },
          data: { usedAt: new Date() },
        }),
        prisma.userToken.create({
          data: { userId, type: 'EMAIL_VERIFICATION', ...token },
        }),
      ])
    },

    consumeVerificationToken(tokenHash, now) {
      return prisma.$transaction(async (tx) => {
        // O updateMany condicional evita que o mesmo token seja usado duas
        // vezes por requisições simultâneas.
        const { count } = await tx.userToken.updateMany({
          where: {
            tokenHash,
            type: 'EMAIL_VERIFICATION',
            usedAt: null,
            expiresAt: { gt: now },
          },
          data: { usedAt: now },
        })

        if (count !== 1) return null

        const token = await tx.userToken.findUniqueOrThrow({
          where: { tokenHash },
          select: { userId: true },
        })

        await tx.userToken.updateMany({
          where: {
            userId: token.userId,
            type: 'EMAIL_VERIFICATION',
            usedAt: null,
          },
          data: { usedAt: now },
        })

        const user = await tx.user.findUniqueOrThrow({
          where: { id: token.userId },
          select: userSelect,
        })

        if (user.emailVerifiedAt) return user

        return tx.user.update({
          where: { id: token.userId },
          data: { emailVerifiedAt: now },
          select: userSelect,
        })
      })
    },

    async recordLogin(userId, at) {
      await prisma.user.update({
        where: { id: userId },
        data: { lastLoginAt: at },
      })
    },
  }
}
