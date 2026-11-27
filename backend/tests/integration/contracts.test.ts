import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { app } from '../helpers/test-app.js'

type Method = 'get' | 'post' | 'patch' | 'delete'
type Body = Record<string, unknown> | unknown[]

const projectId = '550e8400-e29b-41d4-a716-446655440000'
const projectPath = `/api/projects/${projectId}`
const registration = {
  name: 'Pedro',
  username: 'pedro',
  email: 'pedro@example.com',
  password: 'secret-password',
}
const credentials = {
  login: registration.email,
  password: registration.password,
}

interface ContractCase {
  method: Method
  path: string
  code: string
  body?: Body
}

const contracts: ContractCase[] = [
  { method: 'get', path: '/api/auth/me', code: 'CURRENT_USER_NOT_IMPLEMENTED' },
  {
    method: 'get',
    path: '/api/projects',
    code: 'LIST_PROJECTS_NOT_IMPLEMENTED',
  },
  {
    method: 'post',
    path: '/api/projects',
    body: { name: 'Projeto Web' },
    code: 'CREATE_PROJECT_NOT_IMPLEMENTED',
  },
  { method: 'get', path: projectPath, code: 'GET_PROJECT_NOT_IMPLEMENTED' },
  {
    method: 'patch',
    path: projectPath,
    body: { name: 'Novo nome' },
    code: 'UPDATE_PROJECT_NOT_IMPLEMENTED',
  },
  {
    method: 'delete',
    path: projectPath,
    code: 'DELETE_PROJECT_NOT_IMPLEMENTED',
  },
]

describe('Contratos iniciais sem persistencia ou autenticacao', () => {
  it.each(contracts)(
    '$method $path retorna $code',
    async ({ method, path, body, code }) => {
      const response = await request(app)[method](path).send(body)

      expect(response.status).toBe(501)
      expect(response.headers['content-type']).toContain('application/json')
      expect(response.body).toEqual({
        error: { code, message: expect.any(String) },
      })
      expect(response.headers['set-cookie']).toBeUndefined()
      expect(response.text).not.toContain(registration.password)
    },
  )
})

interface InvalidBodyCase {
  label: string
  body?: Body
}

const invalidRegistrations: InvalidBodyCase[] = [
  { label: 'corpo ausente' },
  { label: 'corpo em array', body: [] },
  {
    label: 'nome ausente',
    body: {
      username: 'pedro',
      email: registration.email,
      password: registration.password,
    },
  },
  { label: 'nome com tipo incorreto', body: { ...registration, name: 123 } },
  { label: 'nome curto', body: { ...registration, name: 'A' } },
  { label: 'nome somente com espacos', body: { ...registration, name: '   ' } },
  { label: 'nome longo', body: { ...registration, name: 'A'.repeat(101) } },
  {
    label: 'email ausente',
    body: { name: 'Pedro', username: 'pedro', password: 'secret-password' },
  },
  { label: 'email invalido', body: { ...registration, email: 'invalid' } },
  {
    label: 'senha ausente',
    body: { name: 'Pedro', username: 'pedro', email: registration.email },
  },
  {
    label: 'senha com tipo incorreto',
    body: { ...registration, password: 12345678 },
  },
  { label: 'senha curta', body: { ...registration, password: 'A'.repeat(7) } },
  {
    label: 'senha longa',
    body: { ...registration, password: 'A'.repeat(129) },
  },
  { label: 'campo desconhecido', body: { ...registration, role: 'ADMIN' } },
  {
    label: 'username ausente',
    body: {
      name: 'Pedro',
      email: registration.email,
      password: 'secret-password',
    },
  },
  { label: 'username curto', body: { ...registration, username: 'ab' } },
  {
    label: 'username longo',
    body: { ...registration, username: 'a'.repeat(31) },
  },
  {
    label: 'username com caracteres invalidos',
    body: { ...registration, username: 'pedro-silva' },
  },
  {
    label: 'username com arroba',
    body: { ...registration, username: '@pedro' },
  },
]

describe('Validacao de cadastro', () => {
  it.each(invalidRegistrations)(
    'rejeita $label sem expor os dados',
    async ({ body }) => {
      const response = await request(app).post('/api/auth/register').send(body)

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dados da requisição inválidos.',
        },
      })
      expect(response.text).not.toContain(registration.password)
    },
  )

  it.each([
    { name: 'Ab', username: 'abc', password: 'A'.repeat(8) },
    {
      name: 'A'.repeat(100),
      username: 'a'.repeat(30),
      password: 'A'.repeat(128),
    },
  ])(
    'aceita os limites de tamanho do cadastro',
    async ({ name, username, password }) => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ name, username, email: `${username}@example.com`, password })
      expect(response.status).toBe(201)
    },
  )
})

describe('Validacao de login', () => {
  const cases: InvalidBodyCase[] = [
    { label: 'corpo ausente' },
    { label: 'login ausente', body: { password: 'secret' } },
    { label: 'login vazio', body: { ...credentials, login: '   ' } },
    { label: 'login longo', body: { ...credentials, login: 'a'.repeat(255) } },
    {
      label: 'chave antiga email',
      body: { email: registration.email, password: 'secret' },
    },
    { label: 'senha ausente', body: { login: credentials.login } },
    { label: 'senha vazia', body: { ...credentials, password: '' } },
    {
      label: 'senha longa',
      body: { ...credentials, password: 'A'.repeat(129) },
    },
    { label: 'campo desconhecido', body: { ...credentials, remember: true } },
  ]

  it.each(cases)('rejeita $label', async ({ body }) => {
    const response = await request(app).post('/api/auth/login').send(body)
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })

  it.each(['A', 'A'.repeat(128), ' '])(
    'aceita senha nao vazia sem aplicar a regra de cadastro',
    async (password) => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ ...credentials, password })
      expect(response.status).toBe(401)
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS')
    },
  )
})

