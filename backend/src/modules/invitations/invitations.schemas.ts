import { z } from 'zod'

// Mesmos valores dos enums ProjectRole, ProjectPermission e InvitationStatus
// do Prisma. MEMBER aparece como "MEMBRO" na interface. Não existe permissão
// de convite: só ADMIN convida.
export const projectRoleValues = ['ADMIN', 'MEMBER'] as const

export const projectPermissionValues = [
  'MANAGE_COLUMNS',
  'CREATE_TASKS',
  'EDIT_TASKS',
  'MOVE_TASKS',
  'DELETE_TASKS',
  'ASSIGN_TASKS',
  'UPLOAD_ATTACHMENTS',
] as const

export const invitationStatusValues = [
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'EXPIRED',
  'REVOKED',
] as const

// Mesmo padrão do @default de Invitation.permissions no schema.prisma.
export const defaultMemberPermissions = [
  'CREATE_TASKS',
  'EDIT_TASKS',
  'MOVE_TASKS',
  'UPLOAD_ATTACHMENTS',
] as const satisfies readonly ProjectPermission[]

const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254))

const permissionsSchema = z
  .array(z.enum(projectPermissionValues))
  .refine(
    (permissions) => new Set(permissions).size === permissions.length,
    'Não repita permissões.',
  )

// Token enviado nos links do e-mail: 32 bytes aleatórios em base64url
// (43 caracteres). O banco guarda só o SHA-256 em hexadecimal (token_hash).
const invitationTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/)

const projectParams = z.strictObject({ projectId: z.uuid() })
const invitationParams = z.strictObject({
  projectId: z.uuid(),
  invitationId: z.uuid(),
})
const tokenParams = z.strictObject({ token: invitationTokenSchema })

// ---------- Gestão pelo projeto (/api/projects/:projectId/invitations) ----------

// Por padrão lista só os pendentes; ?status= filtra outro estado.
export const listProjectInvitationsSchema = z.object({
  params: projectParams,
  query: z.strictObject({
    status: z.enum(invitationStatusValues).default('PENDING'),
  }),
})

// O convite vai para o e-mail, com links de Aceitar e Recusar. ADMIN tem todas
// as permissões, então não recebe lista; MEMBER sem lista recebe o padrão.
export const createInvitationSchema = z.object({
  params: projectParams,
  body: z
    .strictObject({
      email: emailSchema,
      role: z.enum(projectRoleValues).default('MEMBER'),
      permissions: permissionsSchema.optional(),
    })
    .refine(
      (body) => body.role === 'MEMBER' || body.permissions === undefined,
      'ADMIN já tem todas as permissões; não informe a lista.',
    )
    .transform((body) => ({
      email: body.email,
      role: body.role,
      permissions:
        body.role === 'ADMIN'
          ? []
          : (body.permissions ?? [...defaultMemberPermissions]),
    })),
})

// Cancela um convite pendente (status REVOKED); os links deixam de valer.
export const revokeInvitationSchema = z.object({ params: invitationParams })

// ---------- Resposta pelo link do e-mail (/api/invitations/:token) ----------

// Consulta pública usada pela página aberta a partir do e-mail: mostra projeto,
// quem convidou e o estado, sem alterar nada (scanners de e-mail abrem links).
export const getInvitationByTokenSchema = z.object({ params: tokenParams })

// Aceitar exige sessão de uma conta com o mesmo e-mail do convite; quem não tem
// conta cadastra-se com esse e-mail e volta a esta rota.
export const acceptInvitationSchema = z.object({
  params: tokenParams,
  body: z.strictObject({}).optional(),
})

// Recusar dispensa login: basta o token do link.
export const declineInvitationSchema = z.object({
  params: tokenParams,
  body: z.strictObject({}).optional(),
})

export type ProjectRole = (typeof projectRoleValues)[number]
export type ProjectPermission = (typeof projectPermissionValues)[number]
export type InvitationStatus = (typeof invitationStatusValues)[number]
export type ProjectInvitationsParams = z.output<
  typeof listProjectInvitationsSchema
>['params']
export type ListProjectInvitationsQuery = z.output<
  typeof listProjectInvitationsSchema
>['query']
export type InvitationParams = z.output<typeof revokeInvitationSchema>['params']
export type CreateInvitationInput = z.output<
  typeof createInvitationSchema
>['body']
export type InvitationTokenParams = z.output<
  typeof getInvitationByTokenSchema
>['params']
