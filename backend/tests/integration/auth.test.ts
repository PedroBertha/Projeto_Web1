import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { hashToken } from '../../src/modules/auth/auth.tokens.js'
import { buildTestApp, TEST_APP_URL } from '../helpers/test-app.js'

const registration = {
  name: 'Pedro',
  username: 'pedro',
  email: 'pedro@example.com',
  password: 'secret-password',
}

let ctx: ReturnType<typeof buildTestApp>
let clock: Date

beforeEach(() => {
  clock = new Date('2026-11-27T12:00:00Z')
  ctx = buildTestApp({ now: () => clock })
})

const register = (body: Record<string, unknown> = registration) =>
  request(ctx.app).post('/api/auth/register').send(body)

const confirm = (token: string, agent = request(ctx.app)) =>
  agent.post('/api/auth/confirm-email').send({ token })

const login = (login: string, password = registration.password) =>
  request(ctx.app).post('/api/auth/login').send({ login, password })

describe('Cadastro', () => {
  it('cria a conta sem abrir sessao e envia o link de confirmacao', async () => {
    const response = await register({
      ...registration,
      email: ' PEDRO@Example.com ',
      username: ' Pedro ',
    })

    expect(response.status).toBe(201)
    expect(response.headers['set-cookie']).toBeUndefined()
    expect(response.body.user).toMatchObject({
      id: 1,
      name: 'Pedro',
      username: 'pedro',
      email: 'pedro@example.com',
      emailVerifiedAt: null,
    })
    expect(response.text).not.toContain('passwordHash')
    expect(response.text).not.toContain(registration.password)

    const [stored] = ctx.repository.users
    expect(stored?.passwordHash).toMatch(/^\$argon2id\$/)

    expect(ctx.mailer.sent).toHaveLength(1)
    expect(ctx.mailer.sent[0]?.to).toBe('pedro@example.com')
    expect(ctx.mailer.sent[0]?.text).toContain(
      `${TEST_APP_URL}/confirmar-email?token=`,
    )
  })

  it('guarda apenas o hash do token, com validade de 24 horas', async () => {
    await register()
    const token = ctx.mailer.lastToken()
    const [stored] = ctx.repository.tokens

    expect(stored?.tokenHash).toBe(hashToken(token))
    expect(stored?.tokenHash).not.toBe(token)
    expect(stored?.expiresAt.toISOString()).toBe('2026-11-28T12:00:00.000Z')
  })

  it('rejeita e-mail ja cadastrado', async () => {
    await register()
    const response = await register({
      ...registration,
      username: 'outro',
      email: 'PEDRO@example.com',
    })

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('EMAIL_ALREADY_REGISTERED')
    expect(ctx.repository.users).toHaveLength(1)
  })

  it('rejeita username ja usado', async () => {
    await register()
    const response = await register({
      ...registration,
      email: 'outro@example.com',
      username: 'PEDRO',
    })

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('USERNAME_ALREADY_TAKEN')
  })

  it('cria a conta mesmo se o envio do e-mail falhar', async () => {
    ctx.mailer.send = async () => {
      throw new Error('SMTP fora do ar')
    }

    const original = console.error

    console.error = () => {}

    try {
      const response = await register()
      expect(response.status).toBe(201)
    } finally {
      console.error = original
    }
  })
})

describe('Login antes da confirmacao', () => {
  it('recusa a conta nao confirmada, sem abrir sessao', async () => {
    await register()
    const response = await login(registration.email)

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('EMAIL_NOT_VERIFIED')
    expect(response.headers['set-cookie']).toBeUndefined()
  })

  it('nao revela o estado da conta quando a senha esta errada', async () => {
    await register()
    const response = await login(registration.email, 'senha-errada')

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS')
  })
})

