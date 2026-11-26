import { AppError } from '../../errors/app-error.js'
import type { ValidatedHandler } from '../../middlewares/validation.middleware.js'
import type {
  createColumnSchema,
  deleteColumnSchema,
  listColumnsSchema,
  moveColumnSchema,
  updateColumnSchema,
} from './columns.schemas.js'

export const list: ValidatedHandler<typeof listColumnsSchema> = () => {
  throw new AppError(
    501,
    'LIST_COLUMNS_NOT_IMPLEMENTED',
    'A listagem de colunas ainda não foi implementada.',
  )
}

export const create: ValidatedHandler<typeof createColumnSchema> = () => {
  throw new AppError(
    501,
    'CREATE_COLUMN_NOT_IMPLEMENTED',
    'A criação de colunas ainda não foi implementada.',
  )
}

export const update: ValidatedHandler<typeof updateColumnSchema> = () => {
  throw new AppError(
    501,
    'UPDATE_COLUMN_NOT_IMPLEMENTED',
    'A atualização de colunas ainda não foi implementada.',
  )
}

export const move: ValidatedHandler<typeof moveColumnSchema> = () => {
  throw new AppError(
    501,
    'MOVE_COLUMN_NOT_IMPLEMENTED',
    'A reordenação de colunas ainda não foi implementada.',
  )
}

export const remove: ValidatedHandler<typeof deleteColumnSchema> = () => {
  throw new AppError(
    501,
    'DELETE_COLUMN_NOT_IMPLEMENTED',
    'A exclusão de colunas ainda não foi implementada.',
  )
}
