import { AppError } from '../../errors/app-error.js'
import type { ValidatedHandler } from '../../middlewares/validation.middleware.js'
import type {
  acceptInvitationSchema,
  createInvitationSchema,
  declineInvitationSchema,
  getInvitationByTokenSchema,
  listProjectInvitationsSchema,
  revokeInvitationSchema,
} from './invitations.schemas.js'

export const listByProject: ValidatedHandler<
  typeof listProjectInvitationsSchema
> = () => {
  throw new AppError(
    501,
    'LIST_PROJECT_INVITATIONS_NOT_IMPLEMENTED',
    'A listagem de convites do projeto ainda não foi implementada.',
  )
}

export const create: ValidatedHandler<typeof createInvitationSchema> = () => {
  throw new AppError(
    501,
    'CREATE_INVITATION_NOT_IMPLEMENTED',
    'O envio de convites ainda não foi implementado.',
  )
}

export const revoke: ValidatedHandler<typeof revokeInvitationSchema> = () => {
  throw new AppError(
    501,
    'REVOKE_INVITATION_NOT_IMPLEMENTED',
    'O cancelamento de convites ainda não foi implementado.',
  )
}

export const getByToken: ValidatedHandler<
  typeof getInvitationByTokenSchema
> = () => {
  throw new AppError(
    501,
    'GET_INVITATION_NOT_IMPLEMENTED',
    'A consulta do convite ainda não foi implementada.',
  )
}

export const accept: ValidatedHandler<typeof acceptInvitationSchema> = () => {
  throw new AppError(
    501,
    'ACCEPT_INVITATION_NOT_IMPLEMENTED',
    'O aceite de convites ainda não foi implementado.',
  )
}

export const decline: ValidatedHandler<typeof declineInvitationSchema> = () => {
  throw new AppError(
    501,
    'DECLINE_INVITATION_NOT_IMPLEMENTED',
    'A recusa de convites ainda não foi implementada.',
  )
}
