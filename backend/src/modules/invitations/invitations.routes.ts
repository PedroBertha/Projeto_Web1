import { Router } from 'express'
import { validateRequest } from '../../middlewares/validation.middleware.js'
import * as controller from './invitations.controller.js'
import {
  acceptInvitationSchema,
  createInvitationSchema,
  declineInvitationSchema,
  getInvitationByTokenSchema,
  listProjectInvitationsSchema,
  revokeInvitationSchema,
} from './invitations.schemas.js'

// Montado em /api/projects/:projectId/invitations. mergeParams expõe o
// projectId. Só quem pode convidar (ADMIN) usa estas rotas.
export const projectInvitationsRouter = Router({ mergeParams: true })

projectInvitationsRouter.get(
  '/',
  validateRequest(listProjectInvitationsSchema),
  controller.listByProject,
)

projectInvitationsRouter.post(
  '/',
  validateRequest(createInvitationSchema),
  controller.create,
)

projectInvitationsRouter.delete(
  '/:invitationId',
  validateRequest(revokeInvitationSchema),
  controller.revoke,
)

// Montado em /api/invitations. Rotas dos links Aceitar e Recusar do e-mail,
// identificadas pelo token. Os convites recebidos pelo usuário logado são
// listados em GET /api/users/me/invitations.
export const invitationsRouter = Router()

invitationsRouter.get(
  '/:token',
  validateRequest(getInvitationByTokenSchema),
  controller.getByToken,
)

invitationsRouter.post(
  '/:token/accept',
  validateRequest(acceptInvitationSchema),
  controller.accept,
)

invitationsRouter.post(
  '/:token/decline',
  validateRequest(declineInvitationSchema),
  controller.decline,
)
