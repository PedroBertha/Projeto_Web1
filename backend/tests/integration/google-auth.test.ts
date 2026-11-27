import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { buildTestApp, TEST_APP_URL } from '../helpers/test-app.js'

let ctx: ReturnType<typeof buildTestApp>

beforeEach(() => {
  ctx = buildTestApp()
})

// Faz a ida ao Google e devolve o agent (com o cookie) e o state gerado.
async function startGoogle() {
  const agent = request.agent(ctx.app)
  const response = await agent.get('/api/auth/google')
  const location = new URL(response.headers.location ?? '')

  return { agent, response, state: location.searchParams.get('state') ?? '' }
}

async function finishGoogle(params: Record<string, string> = {}) {
  const { agent, state } = await startGoogle()
  const query = new URLSearchParams({
    code: 'codigo-do-google',
    state,
    ...params,
  })
  const response = await agent.get(`/api/auth/google/callback?${query}`)

  return { agent, response }
}

const redirectError = (location: string | undefined) =>
  new URL(location ?? '').searchParams.get('erro')

describe('Ida ao Google', () => {
  it('redireciona para o Google com state aleatorio', async () => {
    const first = await startGoogle()
    const second = await startGoogle()

    expect(first.response.status).toBe(302)
    expect(first.response.headers.location).toMatch(
      /^https:\/\/accounts\.google\.test\/auth\?state=/,
    )
    expect(first.state).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(first.state).not.toBe(second.state)
    expect(first.response.headers['set-cookie']?.[0]).toMatch(/^sid=/)
  })

  it('responde 503 quando o Google nao esta configurado', async () => {
    ctx = buildTestApp({ googleEnabled: false })
    const response = await request(ctx.app).get('/api/auth/google')

    expect(response.status).toBe(503)
    expect(response.body.error.code).toBe('GOOGLE_LOGIN_NOT_CONFIGURED')
  })
})

