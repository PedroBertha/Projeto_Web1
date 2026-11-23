import type { RequestHandler } from 'express';
import { AppError } from '../../errors/app-error.js';
import type { ValidatedHandler } from '../../middlewares/validation.middleware.js';
import type { loginSchema, registerSchema } from './auth.schemas.js';

export const register: ValidatedHandler<typeof registerSchema> = () => {
  throw new AppError(
    501,
    'REGISTER_NOT_IMPLEMENTED',
    'O cadastro ainda não foi implementado.',
  );
};

export const login: ValidatedHandler<typeof loginSchema> = () => {
  throw new AppError(
    501,
    'LOGIN_NOT_IMPLEMENTED',
    'O login ainda não foi implementado.',
  );
};

export const logout: RequestHandler = () => {
  throw new AppError(
    501,
    'LOGOUT_NOT_IMPLEMENTED',
    'O logout ainda não foi implementado.',
  );
};

export const me: RequestHandler = () => {
  throw new AppError(
    501,
    'CURRENT_USER_NOT_IMPLEMENTED',
    'A consulta do usuário autenticado ainda não foi implementada.',
  );
};
