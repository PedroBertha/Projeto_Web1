import { Router } from 'express'
import { validateRequest } from '../../middlewares/validation.middleware.js'
import * as controller from './columns.controller.js'
import {
  createColumnSchema,
  deleteColumnSchema,
  listColumnsSchema,
  moveColumnSchema,
  updateColumnSchema,
} from './columns.schemas.js'

// Montado em /api/projects/:projectId/columns. mergeParams expõe o projectId.
export const columnsRouter = Router({ mergeParams: true })

columnsRouter.get('/', validateRequest(listColumnsSchema), controller.list)

columnsRouter.post('/', validateRequest(createColumnSchema), controller.create)

columnsRouter.patch(
  '/:columnId',
  validateRequest(updateColumnSchema),
  controller.update,
)

columnsRouter.patch(
  '/:columnId/position',
  validateRequest(moveColumnSchema),
  controller.move,
)

columnsRouter.delete(
  '/:columnId',
  validateRequest(deleteColumnSchema),
  controller.remove,
)
