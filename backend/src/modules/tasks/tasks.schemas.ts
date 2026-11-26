import { z } from 'zod'

// Mesmos valores do enum TaskPriority do Prisma.
export const taskPriorityValues = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const

// Datas sem horário (coluna DATE no banco), no formato AAAA-MM-DD.
const dateField = z.iso.date().nullable()

const taskFields = {
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000),
  priority: z.enum(taskPriorityValues),
  startDate: dateField,
  dueDate: dateField,
  // Id do usuário responsável; null = sem responsável. O service confere se
  // ele é membro do projeto (a FK composta também garante isso no banco).
  assigneeId: z.number().int().positive().nullable(),
}

// Datas no formato AAAA-MM-DD podem ser comparadas como texto.
const hasValidDateRange = (body: {
  startDate?: string | null | undefined
  dueDate?: string | null | undefined
}) => !body.startDate || !body.dueDate || body.dueDate >= body.startDate

const dateRangeMessage = 'O prazo não pode ser anterior à data de início.'

// Toda tarefa pertence a um projeto: o projectId vem sempre da URL.
const projectParams = z.strictObject({ projectId: z.uuid() })
const taskParams = z.strictObject({
  projectId: z.uuid(),
  taskId: z.uuid(),
})

// Query string chega como texto: aceita só inteiros positivos sem sinal.
const userIdQuery = z
  .string()
  .regex(/^[1-9]\d*$/)
  .transform(Number)
  .pipe(z.number().int().positive().max(2_147_483_647))

// Filtros opcionais do quadro: por coluna e/ou por responsável.
export const listTasksSchema = z.object({
  params: projectParams,
  query: z.strictObject({
    columnId: z.uuid().optional(),
    assigneeId: userIdQuery.optional(),
  }),
})

// A posição não é enviada: a tarefa nova entra no fim da coluna.
export const createTaskSchema = z.object({
  params: projectParams,
  body: z
    .strictObject({
      columnId: z.uuid(),
      title: taskFields.title,
      description: taskFields.description.default(''),
      priority: taskFields.priority.default('MEDIUM'),
      startDate: taskFields.startDate.default(null),
      dueDate: taskFields.dueDate.default(null),
      assigneeId: taskFields.assigneeId.default(null),
    })
    .refine(hasValidDateRange, dateRangeMessage),
})

export const getTaskSchema = z.object({ params: taskParams })

// A coluna e a posição mudam só pela rota de movimentação. Se apenas uma das
// datas for enviada, o service compara com a data já salva.
export const updateTaskSchema = z.object({
  params: taskParams,
  body: z
    .strictObject(taskFields)
    .partial()
    .refine(
      (body) => Object.values(body).some((value) => value !== undefined),
      'Informe ao menos um campo.',
    )
    .refine(hasValidDateRange, dateRangeMessage),
})

// Movimentação por fractional indexing, na mesma coluna ou para outra: o
// cliente informa a coluna de destino e a tarefa que ficará imediatamente
// antes da movida (null = topo da coluna). O service gera a nova chave entre
// essa tarefa e a seguinte.
export const moveTaskSchema = z
  .object({
    params: taskParams,
    body: z.strictObject({
      columnId: z.uuid(),
      afterTaskId: z.uuid().nullable(),
    }),
  })
  .refine(
    ({ params, body }) => body.afterTaskId !== params.taskId,
    'A tarefa não pode ser posicionada depois dela mesma.',
  )

export const deleteTaskSchema = z.object({ params: taskParams })

export type TaskPriority = (typeof taskPriorityValues)[number]
export type ProjectTasksParams = z.output<typeof listTasksSchema>['params']
export type TaskParams = z.output<typeof getTaskSchema>['params']
export type ListTasksQuery = z.output<typeof listTasksSchema>['query']
export type CreateTaskInput = z.output<typeof createTaskSchema>['body']
export type UpdateTaskInput = z.output<typeof updateTaskSchema>['body']
export type MoveTaskInput = z.output<typeof moveTaskSchema>['body']
