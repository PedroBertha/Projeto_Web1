import type { RequestHandler } from 'express';
import { AppError } from '../../errors/app-error.js';
import type { ValidatedHandler } from '../../middlewares/validation.middleware.js';
import type {
  createProjectSchema,
  projectIdSchema,
  updateProjectSchema,
} from './projects.schemas.js';

export const list: RequestHandler = () => {
  throw new AppError(
    501,
    'LIST_PROJECTS_NOT_IMPLEMENTED',
    'A listagem de projetos ainda não foi implementada.',
  );
};

export const create: ValidatedHandler<typeof createProjectSchema> = () => {
  throw new AppError(
    501,
    'CREATE_PROJECT_NOT_IMPLEMENTED',
    'A criação de projetos ainda não foi implementada.',
  );
};

export const getById: ValidatedHandler<typeof projectIdSchema> = () => {
  throw new AppError(
    501,
    'GET_PROJECT_NOT_IMPLEMENTED',
    'A consulta de projeto ainda não foi implementada.',
  );
};

export const update: ValidatedHandler<typeof updateProjectSchema> = () => {
  throw new AppError(
    501,
    'UPDATE_PROJECT_NOT_IMPLEMENTED',
    'A atualização de projetos ainda não foi implementada.',
  );
};

export const remove: ValidatedHandler<typeof projectIdSchema> = () => {
  throw new AppError(
    501,
    'DELETE_PROJECT_NOT_IMPLEMENTED',
    'A exclusão de projetos ainda não foi implementada.',
  );
};
