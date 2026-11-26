import { describe, expect, it } from 'vitest'
import {
  getUserByIdSchema,
  getUserByUsernameSchema,
  updateMyProfileSchema,
} from '../../src/modules/users/users.schemas.js'

describe('Normalizacao dos contratos de usuarios', () => {
  it('normaliza nome, username e email sem preencher campos omitidos', () => {
    const input = updateMyProfileSchema.parse({
      body: {
        name: '  Pedro  ',
        username: '  Pedro.Bertha ',
        email: ' PEDRO@EXAMPLE.COM ',
      },
    })
    expect(input.body).toEqual({
      name: 'Pedro',
      username: 'pedro.bertha',
      email: 'pedro@example.com',
    })
  })

  it('mantem null para remover a foto', () => {
    const input = updateMyProfileSchema.parse({ body: { avatarUrl: null } })
    expect(input.body).toEqual({ avatarUrl: null })
  })

  it('converte o userId da URL para numero', () => {
    const input = getUserByIdSchema.parse({ params: { userId: '42' } })
    expect(input.params).toEqual({ userId: 42 })
  })

  it('normaliza o username da URL para minusculas', () => {
    const input = getUserByUsernameSchema.parse({
      params: { username: 'Pedro_B' },
    })
    expect(input.params).toEqual({ username: 'pedro_b' })
  })
})
