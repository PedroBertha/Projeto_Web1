import { z } from 'zod'

// Mesmos valores do enum ColumnStatus do Prisma.
export const columnStatusValues = ['TODO', 'IN_PROGRESS', 'DONE'] as const

const columnFields = {
  name: z.string().trim().min(1).max(50),
  status: z.enum(columnStatusValues),
}

// Toda coluna pertence a um projeto: o projectId vem sempre da URL.
const projectParams = z.strictObject({ projectId: z.uuid() })
const columnParams = z.strictObject({
  projectId: z.uuid(),
  columnId: z.uuid(),
})

export const listColumnsSchema = z.object({ params: projectParams })

// A posição não é enviada: a coluna nova entra no fim do quadro.
export const createColumnSchema = z.object({
  params: projectParams,
  body: z.strictObject({
    name: columnFields.name,
    status: columnFields.status.default('TODO'),
  }),
})

export const updateColumnSchema = z.object({
  params: columnParams,
  body: z
    .strictObject(columnFields)
    .partial()
    .refine(
      (body) => body.name !== undefined || body.status !== undefined,
      'Informe ao menos um campo.',
    ),
})

// Reordenação por fractional indexing: o cliente informa a coluna que ficará
// imediatamente antes da movida (null = primeira posição). O service gera a
// nova chave entre essa coluna e a seguinte.
export const moveColumnSchema = z
  .object({
    params: columnParams,
    body: z.strictObject({ afterColumnId: z.uuid().nullable() }),
  })
  .refine(
    ({ params, body }) => body.afterColumnId !== params.columnId,
    'A coluna não pode ser posicionada depois dela mesma.',
  )

// Coluna com tarefas só pode ser excluída com um destino (?moveTo=<id>), para
// onde as tarefas são movidas. Coluna vazia dispensa o destino.
export const deleteColumnSchema = z
  .object({
    params: columnParams,
    query: z.strictObject({ moveTo: z.uuid().optional() }),
  })
  .refine(
    ({ params, query }) => query.moveTo !== params.columnId,
    'A coluna de destino deve ser diferente da coluna excluída.',
  )

export type ColumnStatus = (typeof columnStatusValues)[number]
export type ProjectColumnsParams = z.output<typeof listColumnsSchema>['params']
export type ColumnParams = z.output<typeof updateColumnSchema>['params']
export type CreateColumnInput = z.output<typeof createColumnSchema>['body']
export type UpdateColumnInput = z.output<typeof updateColumnSchema>['body']
export type MoveColumnInput = z.output<typeof moveColumnSchema>['body']
export type DeleteColumnQuery = z.output<typeof deleteColumnSchema>['query']