describe('Validacao de projetos', () => {
  const cases: InvalidBodyCase[] = [
    { label: 'corpo ausente' },
    { label: 'nome ausente', body: { description: 'Descricao' } },
    { label: 'nome vazio', body: { name: '' } },
    { label: 'nome somente com espacos', body: { name: '   ' } },
    { label: 'nome longo', body: { name: 'A'.repeat(101) } },
    { label: 'nome com tipo incorreto', body: { name: 123 } },
    {
      label: 'descricao longa',
      body: { name: 'Projeto', description: 'A'.repeat(2001) },
    },
    { label: 'descricao nula', body: { name: 'Projeto', description: null } },
    {
      label: 'campo desconhecido',
      body: { name: 'Projeto', ownerId: projectId },
    },
  ]

  it.each(cases)('rejeita criacao com $label', async ({ body }) => {
    const response = await request(app).post('/api/projects').send(body)
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })

  it.each([
    { name: 'A' },
    { name: 'A'.repeat(100), description: 'A'.repeat(2000) },
    { name: 'Projeto', description: '' },
  ])('aceita criacao nos limites do contrato', async (body) => {
    const response = await request(app).post('/api/projects').send(body)
    expect(response.status).toBe(501)
  })

  it.each([
    { collaborators: [] },
    { collaborators: [1] },
    {
      collaborators: [1, 2, 3],
    },
  ])(
    'aceita criacao com IDs de colaboradores validos: $collaborators',
    async ({ collaborators }) => {
      const response = await request(app)
        .post('/api/projects')
        .send({ name: 'Projeto', collaborators })
      expect(response.status).toBe(501)
      expect(response.body.error.code).toBe('CREATE_PROJECT_NOT_IMPLEMENTED')
      expect(response.headers['set-cookie']).toBeUndefined()
    },
  )

  it.each([
    { label: 'lista nula', collaborators: null },
    { label: 'numero em vez de lista', collaborators: 1 },
    {
      label: 'objeto em vez de lista',
      collaborators: { id: 1 },
    },
    { label: 'ID invalido', collaborators: ['invalid'] },
    { label: 'ID vazio', collaborators: [' '] },
    { label: 'email em vez de ID', collaborators: ['ana@example.com'] },
    { label: 'ID como string', collaborators: ['1'] },
    { label: 'UUID em vez de numero', collaborators: [projectId] },
    { label: 'ID zero', collaborators: [0] },
    { label: 'ID negativo', collaborators: [-1] },
    { label: 'ID fracionario', collaborators: [1.5] },
    { label: 'item nulo', collaborators: [null] },
    { label: 'item booleano', collaborators: [true] },
    {
      label: 'ID fora da precisao segura',
      collaborators: [Number.MAX_SAFE_INTEGER + 1],
    },
    {
      label: 'IDs duplicados',
      collaborators: [1, 1],
    },
  ])('rejeita colaboradores com $label', async ({ collaborators }) => {
    const response = await request(app)
      .post('/api/projects')
      .send({ name: 'Projeto', collaborators })
    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dados da requisição inválidos.',
      },
    })
  })

  it('rejeita a antiga chave inviteeEmails', async () => {
    const response = await request(app)
      .post('/api/projects')
      .send({
        name: 'Projeto',
        inviteeEmails: ['ana@example.com'],
      })
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })

  const invalidUpdates: InvalidBodyCase[] = [
    { label: 'corpo ausente' },
    { label: 'corpo vazio', body: {} },
    {
      label: 'convites na atualizacao de dados',
      body: { name: 'Projeto', collaborators: [1] },
    },
    { label: 'nome vazio', body: { name: ' ' } },
    { label: 'nome longo', body: { name: 'A'.repeat(101) } },
    { label: 'descricao longa', body: { description: 'A'.repeat(2001) } },
    { label: 'descricao nula', body: { description: null } },
    { label: 'campo desconhecido isolado', body: { ownerId: projectId } },
    {
      label: 'campo desconhecido junto com campo valido',
      body: { name: 'Projeto', ownerId: projectId },
    },
  ]

  it.each(invalidUpdates)(
    'rejeita atualizacao com $label',
    async ({ body }) => {
      const response = await request(app).patch(projectPath).send(body)
      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    },
  )

  it.each([
    { name: 'A' },
    { description: '' },
    { description: 'A'.repeat(2000) },
    { name: 'A'.repeat(100), description: 'Descricao' },
  ])('aceita atualizacao parcial valida', async (body) => {
    const response = await request(app).patch(projectPath).send(body)
    expect(response.status).toBe(501)
  })

  it.each<Method>(['get', 'patch', 'delete'])(
    'rejeita UUID invalido em %s',
    async (method) => {
      const response = await request(app)
        [method]('/api/projects/not-a-uuid')
        .send({ name: 'Projeto' })
      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    },
  )
})

describe('Compatibilidade com a base HTTP', () => {
  it('preserva o tratamento de JSON malformado em uma rota registrada', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send('{')
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('INVALID_JSON')
  })

  it('nao transforma caminhos desconhecidos em contratos existentes', async () => {
    const response = await request(app).get(`${projectPath}/members`)
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('ROUTE_NOT_FOUND')
  })
})
