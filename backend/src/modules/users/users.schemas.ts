import { z } from 'zod'

// Mesmas regras da CHECK users_username_format_check: 3 a 30 caracteres,
// apenas letras minúsculas, números, "_" e ".". O "@" é só de exibição.
const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.string().regex(/^[a-z0-9_.]{3,30}$/))

const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254))

// Foto de perfil como endereço http(s); null remove a foto.
const avatarUrlSchema = z
  .url({ protocol: /^https?$/ })
  .max(2048)
  .nullable()

const passwordSchema = z.string().min(8).max(128)

const profileFields = {
  name: z.string().trim().min(2).max(100),
  username: usernameSchema,
  email: emailSchema,
  avatarUrl: avatarUrlSchema,
}

// Path params chegam como texto: aceita só inteiros positivos sem sinal.
const userIdParam = z
  .string()
  .regex(/^[1-9]\d*$/)
  .transform(Number)
  .pipe(z.number().int().positive().max(2_147_483_647))

// Rotas /me não recebem query string.
const emptyQuery = z.strictObject({})

export const getMyProfileSchema = z.object({ query: emptyQuery })

export const updateMyProfileSchema = z.object({
  body: z
    .strictObject(profileFields)
    .partial()
    .refine(
      (body) => Object.values(body).some((value) => value !== undefined),
      'Informe ao menos um campo.',
    ),
})

// A senha atual é exigida para trocar a senha; a nova deve ser diferente.
export const changeMyPasswordSchema = z.object({
  body: z
    .strictObject({
      currentPassword: z.string().min(1).max(128),
      newPassword: passwordSchema,
    })
    .refine(
      (body) => body.newPassword !== body.currentPassword,
      'A nova senha deve ser diferente da atual.',
    ),
})

// Excluir a conta é irreversível: o titular confirma com a senha.
export const deleteMyAccountSchema = z.object({
  body: z.strictObject({ password: z.string().min(1).max(128) }),
})

export const listMyInvitationsSchema = z.object({ query: emptyQuery })

// Perfil público de outro usuário (nome, username e foto; sem e-mail).
export const getUserByIdSchema = z.object({
  params: z.strictObject({ userId: userIdParam }),
})

export const getUserByUsernameSchema = z.object({
  params: z.strictObject({ username: usernameSchema }),
})

export type UpdateMyProfileInput = z.output<
  typeof updateMyProfileSchema
>['body']
export type ChangeMyPasswordInput = z.output<
  typeof changeMyPasswordSchema
>['body']
export type DeleteMyAccountInput = z.output<
  typeof deleteMyAccountSchema
>['body']
export type UserIdParams = z.output<typeof getUserByIdSchema>['params']
export type UsernameParams = z.output<typeof getUserByUsernameSchema>['params']
