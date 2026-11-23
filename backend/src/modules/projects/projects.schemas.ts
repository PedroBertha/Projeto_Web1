import { z } from 'zod';

const projectFields = {
  name: z.string().trim().min(1).max(100),
  description: z.string().max(2000),
};

const projectParams = z.strictObject({ projectId: z.uuid() });

const collaboratorSchema = z
  .array(z.number().int().positive())
  .refine(
    (ids) => new Set(ids).size === ids.length,
    'Não repita IDs na lista de colaboradores.',
  )
  .default([]);

export const projectIdSchema = z.object({ params: projectParams });

export const createProjectSchema = z.object({
  body: z.strictObject({
    name: projectFields.name,
    description: projectFields.description.optional(),
    collaborators: collaboratorSchema,
  }),
});

export const updateProjectSchema = z.object({
  params: projectParams,
  body: z
    .strictObject(projectFields)
    .partial()
    .refine(
      (body) => body.name !== undefined || body.description !== undefined,
      'Informe ao menos um campo.',
    ),
});

export type CreateProjectInput = z.output<typeof createProjectSchema>['body'];
export type UpdateProjectInput = z.output<typeof updateProjectSchema>['body'];
export type ProjectParams = z.output<typeof projectIdSchema>['params'];
