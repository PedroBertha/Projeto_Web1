import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { app } from '../helpers/test-app.js'

type Method = 'get' | 'post' | 'patch' | 'delete'
type Body = Record<string, unknown> | unknown[]

const projectId = '550e8400-e29b-41d4-a716-446655440000'
const columnId = '0192f1a0-7c3e-7d4b-9a1e-3f2b1c0d9e8f'
const otherColumnId = '0192f1a0-7c3e-7d4b-9a1e-3f2b1c0d9e90'
const columnsPath = `/api/projects/${projectId}/columns`
const columnPath = `${columnsPath}/${columnId}`
const positionPath = `${columnPath}/position`

interface ContractCase {
  method: Method
  path: string
  code: string
  body?: Body
}

const contracts: ContractCase[] = [
  { method: 'get', path: columnsPath, code: 'LIST_COLUMNS_NOT_IMPLEMENTED' },
  {
    method: 'post',
    path: columnsPath,
    body: { name: 'A fazer' },
    code: 'CREATE_COLUMN_NOT_IMPLEMENTED',
  },
  {
    method: 'patch',
    path: columnPath,
    body: { name: 'Revisão' },
    code: 'UPDATE_COLUMN_NOT_IMPLEMENTED',
  },
  {
    method: 'patch',
    path: positionPath,
    body: { afterColumnId: otherColumnId },
    code: 'MOVE_COLUMN_NOT_IMPLEMENTED',
  },
  { method: 'delete', path: columnPath, code: 'DELETE_COLUMN_NOT_IMPLEMENTED' },
  {
    method: 'delete',
    path: `${columnPath}?moveTo=${otherColumnId}`,
    code: 'DELETE_COLUMN_NOT_IMPLEMENTED',
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

describe('Contratos das colunas do Kanban', () => {
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

  it('nao expõe colunas fora de um projeto', async () => {
    const response = await request(app).get('/api/columns')
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('ROUTE_NOT_FOUND')
  })

  it('nao aceita PUT em uma coluna', async () => {
    const response = await request(app).put(columnPath).send({ name: 'X' })
    expect(response.status).toBe(404)
  })
})

describe('Validacao de parametros das colunas', () => {
  it.each<{ method: Method; path: string; body?: Body }>([
    { method: 'get', path: '/api/projects/not-a-uuid/columns' },
    {
      method: 'post',
      path: '/api/projects/not-a-uuid/columns',
      body: { name: 'A fazer' },
    },
    {
      method: 'patch',
      path: `/api/projects/not-a-uuid/columns/${columnId}`,
      body: { name: 'A fazer' },
    },
    {
      method: 'patch',
      path: `${columnsPath}/not-a-uuid`,
      body: { name: 'A fazer' },
    },
    {
      method: 'patch',
      path: `${columnsPath}/not-a-uuid/position`,
      body: { afterColumnId: null },
    },
    { method: 'delete', path: `${columnsPath}/not-a-uuid` },
    { method: 'delete', path: `/api/projects/not-a-uuid/columns/${columnId}` },
  ])(
    'rejeita UUID invalido em $method $path',
    async ({ method, path, body }) => {
      const response = await request(app)[method](path).send(body)
      expectValidationError(response)
    },
  )
})

describe('Validacao de criacao de coluna', () => {
  it.each<{ label: string; body?: Body }>([
    { label: 'corpo ausente' },
    { label: 'corpo em array', body: [] },
    { label: 'nome ausente', body: { status: 'TODO' } },
    { label: 'nome vazio', body: { name: '' } },
    { label: 'nome somente com espacos', body: { name: '   ' } },
    { label: 'nome longo', body: { name: 'A'.repeat(51) } },
    { label: 'nome com tipo incorreto', body: { name: 123 } },
    { label: 'status invalido', body: { name: 'Coluna', status: 'BLOCKED' } },
    {
      label: 'status em portugues',
      body: { name: 'Coluna', status: 'A_FAZER' },
    },
    { label: 'status nulo', body: { name: 'Coluna', status: null } },
    { label: 'posicao enviada', body: { name: 'Coluna', position: 'a0' } },
    { label: 'projectId no corpo', body: { name: 'Coluna', projectId } },
  ])('rejeita $label', async ({ body }) => {
    const response = await request(app).post(columnsPath).send(body)
    expectValidationError(response)
  })

  it.each([
    { name: 'A' },
    { name: 'A'.repeat(50) },
    { name: 'Coluna', status: 'TODO' },
    { name: 'Coluna', status: 'IN_PROGRESS' },
    { name: 'Coluna', status: 'DONE' },
  ])('aceita criacao valida: $name $status', async (body) => {
    const response = await request(app).post(columnsPath).send(body)
    expect(response.status).toBe(501)
  })
})

describe('Validacao de atualizacao de coluna', () => {
  it.each<{ label: string; body?: Body }>([
    { label: 'corpo ausente' },
    { label: 'corpo vazio', body: {} },
    { label: 'nome vazio', body: { name: ' ' } },
    { label: 'nome longo', body: { name: 'A'.repeat(51) } },
    { label: 'status invalido', body: { status: 'ARCHIVED' } },
    { label: 'posicao na atualizacao', body: { position: 'a1' } },
    {
      label: 'campo desconhecido junto com campo valido',
      body: { name: 'Coluna', projectId },
    },
  ])('rejeita $label', async ({ body }) => {
    const response = await request(app).patch(columnPath).send(body)
    expectValidationError(response)
  })

  it.each([
    { name: 'Revisão' },
    { status: 'DONE' },
    { name: 'Entregue', status: 'DONE' },
  ])('aceita atualizacao parcial valida', async (body) => {
    const response = await request(app).patch(columnPath).send(body)
    expect(response.status).toBe(501)
  })
})

describe('Validacao de reordenacao de coluna', () => {
  it.each<{ label: string; body?: Body }>([
    { label: 'corpo ausente' },
    { label: 'corpo vazio', body: {} },
    { label: 'UUID invalido', body: { afterColumnId: 'invalid' } },
    { label: 'a propria coluna', body: { afterColumnId: columnId } },
    { label: 'posicao bruta', body: { position: 'a0' } },
    {
      label: 'campo desconhecido',
      body: { afterColumnId: null, beforeColumnId: otherColumnId },
    },
  ])('rejeita $label', async ({ body }) => {
    const response = await request(app).patch(positionPath).send(body)
    expectValidationError(response)
  })

  it('aceita mover para a primeira posicao com null', async () => {
    const response = await request(app)
      .patch(positionPath)
      .send({ afterColumnId: null })
    expect(response.status).toBe(501)
    expect(response.body.error.code).toBe('MOVE_COLUMN_NOT_IMPLEMENTED')
  })
})

describe('Validacao de exclusao de coluna', () => {
  it.each([
    { label: 'destino invalido', query: '?moveTo=invalid' },
    { label: 'destino vazio', query: '?moveTo=' },
    { label: 'destino igual a coluna excluida', query: `?moveTo=${columnId}` },
    {
      label: 'destino repetido',
      query: `?moveTo=${otherColumnId}&moveTo=${otherColumnId}`,
    },
    { label: 'parametro desconhecido', query: '?force=true' },
  ])('rejeita $label', async ({ query }) => {
    const response = await request(app).delete(`${columnPath}${query}`)
    expectValidationError(response)
  })
})
