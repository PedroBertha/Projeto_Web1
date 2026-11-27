import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { app } from '../helpers/test-app.js'

type Method = 'get' | 'post' | 'patch' | 'delete'
type Body = Record<string, unknown> | unknown[]

const projectId = '550e8400-e29b-41d4-a716-446655440000'
const invitationId = '0192f1a0-7c3e-7d4b-9a1e-3f2b1c0d9e8f'
const token = 'a'.repeat(21) + '-_' + 'B9'.repeat(10)
const projectInvitationsPath = `/api/projects/${projectId}/invitations`
const tokenPath = `/api/invitations/${token}`

interface ContractCase {
  method: Method
  path: string
  code: string
  body?: Body
}

const contracts: ContractCase[] = [
  {
    method: 'get',
    path: projectInvitationsPath,
    code: 'LIST_PROJECT_INVITATIONS_NOT_IMPLEMENTED',
  },
  {
    method: 'post',
    path: projectInvitationsPath,
    body: { email: 'ana@example.com' },
    code: 'CREATE_INVITATION_NOT_IMPLEMENTED',
  },
  {
    method: 'delete',
    path: `${projectInvitationsPath}/${invitationId}`,
    code: 'REVOKE_INVITATION_NOT_IMPLEMENTED',
  },
  { method: 'get', path: tokenPath, code: 'GET_INVITATION_NOT_IMPLEMENTED' },
  {
    method: 'post',
    path: `${tokenPath}/accept`,
    code: 'ACCEPT_INVITATION_NOT_IMPLEMENTED',
  },
  {
    method: 'post',
    path: `${tokenPath}/decline`,
    code: 'DECLINE_INVITATION_NOT_IMPLEMENTED',
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

describe('Contratos de convites', () => {
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

  it.each<{ method: Method; path: string }>([
    { method: 'get', path: '/api/invitations' },
    { method: 'get', path: `${projectInvitationsPath}/${invitationId}` },
    { method: 'patch', path: `${projectInvitationsPath}/${invitationId}` },
    { method: 'get', path: `${tokenPath}/accept` },
    { method: 'get', path: `${tokenPath}/decline` },
    { method: 'delete', path: tokenPath },
  ])('nao expõe $method $path', async ({ method, path }) => {
    const response = await request(app)[method](path)
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('ROUTE_NOT_FOUND')
  })
})

describe('Validacao de parametros de convites', () => {
  it.each([
    '/api/projects/123/invitations',
    `${projectInvitationsPath}?status=pending`,
    `${projectInvitationsPath}?status=QUALQUER`,
    `${projectInvitationsPath}?email=ana@example.com`,
  ])('rejeita listagem em %s', async (path) => {
    const response = await request(app).get(path)
    expectValidationError(response)
  })

  it.each(['ACCEPTED', 'DECLINED', 'EXPIRED', 'REVOKED'])(
    'aceita filtro status=%s',
    async (status) => {
      const response = await request(app).get(
        `${projectInvitationsPath}?status=${status}`,
      )
      expect(response.status).toBe(501)
    },
  )

  it('rejeita cancelamento com invitationId invalido', async () => {
    const response = await request(app).delete(`${projectInvitationsPath}/1`)
    expectValidationError(response)
  })

  it.each([
    'curto',
    'a'.repeat(42),
    'a'.repeat(44),
    'a'.repeat(42) + '=',
    'a'.repeat(42) + '+',
    'f'.repeat(64),
  ])('rejeita token %s', async (badToken) => {
    const responses = await Promise.all([
      request(app).get(`/api/invitations/${badToken}`),
      request(app).post(`/api/invitations/${badToken}/accept`),
      request(app).post(`/api/invitations/${badToken}/decline`),
    ])
    responses.forEach(expectValidationError)
  })

  it.each(['accept', 'decline'])(
    'rejeita corpo com campos em %s',
    async (action) => {
      const response = await request(app)
        .post(`${tokenPath}/${action}`)
        .send({ email: 'outra@example.com' })
      expectValidationError(response)
    },
  )

  it.each(['accept', 'decline'])('aceita corpo vazio em %s', async (action) => {
    const response = await request(app).post(`${tokenPath}/${action}`).send({})
    expect(response.status).toBe(501)
  })
})

describe('Validacao de envio de convite', () => {
  it.each<{ label: string; body?: Body }>([
    { label: 'corpo ausente' },
    { label: 'corpo vazio', body: {} },
    { label: 'corpo em array', body: [] },
    { label: 'email invalido', body: { email: 'ana' } },
    { label: 'email longo', body: { email: `${'a'.repeat(250)}@x.com` } },
    { label: 'papel invalido', body: { email: 'ana@x.com', role: 'OWNER' } },
    {
      label: 'papel em portugues',
      body: { email: 'ana@x.com', role: 'MEMBRO' },
    },
    {
      label: 'permissao invalida',
      body: { email: 'ana@x.com', permissions: ['DELETE_PROJECT'] },
    },
    {
      label: 'permissao de convite (exclusiva de ADMIN)',
      body: { email: 'ana@x.com', permissions: ['INVITE_MEMBERS'] },
    },
    {
      label: 'permissao repetida',
      body: { email: 'ana@x.com', permissions: ['EDIT_TASKS', 'EDIT_TASKS'] },
    },
    {
      label: 'ADMIN com lista de permissoes',
      body: { email: 'ana@x.com', role: 'ADMIN', permissions: [] },
    },
    {
      label: 'id de usuario no corpo',
      body: { email: 'ana@x.com', userId: 2 },
    },
    {
      label: 'projectId no corpo',
      body: { email: 'ana@x.com', projectId },
    },
  ])('rejeita $label', async ({ body }) => {
    const response = await request(app).post(projectInvitationsPath).send(body)
    expectValidationError(response)
  })

  it.each<Body>([
    { email: 'ANA@EXAMPLE.COM' },
    { email: 'ana@example.com', role: 'ADMIN' },
    { email: 'ana@example.com', role: 'MEMBER', permissions: [] },
    {
      email: 'ana@example.com',
      permissions: ['MANAGE_COLUMNS', 'DELETE_TASKS'],
    },
  ])('aceita convite valido %o', async (body) => {
    const response = await request(app).post(projectInvitationsPath).send(body)
    expect(response.status).toBe(501)
  })
})
