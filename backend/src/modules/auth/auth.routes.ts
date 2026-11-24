import { Router } from 'express';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import * as controller from './auth.controller.js';
import { loginSchema, registerSchema } from './auth.schemas.js';

export const authRouter = Router();

authRouter.post(
  '/register',
  validateRequest(registerSchema),
  controller.register,
)

authRouter.post('/login', validateRequest(loginSchema), controller.login);
authRouter.post('/logout', controller.logout);
authRouter.get('/me', controller.me);
