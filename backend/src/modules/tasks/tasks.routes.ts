import { Router } from 'express'
import { validateRequest } from '../../middlewares/validation.middleware.js'
import * as controller from './tasks.controller.js'
import {
  createTaskSchema,
  deleteTaskSchema,
  getTaskSchema,
  listTasksSchema,
  moveTaskSchema,
  updateTaskSchema,
} from './tasks.schemas.js'

// Montado em /api/projects/:projectId/tasks. mergeParams expõe o projectId.
export const tasksRouter = Router({ mergeParams: true })

tasksRouter.get('/', validateRequest(listTasksSchema), controller.list)

tasksRouter.post('/', validateRequest(createTaskSchema), controller.create)

tasksRouter.get('/:taskId', validateRequest(getTaskSchema), controller.get)

tasksRouter.patch(
  '/:taskId',
  validateRequest(updateTaskSchema),
  controller.update,
)

tasksRouter.patch(
  '/:taskId/position',
  validateRequest(moveTaskSchema),
  controller.move,
)

tasksRouter.delete(
  '/:taskId',
  validateRequest(deleteTaskSchema),
  controller.remove,
)
