import { describe, expect, it } from 'vitest'
import {
  createColumnSchema,
  deleteColumnSchema,
  updateColumnSchema,
} from '../../src/modules/columns/columns.schemas.js'

const projectId = '550e8400-e29b-41d4-a716-446655440000'
const columnId = '0192f1a0-7c3e-7d4b-9a1e-3f2b1c0d9e8f'

describe('Normalizacao dos contratos de colunas', () => {
  it('remove espacos externos do nome e usa TODO como status padrao', () => {
    const input = createColumnSchema.parse({
      params: { projectId },
      body: { name: '  Em revisão  ' },
    })
    expect(input.body).toEqual({ name: 'Em revisão', status: 'TODO' })
  })

  it('nao preenche status padrao na atualizacao parcial', () => {
    const input = updateColumnSchema.parse({
      params: { projectId, columnId },
      body: { name: ' Revisão ' },
    })
    expect(input.body).toEqual({ name: 'Revisão' })
  })

  it('permite excluir sem destino (coluna vazia)', () => {
    const input = deleteColumnSchema.parse({
      params: { projectId, columnId },
      query: {},
    })
    expect(input.query).toEqual({})
  })
})
