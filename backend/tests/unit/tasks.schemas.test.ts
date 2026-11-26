import { describe, expect, it } from 'vitest'
import {
  createTaskSchema,
  listTasksSchema,
  updateTaskSchema,
} from '../../src/modules/tasks/tasks.schemas.js'

const projectId = '550e8400-e29b-41d4-a716-446655440000'
const columnId = '0192f1a0-7c3e-7d4b-9a1e-3f2b1c0d9e8f'
const taskId = '0192f1a0-7c3e-7d4b-9a1e-3f2b1c0d9e91'

describe('Normalizacao dos contratos de tarefas', () => {
  it('remove espacos externos e preenche os valores padrao na criacao', () => {
    const input = createTaskSchema.parse({
      params: { projectId },
      body: { columnId, title: '  Criar login  ' },
    })
    expect(input.body).toEqual({
      columnId,
      title: 'Criar login',
      description: '',
      priority: 'MEDIUM',
      startDate: null,
      dueDate: null,
      assigneeId: null,
    })
  })

  it('nao preenche valores padrao na edicao parcial', () => {
    const input = updateTaskSchema.parse({
      params: { projectId, taskId },
      body: { title: ' Revisar ' },
    })
    expect(input.body).toEqual({ title: 'Revisar' })
  })

  it('mantem null para remover o responsavel', () => {
    const input = updateTaskSchema.parse({
      params: { projectId, taskId },
      body: { assigneeId: null },
    })
    expect(input.body).toEqual({ assigneeId: null })
  })

  it('converte o filtro de responsavel para numero', () => {
    const input = listTasksSchema.parse({
      params: { projectId },
      query: { assigneeId: '42' },
    })
    expect(input.query).toEqual({ assigneeId: 42 })
  })
})
