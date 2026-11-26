import { AppError } from '../../errors/app-error.js'
import type { ValidatedHandler } from '../../middlewares/validation.middleware.js'
import type {
  changeMyPasswordSchema,
  deleteMyAccountSchema,
  getMyProfileSchema,
  getUserByIdSchema,
  getUserByUsernameSchema,
  listMyInvitationsSchema,
  updateMyProfileSchema,
} from './users.schemas.js'

export const getMyProfile: ValidatedHandler<typeof getMyProfileSchema> = () => {
  throw new AppError(
    501,
    'GET_MY_PROFILE_NOT_IMPLEMENTED',
    'A consulta do próprio perfil ainda não foi implementada.',
  )
}

export const updateMyProfile: ValidatedHandler<
  typeof updateMyProfileSchema
> = () => {
  throw new AppError(
    501,
    'UPDATE_MY_PROFILE_NOT_IMPLEMENTED',
    'A atualização do próprio perfil ainda não foi implementada.',
  )
}

export const changeMyPassword: ValidatedHandler<
  typeof changeMyPasswordSchema
> = () => {
  throw new AppError(
    501,
    'CHANGE_PASSWORD_NOT_IMPLEMENTED',
    'A troca de senha ainda não foi implementada.',
  )
}

export const deleteMyAccount: ValidatedHandler<
  typeof deleteMyAccountSchema
> = () => {
  throw new AppError(
    501,
    'DELETE_ACCOUNT_NOT_IMPLEMENTED',
    'A exclusão da conta ainda não foi implementada.',
  )
}

export const listMyInvitations: ValidatedHandler<
  typeof listMyInvitationsSchema
> = () => {
  throw new AppError(
    501,
    'LIST_MY_INVITATIONS_NOT_IMPLEMENTED',
    'A listagem dos convites recebidos ainda não foi implementada.',
  )
}

export const getById: ValidatedHandler<typeof getUserByIdSchema> = () => {
  throw new AppError(
    501,
    'GET_USER_NOT_IMPLEMENTED',
    'A consulta de perfil de usuário ainda não foi implementada.',
  )
}

export const getByUsername: ValidatedHandler<
  typeof getUserByUsernameSchema
> = () => {
  throw new AppError(
    501,
    'GET_USER_NOT_IMPLEMENTED',
    'A consulta de perfil de usuário ainda não foi implementada.',
  )
}