describe('Retorno do Google', () => {
  it('cria a conta confirmada, sem senha, e abre a sessao', async () => {
    const { response } = await finishGoogle()

    expect(response.status).toBe(302)
    expect(response.headers.location).toBe(`${TEST_APP_URL}/`)
    expect(response.headers['set-cookie']?.[0]).toMatch(/^sid=.+HttpOnly/i)

    const [user] = ctx.repository.users
    expect(user).toMatchObject({
      name: 'Pedro Google',
      username: 'pedro',
      email: 'pedro@gmail.com',
      googleId: 'google-sub-1',
      passwordHash: null,
      avatarUrl: 'https://lh3.googleusercontent.com/a/foto',
    })
    expect(user?.emailVerifiedAt).toBeInstanceOf(Date)
    expect(ctx.mailer.sent).toHaveLength(0)
    expect(ctx.google.exchanges[0]?.code).toBe('codigo-do-google')
    expect(ctx.google.exchanges[0]?.codeVerifier).toMatch(/^[A-Za-z0-9_-]{43}$/)
  })

  it('entra na mesma conta nas proximas vezes', async () => {
    await finishGoogle()
    const { response } = await finishGoogle()

    expect(response.headers.location).toBe(`${TEST_APP_URL}/`)
    expect(ctx.repository.users).toHaveLength(1)
    expect(ctx.repository.logins).toHaveLength(2)
  })

  it('gera outro username quando o sugerido ja existe', async () => {
    await request(ctx.app).post('/api/auth/register').send({
      name: 'Outro Pedro',
      username: 'pedro',
      email: 'outro@example.com',
      password: 'secret-password',
    })
    await finishGoogle()

    expect(ctx.repository.users[1]?.username).toBe('pedro2')
  })

  it('vincula a conta confirmada com o mesmo e-mail e mantem a senha', async () => {
    await request(ctx.app).post('/api/auth/register').send({
      name: 'Pedro',
      username: 'pedrosenha',
      email: 'pedro@gmail.com',
      password: 'secret-password',
    })
    await request(ctx.app)
      .post('/api/auth/confirm-email')
      .send({ token: ctx.mailer.lastToken() })

    const { response } = await finishGoogle()

    expect(response.headers.location).toBe(`${TEST_APP_URL}/`)
    expect(ctx.repository.users).toHaveLength(1)
    expect(ctx.repository.users[0]?.googleId).toBe('google-sub-1')
    expect(ctx.repository.users[0]?.name).toBe('Pedro')

    const login = await request(ctx.app)
      .post('/api/auth/login')
      .send({ login: 'pedrosenha', password: 'secret-password' })
    expect(login.status).toBe(200)
    expect(login.body.user).toMatchObject({
      hasPassword: true,
      googleLinked: true,
    })
  })

  it('confirma a conta pendente e apaga a senha definida antes', async () => {
    // Alguém cadastrou o e-mail do Pedro com uma senha e não confirmou.
    await request(ctx.app).post('/api/auth/register').send({
      name: 'Intruso',
      username: 'intruso',
      email: 'pedro@gmail.com',
      password: 'senha-do-intruso',
    })
    const pendingToken = ctx.mailer.lastToken()

    await finishGoogle()

    const [user] = ctx.repository.users
    expect(user?.emailVerifiedAt).toBeInstanceOf(Date)
    expect(user?.passwordHash).toBeNull()
    expect(user?.name).toBe('Pedro Google')

    const login = await request(ctx.app)
      .post('/api/auth/login')
      .send({ login: 'pedro@gmail.com', password: 'senha-do-intruso' })
    expect(login.status).toBe(401)

    const confirm = await request(ctx.app)
      .post('/api/auth/confirm-email')
      .send({ token: pendingToken })
    expect(confirm.status).toBe(400)
  })

  it('recusa e-mail nao verificado pelo Google', async () => {
    ctx.google.profile = { ...ctx.google.profile, emailVerified: false }
    const { response } = await finishGoogle()

    expect(redirectError(response.headers.location)).toBe(
      'google_email_not_verified',
    )
    expect(ctx.repository.users).toHaveLength(0)
  })

  it('recusa e-mail ja vinculado a outra conta Google', async () => {
    await finishGoogle()
    ctx.google.profile = { ...ctx.google.profile, googleId: 'outro-sub' }
    const { response } = await finishGoogle()

    expect(redirectError(response.headers.location)).toBe(
      'google_account_conflict',
    )
  })

  it('recusa state diferente do gerado, sem chamar o Google', async () => {
    const { response } = await finishGoogle({ state: 'state-forjado' })

    expect(redirectError(response.headers.location)).toBe(
      'google_sessao_expirada',
    )
    expect(ctx.google.exchanges).toHaveLength(0)
    expect(ctx.repository.users).toHaveLength(0)
  })

  it('recusa callback sem a ida ao Google na mesma sessao', async () => {
    const response = await request(ctx.app).get(
      '/api/auth/google/callback?code=x&state=y',
    )

    expect(response.status).toBe(302)
    expect(redirectError(response.headers.location)).toBe(
      'google_sessao_expirada',
    )
  })

  it('nao aceita o mesmo state duas vezes', async () => {
    const { agent, state } = await startGoogle()
    const url = `/api/auth/google/callback?code=c&state=${state}`
    await agent.get(url)
    const replay = await agent.get(url)

    expect(redirectError(replay.headers.location)).toBe(
      'google_sessao_expirada',
    )
  })

  it('trata o cancelamento na tela do Google', async () => {
    const { agent } = await startGoogle()
    const response = await agent.get(
      '/api/auth/google/callback?error=access_denied',
    )

    expect(redirectError(response.headers.location)).toBe('google_cancelado')
  })

  it('volta para o login quando o Google falha', async () => {
    ctx.google.failWith = new Error('rede')
    const original = console.error

    console.error = () => {}

    try {
      const { response } = await finishGoogle()
      expect(redirectError(response.headers.location)).toBe('google_falhou')
    } finally {
      console.error = original
    }
  })
})
