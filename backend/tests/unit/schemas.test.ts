import { describe, expect, it } from 'vitest';
import {
  loginSchema,
  registerSchema,
} from '../../src/modules/auth/auth.schemas.js';
import {
  createProjectSchema,
  updateProjectSchema,
} from '../../src/modules/projects/projects.schemas.js';

describe('Normalizacao dos contratos', () => {
  it('normaliza nome e email sem alterar a senha no cadastro', () => {
    const input = registerSchema.parse({
      body: {
        name: '  Pedro  ',
        email: '  PEDRO@EXAMPLE.COM  ',
        password: '  password  ',
      },
    });
    expect(input.body).toEqual({
      name: 'Pedro',
      email: 'pedro@example.com',
      password: '  password  ',
    });
  });

  it('normaliza email sem remover espacos da senha no login', () => {
    const input = loginSchema.parse({
      body: { email: ' USER@EXAMPLE.COM ', password: ' ' },
    });
    expect(input.body).toEqual({ email: 'user@example.com', password: ' ' });
  });

  it('remove espacos externos do nome sem modificar a descricao', () => {
    const input = createProjectSchema.parse({
      body: { name: ' Projeto ', description: ' Descricao ' },
    });
    expect(input.body).toEqual({ name: 'Projeto', description: ' Descricao ' });
  });

  it('preserva descricao vazia para permitir sua limpeza na atualizacao', () => {
    const input = updateProjectSchema.parse({
      params: { projectId: '550e8400-e29b-41d4-a716-446655440000' },
      body: { description: '' },
    });
    expect(input.body).toEqual({ description: '' });
  });
});
