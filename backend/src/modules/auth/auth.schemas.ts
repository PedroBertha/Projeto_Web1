import { z } from 'zod'

const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254))

// Mesmas regras da CHECK users_username_format_check: 3 a 30 caracteres,
// apenas letras minúsculas, números, "_" e ".".
const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.string().regex(/^[a-z0-9_.]{3,30}$/))

// Token dos links de e-mail: 32 bytes em base64url.
const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/)

export const registerSchema = z.object({
  body: z.strictObject({
    name: z.string().trim().min(2).max(100),
    username: usernameSchema,
    email: emailSchema,
    password: z.string().min(8).max(128),
  }),
})

// `login` aceita o e-mail ou o nome de usuário. Como o username não pode ter
// "@", a presença dele indica um e-mail.
export const loginSchema = z.object({
  body: z.strictObject({
    login: z.string().trim().toLowerCase().min(1).max(254),
    password: z.string().min(1).max(128),
  }),
})

export const confirmEmailSchema = z.object({
  body: z.strictObject({ token: tokenSchema }),
})

export const resendConfirmationSchema = z.object({
  body: z.strictObject({ email: emailSchema }),
})

export type RegisterInput = z.output<typeof registerSchema>['body']
export type LoginInput = z.output<typeof loginSchema>['body']
export type ConfirmEmailInput = z.output<typeof confirmEmailSchema>['body']
export type ResendConfirmationInput = z.output<
  typeof resendConfirmationSchema
>['body']
