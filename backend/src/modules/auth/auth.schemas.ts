import { z } from 'zod';

const emailSchema = z.string().trim().toLowerCase().pipe(z.email());

export const registerSchema = z.object({
  body: z.strictObject({
    name: z.string().trim().min(2).max(100),
    email: emailSchema,
    password: z.string().min(8).max(128),
  }),
});

export const loginSchema = z.object({
  body: z.strictObject({
    email: emailSchema,
    password: z.string().min(1).max(128),
  }),
});

export type RegisterInput = z.output<typeof registerSchema>['body'];
export type LoginInput = z.output<typeof loginSchema>['body'];
