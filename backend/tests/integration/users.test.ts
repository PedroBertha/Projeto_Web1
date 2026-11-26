import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { app } from '../../src/app.js'

type Method = 'get' | 'post' | 'patch' | 'delete'
type Body = Record<string, unknown> | unknown[]

const mePath = '/api/users/me'
const passwordPath = `${mePath}/password`
const invitationsPath = `${mePath}/invitations`

interface ContractCase {
  method: Method
  path: string
  code: string
  body?: Body
}

const contracts: ContractCase[] = [
  { method: 'get', path: mePath, code: 'GET_MY_PROFILE_NOT_IMPLEMENTED' },
  {
    method: 'patch',
    path: mePath,
    body: { name: 'Pedro' },
    code: 'UPDATE_MY_PROFILE_NOT_IMPLEMENTED',
  },
  {
    method: 'patch',
    path: passwordPath,
    body: { currentPassword: 'senha-antiga', newPassword: 'senha-nova-123' },
    code: 'CHANGE_PASSWORD_NOT_IMPLEMENTED',
  },
  {
    method: 'delete',
    path: mePath,
    body: { password: 'minha-senha' },
    code: 'DELETE_ACCOUNT_NOT_IMPLEMENTED',
  },
  {
    method: 'get',
    path: invitationsPath,
    code: 'LIST_MY_INVITATIONS_NOT_IMPLEMENTED',
  },
  { method: 'get', path: '/api/users/1', code: 'GET_USER_NOT_IMPLEMENTED' },
  {
    method: 'get',
    path: '/api/users/username/pedro.bertha',
    code: 'GET_USER_NOT_IMPLEMENTED',
  },
]

const expectValidationError = (response: request.Response) => {
  expect(response.status).toBe(400)
  expect(response.body).toEqual({
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Dados da requisição inválidos.',
    },
  })
}

describe('Contratos de usuarios', () => {
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
    },
  )

  it('nao expõe listagem geral de usuarios', async () => {
    const response = await request(app).get('/api/users')
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('ROUTE_NOT_FOUND')
  })

  it.each<{ method: Method; path: string }>([
    { method: 'post', path: '/api/users' },
    { method: 'patch', path: '/api/users/1' },
    { method: 'delete', path: '/api/users/1' },
  ])(
    'nao permite alterar a conta de outro usuario: $method $path',
    async ({ method, path }) => {
      const response = await request(app)[method](path).send({ name: 'X' })
      expect(response.status).toBe(404)
    },
  )
})

describe('Validacao de parametros de usuarios', () => {
  it.each([
    '/api/users/0',
    '/api/users/-1',
    '/api/users/01',
    '/api/users/1.5',
    '/api/users/abc',
    '/api/users/2147483648',
    '/api/users/550e8400-e29b-41d4-a716-446655440000',
    '/api/users/username/ab',
    `/api/users/username/${'a'.repeat(31)}`,
    '/api/users/username/pedro-bertha',
    '/api/users/username/%40pedro',
  ])('rejeita %s', async (path) => {
    const response = await request(app).get(path)
    expectValidationError(response)
  })

  it('aceita username em maiusculas e normaliza', async () => {
    const response = await request(app).get('/api/users/username/Pedro_B')
    expect(response.status).toBe(501)
  })

  it.each([mePath, invitationsPath])(
    'rejeita query string em %s',
    async (path) => {
      const response = await request(app).get(`${path}?userId=2`)
      expectValidationError(response)
    },
  )
})

describe('Validacao de atualizacao do perfil', () => {
  it.each<{ label: string; body?: Body }>([
    { label: 'corpo ausente' },
    { label: 'corpo vazio', body: {} },
    { label: 'corpo em array', body: [] },
    { label: 'nome curto', body: { name: ' A ' } },
    { label: 'nome longo', body: { name: 'A'.repeat(101) } },
    { label: 'username curto', body: { username: 'ab' } },
    { label: 'username com @', body: { username: '@pedro' } },
    { label: 'username com espaco', body: { username: 'pedro b' } },
    { label: 'username com hifen', body: { username: 'pedro-b' } },
    { label: 'email invalido', body: { email: 'pedro' } },
    { label: 'foto sem protocolo http', body: { avatarUrl: 'ftp://x.com/a' } },
    { label: 'foto invalida', body: { avatarUrl: 'foto.png' } },
    { label: 'senha no perfil', body: { password: 'senha-nova-123' } },
    { label: 'id no corpo', body: { id: 2, name: 'Pedro' } },
    { label: 'nome nulo', body: { name: null } },
  ])('rejeita $label', async ({ body }) => {
    const response = await request(app).patch(mePath).send(body)
    expectValidationError(response)
  })

  it.each<Body>([
    { name: 'Pedro Bertha' },
    { username: 'pedro.bertha_1' },
    { email: 'PEDRO@EXAMPLE.COM' },
    { avatarUrl: 'https://example.com/foto.png' },
    { avatarUrl: null },
    { name: 'Pedro', username: 'pedro', email: 'pedro@example.com' },
  ])('aceita atualizacao valida %o', async (body) => {
    const response = await request(app).patch(mePath).send(body)
    expect(response.status).toBe(501)
  })
})

describe('Validacao de troca de senha', () => {
  it.each<{ label: string; body?: Body }>([
    { label: 'corpo ausente' },
    { label: 'senha atual ausente', body: { newPassword: 'senha-nova-123' } },
    { label: 'nova senha ausente', body: { currentPassword: 'senha-antiga' } },
    {
      label: 'nova senha curta',
      body: { currentPassword: 'senha-antiga', newPassword: '1234567' },
    },
    {
      label: 'nova senha longa',
      body: { currentPassword: 'senha-antiga', newPassword: 'a'.repeat(129) },
    },
    {
      label: 'nova senha igual a atual',
      body: { currentPassword: 'senha-123', newPassword: 'senha-123' },
    },
    {
      label: 'campo de confirmacao extra',
      body: {
        currentPassword: 'senha-antiga',
        newPassword: 'senha-nova-123',
        confirm: 'senha-nova-123',
      },
    },
  ])('rejeita $label', async ({ body }) => {
    const response = await request(app).patch(passwordPath).send(body)
    expectValidationError(response)
  })

  it('nao devolve a senha recebida na resposta de erro', async () => {
    const response = await request(app)
      .patch(passwordPath)
      .send({ currentPassword: 'segredo-123', newPassword: 'segredo-123' })
    expect(JSON.stringify(response.body)).not.toContain('segredo-123')
  })
})

describe('Validacao de exclusao da conta', () => {
  it.each<{ label: string; body?: Body }>([
    { label: 'corpo ausente' },
    { label: 'senha vazia', body: { password: '' } },
    { label: 'senha com tipo incorreto', body: { password: 123 } },
    { label: 'campo desconhecido', body: { password: 'senha', force: true } },
  ])('rejeita $label', async ({ body }) => {
    const response = await request(app).delete(mePath).send(body)
    expectValidationError(response)
  })
})
