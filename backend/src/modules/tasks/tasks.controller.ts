import { AppError } from '../../errors/app-error.js'
import type { ValidatedHandler } from '../../middlewares/validation.middleware.js'
import type {
  createTaskSchema,
  deleteTaskSchema,
  getTaskSchema,
  listTasksSchema,
  moveTaskSchema,
  updateTaskSchema,
} from './tasks.schemas.js'

export const list: ValidatedHandler<typeof listTasksSchema> = () => {
  throw new AppError(
    501,
    'LIST_TASKS_NOT_IMPLEMENTED',
    'A listagem de tarefas ainda não foi implementada.',
  )
}

export const create: ValidatedHandler<typeof createTaskSchema> = () => {
  throw new AppError(
    501,
    'CREATE_TASK_NOT_IMPLEMENTED',
    'A criação de tarefas ainda não foi implementada.',
  )
}

export const get: ValidatedHandler<typeof getTaskSchema> = () => {
  throw new AppError(
    501,
    'GET_TASK_NOT_IMPLEMENTED',
    'A consulta de tarefas ainda não foi implementada.',
  )
}

export const update: ValidatedHandler<typeof updateTaskSchema> = () => {
  throw new AppError(
    501,
    'UPDATE_TASK_NOT_IMPLEMENTED',
    'A atualização de tarefas ainda não foi implementada.',
  )
}

export const move: ValidatedHandler<typeof moveTaskSchema> = () => {
  throw new AppError(
    501,
    'MOVE_TASK_NOT_IMPLEMENTED',
    'A movimentação de tarefas ainda não foi implementada.',
  )
}

export const remove: ValidatedHandler<typeof deleteTaskSchema> = () => {
  throw new AppError(
    501,
    'DELETE_TASK_NOT_IMPLEMENTED',
    'A exclusão de tarefas ainda não foi implementada.',
  )
}
