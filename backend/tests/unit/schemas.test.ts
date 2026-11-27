import { describe, expect, it } from 'vitest'
import {
  loginSchema,
  registerSchema,
} from '../../src/modules/auth/auth.schemas.js'
import {
  createProjectSchema,
  updateProjectSchema,
} from '../../src/modules/projects/projects.schemas.js'

describe('Normalizacao dos contratos', () => {
  it('normaliza nome e email sem alterar a senha no cadastro', () => {
    const input = registerSchema.parse({
      body: {
        name: '  Pedro  ',
        username: '  Pedro.Silva  ',
        email: '  PEDRO@EXAMPLE.COM  ',
        password: '  password  ',
      },
    })
    expect(input.body).toEqual({
      name: 'Pedro',
      username: 'pedro.silva',
      email: 'pedro@example.com',
      password: '  password  ',
    })
  })

  it('normaliza o login (email ou username) sem remover espacos da senha', () => {
    const byEmail = loginSchema.parse({
      body: { login: ' USER@EXAMPLE.COM ', password: ' ' },
    })
    expect(byEmail.body).toEqual({ login: 'user@example.com', password: ' ' })

    const byUsername = loginSchema.parse({
      body: { login: ' Pedro ', password: 'x' },
    })
    expect(byUsername.body).toEqual({ login: 'pedro', password: 'x' })
  })

  it('remove espacos externos do nome sem modificar a descricao', () => {
    const input = createProjectSchema.parse({
      body: { name: ' Projeto ', description: ' Descricao ' },
    })
    expect(input.body).toEqual({
      name: 'Projeto',
      description: ' Descricao ',
      collaborators: [],
    })
  })

  it('preserva IDs numericos dos colaboradores e sua ordem', () => {
    const input = createProjectSchema.parse({
      body: {
        name: 'Projeto',
        collaborators: [3, 1, 2],
      },
    })
    expect(input.body.collaborators).toEqual([3, 1, 2])
  })

  it('permite criar projeto sem convidados e normaliza a lista para vazia', () => {
    const input = createProjectSchema.parse({ body: { name: 'Projeto' } })
    expect(input.body.collaborators).toEqual([])
  })

  it('preserva descricao vazia para permitir sua limpeza na atualizacao', () => {
    const input = updateProjectSchema.parse({
      params: { projectId: '550e8400-e29b-41d4-a716-446655440000' },
      body: { description: '' },
    })
    expect(input.body).toEqual({ description: '' })
  })
})
