import type { Request, RequestHandler } from 'express';
import { z } from 'zod';
import { AppError } from '../errors/app-error.js';

export type ValidatedLocals<Schema extends z.ZodType> = {
  validated: z.output<Schema>;
};

export type ValidatedHandler<Schema extends z.ZodType> = RequestHandler<
  Request['params'],
  unknown,
  unknown,
  Request['query'],
  ValidatedLocals<Schema>
>;

export const validateRequest = <Schema extends z.ZodType>(
  schema: Schema,
): ValidatedHandler<Schema> => {
  return (req, res, next) => {
    const result = schema.safeParse({ body: req.body, params: req.params });

    if (!result.success) {
      // Nao expor valores recebidos nem detalhes que possam incluir senhas.
      next(
        new AppError(400, 'VALIDATION_ERROR', 'Dados da requisição inválidos.'),
      );
      return;
    }

    res.locals.validated = result.data;
    next();
  };
};
