import { Router } from 'express'
import { validateRequest } from '../../middlewares/validation.middleware.js'
import * as controller from './users.controller.js'
import {
  changeMyPasswordSchema,
  deleteMyAccountSchema,
  getMyProfileSchema,
  getUserByIdSchema,
  getUserByUsernameSchema,
  listMyInvitationsSchema,
  updateMyProfileSchema,
} from './users.schemas.js'

// Montado em /api/users. Cadastro, login e logout ficam no módulo auth, e a
// lista dos meus projetos é GET /api/projects.
export const usersRouter = Router()

// Conta do próprio usuário. Registradas antes de /:userId.
usersRouter.get(
  '/me',
  validateRequest(getMyProfileSchema),
  controller.getMyProfile,
)

usersRouter.patch(
  '/me',
  validateRequest(updateMyProfileSchema),
  controller.updateMyProfile,
)

usersRouter.patch(
  '/me/password',
  validateRequest(changeMyPasswordSchema),
  controller.changeMyPassword,
)

usersRouter.delete(
  '/me',
  validateRequest(deleteMyAccountSchema),
  controller.deleteMyAccount,
)

usersRouter.get(
  '/me/invitations',
  validateRequest(listMyInvitationsSchema),
  controller.listMyInvitations,
)

// Perfil público de outros usuários.
usersRouter.get(
  '/username/:username',
  validateRequest(getUserByUsernameSchema),
  controller.getByUsername,
)

usersRouter.get(
  '/:userId',
  validateRequest(getUserByIdSchema),
  controller.getById,
)
