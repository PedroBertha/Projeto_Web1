import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { app } from '../helpers/test-app.js'

type Method = 'get' | 'post' | 'patch' | 'delete'
type Body = Record<string, unknown> | unknown[]

const projectId = '550e8400-e29b-41d4-a716-446655440000'
const columnId = '0192f1a0-7c3e-7d4b-9a1e-3f2b1c0d9e8f'
const taskId = '0192f1a0-7c3e-7d4b-9a1e-3f2b1c0d9e91'
const otherTaskId = '0192f1a0-7c3e-7d4b-9a1e-3f2b1c0d9e92'
const tasksPath = `/api/projects/${projectId}/tasks`
const taskPath = `${tasksPath}/${taskId}`
const positionPath = `${taskPath}/position`

interface ContractCase {
  method: Method
  path: string
  code: string
  body?: Body
}

const contracts: ContractCase[] = [
  { method: 'get', path: tasksPath, code: 'LIST_TASKS_NOT_IMPLEMENTED' },
  {
    method: 'get',
    path: `${tasksPath}?columnId=${columnId}&assigneeId=7`,
    code: 'LIST_TASKS_NOT_IMPLEMENTED',
  },
  {
    method: 'post',
    path: tasksPath,
    body: { columnId, title: 'Criar tela de login' },
    code: 'CREATE_TASK_NOT_IMPLEMENTED',
  },
  { method: 'get', path: taskPath, code: 'GET_TASK_NOT_IMPLEMENTED' },
  {
    method: 'patch',
    path: taskPath,
    body: { priority: 'HIGH' },
    code: 'UPDATE_TASK_NOT_IMPLEMENTED',
  },
  {
    method: 'patch',
    path: positionPath,
    body: { columnId, afterTaskId: otherTaskId },
    code: 'MOVE_TASK_NOT_IMPLEMENTED',
  },
  { method: 'delete', path: taskPath, code: 'DELETE_TASK_NOT_IMPLEMENTED' },
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

describe('Contratos das tarefas', () => {
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

  it('nao expõe tarefas fora de um projeto', async () => {
    const response = await request(app).get(`/api/tasks/${taskId}`)
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('ROUTE_NOT_FOUND')
  })

  it('nao aceita PUT em uma tarefa', async () => {
    const response = await request(app).put(taskPath).send({ title: 'X' })
    expect(response.status).toBe(404)
  })
})

describe('Validacao de parametros das tarefas', () => {
  it.each<{ method: Method; path: string; body?: Body }>([
    { method: 'get', path: '/api/projects/not-a-uuid/tasks' },
    {
      method: 'post',
      path: '/api/projects/not-a-uuid/tasks',
      body: { columnId, title: 'Tarefa' },
    },
    { method: 'get', path: `${tasksPath}/not-a-uuid` },
    { method: 'get', path: `/api/projects/not-a-uuid/tasks/${taskId}` },
    {
      method: 'patch',
      path: `${tasksPath}/not-a-uuid`,
      body: { title: 'Tarefa' },
    },
    {
      method: 'patch',
      path: `${tasksPath}/not-a-uuid/position`,
      body: { columnId, afterTaskId: null },
    },
    { method: 'delete', path: `${tasksPath}/not-a-uuid` },
    { method: 'delete', path: `/api/projects/not-a-uuid/tasks/${taskId}` },
  ])(
    'rejeita UUID invalido em $method $path',
    async ({ method, path, body }) => {
      const response = await request(app)[method](path).send(body)
      expectValidationError(response)
    },
  )
})

describe('Validacao dos filtros da listagem', () => {
  it.each([
    { label: 'coluna invalida', query: '?columnId=invalid' },
    { label: 'coluna vazia', query: '?columnId=' },
    {
      label: 'coluna repetida',
      query: `?columnId=${columnId}&columnId=${columnId}`,
    },
    { label: 'responsavel nao numerico', query: '?assigneeId=abc' },
    { label: 'responsavel zero', query: '?assigneeId=0' },
    { label: 'responsavel negativo', query: '?assigneeId=-1' },
    { label: 'responsavel decimal', query: '?assigneeId=1.5' },
    { label: 'responsavel com zero a esquerda', query: '?assigneeId=01' },
    { label: 'responsavel fora do int', query: '?assigneeId=2147483648' },
    { label: 'parametro desconhecido', query: '?priority=HIGH' },
  ])('rejeita $label', async ({ query }) => {
    const response = await request(app).get(`${tasksPath}${query}`)
    expectValidationError(response)
  })

  it.each([`?columnId=${columnId}`, '?assigneeId=1', '?assigneeId=2147483647'])(
    'aceita filtro valido %s',
    async (query) => {
      const response = await request(app).get(`${tasksPath}${query}`)
      expect(response.status).toBe(501)
    },
  )
})

describe('Validacao de criacao de tarefa', () => {
  const valid = { columnId, title: 'Tarefa' }

  it.each<{ label: string; body?: Body }>([
    { label: 'corpo ausente' },
    { label: 'corpo em array', body: [] },
    { label: 'coluna ausente', body: { title: 'Tarefa' } },
    { label: 'coluna invalida', body: { ...valid, columnId: 'x' } },
    { label: 'titulo ausente', body: { columnId } },
    { label: 'titulo vazio', body: { ...valid, title: '' } },
    { label: 'titulo somente com espacos', body: { ...valid, title: '   ' } },
    { label: 'titulo longo', body: { ...valid, title: 'A'.repeat(201) } },
    { label: 'titulo com tipo incorreto', body: { ...valid, title: 123 } },
    {
      label: 'descricao longa',
      body: { ...valid, description: 'A'.repeat(5001) },
    },
    { label: 'descricao nula', body: { ...valid, description: null } },
    { label: 'prioridade invalida', body: { ...valid, priority: 'CRITICAL' } },
    { label: 'prioridade em minusculas', body: { ...valid, priority: 'high' } },
    { label: 'prioridade nula', body: { ...valid, priority: null } },
    {
      label: 'data com horario',
      body: { ...valid, dueDate: '2026-12-01T10:00:00Z' },
    },
    {
      label: 'data em formato brasileiro',
      body: { ...valid, dueDate: '01/12/2026' },
    },
    { label: 'data inexistente', body: { ...valid, startDate: '2026-02-30' } },
    {
      label: 'prazo antes do inicio',
      body: { ...valid, startDate: '2026-12-10', dueDate: '2026-12-01' },
    },
    { label: 'responsavel em texto', body: { ...valid, assigneeId: '7' } },
    { label: 'responsavel zero', body: { ...valid, assigneeId: 0 } },
    { label: 'responsavel decimal', body: { ...valid, assigneeId: 1.5 } },
    { label: 'posicao enviada', body: { ...valid, position: 'a0' } },
    { label: 'projectId no corpo', body: { ...valid, projectId } },
    { label: 'conclusao enviada', body: { ...valid, completedAt: null } },
  ])('rejeita $label', async ({ body }) => {
    const response = await request(app).post(tasksPath).send(body)
    expectValidationError(response)
  })

  it.each([
    valid,
    { ...valid, title: 'A'.repeat(200) },
    {
      ...valid,
      description: 'Detalhes',
      priority: 'URGENT',
      startDate: '2026-12-01',
      dueDate: '2026-12-01',
      assigneeId: 7,
    },
    { ...valid, startDate: null, dueDate: null, assigneeId: null },
    { ...valid, dueDate: '2026-12-01' },
  ])('aceita criacao valida %#', async (body) => {
    const response = await request(app).post(tasksPath).send(body)
    expect(response.status).toBe(501)
  })
})

describe('Validacao de edicao de tarefa', () => {
  it.each<{ label: string; body?: Body }>([
    { label: 'corpo ausente' },
    { label: 'corpo vazio', body: {} },
    { label: 'titulo vazio', body: { title: ' ' } },
    { label: 'titulo nulo', body: { title: null } },
    { label: 'prioridade invalida', body: { priority: 'NONE' } },
    {
      label: 'prazo antes do inicio',
      body: { startDate: '2026-12-10', dueDate: '2026-12-09' },
    },
    { label: 'troca de coluna na edicao', body: { columnId } },
    { label: 'posicao na edicao', body: { position: 'a1' } },
    {
      label: 'campo desconhecido junto com campo valido',
      body: { title: 'Tarefa', projectId },
    },
  ])('rejeita $label', async ({ body }) => {
    const response = await request(app).patch(taskPath).send(body)
    expectValidationError(response)
  })

  it.each<Body>([
    { title: 'Novo título' },
    { description: '' },
    { priority: 'LOW' },
    { startDate: '2026-12-01', dueDate: '2026-12-31' },
    { dueDate: null },
    { assigneeId: 3 },
    { assigneeId: null },
  ])('aceita edicao parcial valida %#', async (body) => {
    const response = await request(app).patch(taskPath).send(body)
    expect(response.status).toBe(501)
  })
})

describe('Validacao de movimentacao de tarefa', () => {
  it.each<{ label: string; body?: Body }>([
    { label: 'corpo ausente' },
    { label: 'corpo vazio', body: {} },
    { label: 'coluna ausente', body: { afterTaskId: null } },
    { label: 'referencia ausente', body: { columnId } },
    { label: 'coluna invalida', body: { columnId: 'x', afterTaskId: null } },
    { label: 'UUID invalido', body: { columnId, afterTaskId: 'invalid' } },
    { label: 'a propria tarefa', body: { columnId, afterTaskId: taskId } },
    { label: 'posicao bruta', body: { columnId, position: 'a0' } },
    {
      label: 'campo desconhecido',
      body: { columnId, afterTaskId: null, beforeTaskId: otherTaskId },
    },
  ])('rejeita $label', async ({ body }) => {
    const response = await request(app).patch(positionPath).send(body)
    expectValidationError(response)
  })

  it('aceita mover para o topo de uma coluna com null', async () => {
    const response = await request(app)
      .patch(positionPath)
      .send({ columnId, afterTaskId: null })
    expect(response.status).toBe(501)
    expect(response.body.error.code).toBe('MOVE_TASK_NOT_IMPLEMENTED')
  })
})
