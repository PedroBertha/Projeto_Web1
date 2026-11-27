import 'dotenv/config'
import { z } from 'zod'

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    DATABASE_URL: z
      .string()
      .regex(
        /^postgres(ql)?:\/\//,
        'DATABASE_URL deve ser uma URL postgresql://',
      ),
    // Vazio é aceito fora de produção: o servidor gera um segredo temporário.
    SESSION_SECRET: z.string().default(''),
    // Endereço do frontend, usado nos links enviados por e-mail.
    APP_URL: z.url({ protocol: /^https?$/ }).default('http://localhost:5173'),
  })
  .refine(
    (env) => env.NODE_ENV !== 'production' || env.SESSION_SECRET.length >= 32,
    {
      path: ['SESSION_SECRET'],
      message: 'SESSION_SECRET deve ter ao menos 32 caracteres em produção.',
    },
  )

export const env = envSchema.parse(process.env)
