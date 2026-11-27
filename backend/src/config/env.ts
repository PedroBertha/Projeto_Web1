import 'dotenv/config'
import { z } from 'zod'

// Variáveis opcionais: vazio no .env equivale a não definida.
const optional = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined)

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
    // Endereço do frontend, usado nos links enviados por e-mail e no retorno
    // do login com Google.
    APP_URL: z.url({ protocol: /^https?$/ }).default('http://localhost:5173'),

    // E-mail por SMTP. Sem SMTP_HOST, as mensagens aparecem no terminal.
    SMTP_HOST: optional,
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
    SMTP_SECURE: optional.pipe(z.enum(['true', 'false']).optional()),
    SMTP_USER: optional,
    SMTP_PASS: optional,
    MAIL_FROM: optional,

    // Login com Google. Sem as duas chaves, as rotas do Google respondem 503.
    GOOGLE_CLIENT_ID: optional,
    GOOGLE_CLIENT_SECRET: optional,
    GOOGLE_REDIRECT_URI: z
      .url({ protocol: /^https?$/ })
      .default('http://localhost:3000/api/auth/google/callback'),
  })
  .refine(
    (env) => env.NODE_ENV !== 'production' || env.SESSION_SECRET.length >= 32,
    {
      path: ['SESSION_SECRET'],
      message: 'SESSION_SECRET deve ter ao menos 32 caracteres em produção.',
    },
  )
  .refine((env) => !env.SMTP_HOST || env.MAIL_FROM, {
    path: ['MAIL_FROM'],
    message: 'Defina MAIL_FROM (remetente) ao configurar SMTP_HOST.',
  })
  .refine((env) => !env.GOOGLE_CLIENT_ID === !env.GOOGLE_CLIENT_SECRET, {
    path: ['GOOGLE_CLIENT_SECRET'],
    message: 'Defina GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET juntos.',
  })

export const env = envSchema.parse(process.env)
