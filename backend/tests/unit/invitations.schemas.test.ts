import { describe, expect, it } from 'vitest'
import {
  createInvitationSchema,
  defaultMemberPermissions,
  listProjectInvitationsSchema,
} from '../../src/modules/invitations/invitations.schemas.js'

const projectId = '550e8400-e29b-41d4-a716-446655440000'

describe('Normalizacao dos contratos de convites', () => {
  it('normaliza o email e aplica MEMBER com as permissoes padrao', () => {
    const input = createInvitationSchema.parse({
      params: { projectId },
      body: { email: '  ANA@Example.com ' },
    })
    expect(input.body).toEqual({
      email: 'ana@example.com',
      role: 'MEMBER',
      permissions: [...defaultMemberPermissions],
    })
  })

  it('mantem a lista vazia informada para MEMBER', () => {
    const input = createInvitationSchema.parse({
      params: { projectId },
      body: { email: 'ana@example.com', permissions: [] },
    })
    expect(input.body.permissions).toEqual([])
  })

  it('nao guarda lista de permissoes para ADMIN', () => {
    const input = createInvitationSchema.parse({
      params: { projectId },
      body: { email: 'ana@example.com', role: 'ADMIN' },
    })
    expect(input.body).toEqual({
      email: 'ana@example.com',
      role: 'ADMIN',
      permissions: [],
    })
  })

  it('lista apenas pendentes por padrao', () => {
    const input = listProjectInvitationsSchema.parse({
      params: { projectId },
      query: {},
    })
    expect(input.query).toEqual({ status: 'PENDING' })
  })
})