describe('Confirmacao de e-mail', () => {
  it('confirma o e-mail e abre a sessao', async () => {
    await register()
    const response = await confirm(ctx.mailer.lastToken())

    expect(response.status).toBe(200)
    expect(response.body.user.emailVerifiedAt).toBe('2026-11-27T12:00:00.000Z')
    expect(response.headers['set-cookie']?.[0]).toMatch(/^sid=.+HttpOnly/i)
    expect(response.headers['set-cookie']?.[0]).toMatch(/SameSite=Lax/i)
  })

  it('nao aceita o mesmo token duas vezes', async () => {
    await register()
    const token = ctx.mailer.lastToken()
    await confirm(token)
    const response = await confirm(token)

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN')
    expect(response.headers['set-cookie']).toBeUndefined()
  })

  it('recusa token expirado', async () => {
    await register()
    const token = ctx.mailer.lastToken()
    clock = new Date('2026-11-28T12:00:01Z')
    const response = await confirm(token)

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN')
    expect(ctx.repository.users[0]?.emailVerifiedAt).toBeNull()
  })

  it('recusa token desconhecido', async () => {
    const response = await confirm('A'.repeat(43))
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN')
  })

  it.each([
    { label: 'corpo ausente', body: undefined },
    { label: 'token curto', body: { token: 'abc' } },
    {
      label: 'token com caracteres invalidos',
      body: { token: '!'.repeat(43) },
    },
    { label: 'campo desconhecido', body: { token: 'A'.repeat(43), x: 1 } },
  ])('valida o corpo: $label', async ({ body }) => {
    const response = await request(ctx.app)
      .post('/api/auth/confirm-email')
      .send(body)
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })
})

describe('Reenvio do link de confirmacao', () => {
  const resend = (email: string) =>
    request(ctx.app).post('/api/auth/resend-confirmation').send({ email })

  it('envia um novo link e invalida o anterior', async () => {
    await register()
    const oldToken = ctx.mailer.lastToken()
    const response = await resend('PEDRO@example.com')

    expect(response.status).toBe(202)
    expect(ctx.mailer.sent).toHaveLength(2)
    const newToken = ctx.mailer.lastToken()
    expect(newToken).not.toBe(oldToken)
    expect((await confirm(oldToken)).status).toBe(400)
    expect((await confirm(newToken)).status).toBe(200)
  })

  it('responde igual para e-mail sem conta, sem enviar nada', async () => {
    const response = await resend('ninguem@example.com')
    expect(response.status).toBe(202)
    expect(ctx.mailer.sent).toHaveLength(0)
  })

  it('nao envia link para conta ja confirmada', async () => {
    await register()
    await confirm(ctx.mailer.lastToken())
    const response = await resend(registration.email)

    expect(response.status).toBe(202)
    expect(ctx.mailer.sent).toHaveLength(1)
  })
})

describe('Login apos a confirmacao', () => {
  beforeEach(async () => {
    await register()
    await confirm(ctx.mailer.lastToken())
  })

  it.each(['pedro@example.com', ' PEDRO@EXAMPLE.COM ', 'pedro', 'Pedro'])(
    'entra com e-mail ou username: %s',
    async (identifier) => {
      const response = await login(identifier)

      expect(response.status).toBe(200)
      expect(response.body.user.username).toBe('pedro')
      expect(response.headers['set-cookie']?.[0]).toMatch(/^sid=/)
      expect(response.text).not.toContain('passwordHash')
    },
  )

  it('registra a data do ultimo login', async () => {
    await login('pedro')
    expect(ctx.repository.logins.at(-1)?.userId).toBe(1)
  })

  it('recusa senha errada', async () => {
    const response = await login('pedro', 'senha-errada')
    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS')
    expect(response.headers['set-cookie']).toBeUndefined()
  })

  it('recusa login inexistente com a mesma resposta', async () => {
    for (const identifier of ['ninguem', 'ninguem@example.com']) {
      const response = await login(identifier)
      expect(response.status).toBe(401)
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS')
    }
  })
})

describe('Logout', () => {
  it('encerra a sessao e apaga o cookie', async () => {
    await register()
    await confirm(ctx.mailer.lastToken())
    const agent = request.agent(ctx.app)
    await agent
      .post('/api/auth/login')
      .send({ login: 'pedro', password: registration.password })

    const response = await agent.post('/api/auth/logout')

    expect(response.status).toBe(204)
    expect(response.headers['set-cookie']?.[0]).toMatch(/^sid=;/)
  })

  it('responde 204 mesmo sem sessao', async () => {
    const response = await request(ctx.app).post('/api/auth/logout')
    expect(response.status).toBe(204)
  })
})
