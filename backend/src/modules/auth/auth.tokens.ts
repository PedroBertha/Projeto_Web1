import { createHash, randomBytes } from 'node:crypto'

// Token de uso único enviado por e-mail: 32 bytes aleatórios em base64url
// (43 caracteres). O banco guarda apenas o SHA-256 em hexadecimal.
export function generateToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
