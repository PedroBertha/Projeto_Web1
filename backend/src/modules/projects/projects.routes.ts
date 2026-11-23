import { Router } from 'express';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import * as controller from './projects.controller.js';
import {
  createProjectSchema,
  projectIdSchema,
  updateProjectSchema,
} from './projects.schemas.js';

export const projectsRouter = Router();

projectsRouter.get('/', controller.list);

projectsRouter.post(
  '/',
  validateRequest(createProjectSchema),
  controller.create,
);

projectsRouter.get(
  '/:projectId',
  validateRequest(projectIdSchema),
  controller.getById,
);

projectsRouter.patch(
  '/:projectId',
  validateRequest(updateProjectSchema),
  controller.update,
);

projectsRouter.delete(
  '/:projectId',
  validateRequest(projectIdSchema),
  controller.remove,
);
