# Gerenciador de Projetos e Tarefas

Projeto FullStack para a disciplina **Desenvolvimento Web 1**. A proposta é uma aplicação colaborativa na qual usuários criam projetos, organizam tarefas em um quadro Kanban e acompanham o trabalho de uma equipe.

**Estado atual:** base do backend e contratos HTTP de autenticação e projetos implementados, com validação de entrada e respostas `501 Not Implemented` para operações ainda não disponíveis. O modelo `User` e sua migração SQL inicial estão definidos, mas a migração não foi aplicada. Não há persistência ativa, sessões ou autenticação. As regras de negócio, conexão com o banco, frontend e deploy ainda serão implementados. O endpoint `GET /api/health` retorna `200` e verifica somente o processo HTTP, não o banco.

## Funcionalidades planejadas

### Contas e autenticação

- Cadastro, login e logout de usuários.
- Uma conta independente por pessoa, com ID numérico e e-mail único em todo o sistema.
- O cadastro não exige projeto. A mesma conta e o mesmo login permitem participar de vários projetos.
- A unicidade do e-mail será garantida no banco após a normalização já definida: remoção de espaços externos e conversão para minúsculas.
- Senhas armazenadas com hash, nunca em texto puro.
- Sessões persistidas no PostgreSQL, sem depender da memória da instância do backend.
- Cookie de sessão com `HttpOnly`, `SameSite` e `Secure` em produção via HTTPS.
- Proteção das rotas privadas, retornando `401 Unauthorized` quando não houver autenticação válida.
- Verificação das permissões no servidor, independentemente dos controles exibidos na interface.

### Projetos e colaboração

- Criar, consultar, editar e excluir projetos.
- Listar os projetos dos quais o usuário participa.
- Convidar usuários já cadastrados pelo ID.
- Permitir informar convidados ao criar o projeto, sem exigir integrantes adicionais. O criador será o dono, e os demais só se tornarão membros após aceitar o convite.
- Consultar e aceitar ou recusar convites dentro do aplicativo.
- Permitir que o dono do projeto gerencie os membros e as colunas do quadro.
- Permitir que membros consultem o quadro e trabalhem nas tarefas conforme as permissões individuais concedidas pelo dono.

Não está previsto envio de convites por serviço de e-mail. Os colaboradores serão identificados pelos IDs de suas contas; o aceite ou a recusa acontecerá no aplicativo.

### Quadro Kanban e tarefas

- Criar, renomear e ordenar colunas personalizadas por projeto.
- Criar, consultar, editar e excluir tarefas.
- Mover tarefas entre colunas por arrastar e soltar, com alternativa acessível por controle na interface.
- Persistir a posição das tarefas e das colunas no banco de dados.
- Registrar título, descrição, prioridade, prazo opcional e um responsável por tarefa.
- Restringir a atribuição de responsáveis aos membros do projeto.

Comentários, anexos e subtarefas não fazem parte da primeira entrega planejada.

### Titularidade e permissões

Cada usuário gerencia a própria conta por ser seu titular. Não haverá administrador geral do sistema ou perfil global `ADMIN` na conta.

O criador terá controle total do próprio projeto. Nos projetos de terceiros, o participante terá permissões individuais concedidas pelo dono, vinculadas à sua participação naquele projeto. A tabela de participação e o conjunto de permissões serão definidos na etapa de modelagem de projetos, sem adicionar esses campos em `User`.

### Interface

- Interface em português, com HTML semântico e CSS responsivo.
- Temas claro e escuro, com persistência da preferência.
- Telas de cadastro, login, conta, projetos, quadro Kanban, convites e gestão de membros e permissões por projeto.
- Estados de carregamento, listas vazias e mensagens de sucesso e erro.
- Atualização da interface a partir das respostas da API, usando `fetch` e a renderização do React.

## Tecnologias e arquitetura

| Camada | Tecnologia prevista | Finalidade |
| --- | --- | --- |
| Frontend | React, TypeScript e Vite | Interface, navegação e consumo da API |
| Estilos | CSS responsivo | Layout e temas claro e escuro |
| Backend | Node.js, TypeScript e Express | API REST, autenticação e regras de negócio |
| Acesso aos dados | Prisma | Consultas e migrações do banco |
| Banco de dados | PostgreSQL | Persistência de usuários, sessões e dados do aplicativo |
| Ambiente local | Docker e Docker Compose | Inicialização da aplicação e do banco |
| Hospedagem da aplicação | Vercel | Frontend e API com acesso público via HTTPS |
| Hospedagem do banco | Neon | PostgreSQL gerenciado |
| Versionamento | Git e GitHub | Histórico incremental e repositório público |

### Comunicação entre as camadas

1. O usuário realiza uma ação na interface React.
2. O frontend envia uma requisição HTTP para `/api` usando `fetch`.
3. O backend verifica a sessão, as permissões e os dados recebidos.
4. As regras de negócio são executadas e os dados são consultados ou alterados no PostgreSQL por meio do Prisma.
5. A API retorna o código de status adequado e, quando aplicável, dados em JSON.
6. O frontend atualiza a interface e apresenta o resultado ao usuário.

No deploy, as chamadas a `/api` serão encaminhadas pelo domínio do frontend para a API. O objetivo é manter o acesso do navegador sob uma mesma origem e simplificar o uso do cookie de sessão.

Na Vercel, o backend Express executará como função serverless. Dados e sessões deverão permanecer no PostgreSQL para sobreviver às mudanças de instância.

## Organização e padrões do backend

O backend seguirá uma arquitetura em camadas organizada por funcionalidade. Cada módulo reunirá suas rotas, controllers, services, repositories e schemas de validação.

```text
backend/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│       ├── 20261126000000_create_users/
│       │   └── migration.sql
│       └── migration_lock.toml
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── config/
│   │   └── env.ts
│   ├── database/
│   ├── errors/
│   │   └── app-error.ts
│   ├── middlewares/
│   │   ├── error-handler.middleware.ts
│   │   └── validation.middleware.ts
│   └── modules/
│       ├── auth/
│       │   ├── auth.routes.ts
│       │   ├── auth.controller.ts
│       │   └── auth.schemas.ts
│       ├── users/
│       ├── projects/
│       │   ├── projects.routes.ts
│       │   ├── projects.controller.ts
│       │   └── projects.schemas.ts
│       ├── invitations/
│       ├── columns/
│       └── tasks/
├── tests/
│   ├── integration/
│   │   ├── app.test.ts
│   │   └── contracts.test.ts
│   └── unit/
│       └── schemas.test.ts
├── .env.example
├── eslint.config.js
├── package.json
├── package-lock.json
├── prisma7.config.ts
├── tsconfig.json
└── tsconfig.build.json
```

Os módulos `auth` e `projects` já possuem rotas, controllers e schemas. Os demais módulos e o diretório de conexão com o banco continuam reservados com `.gitkeep`, pois o Git não versiona pastas vazias. A pasta de migrações contém o SQL inicial de usuários e o controle do provedor PostgreSQL. Services e repositories serão criados quando começarem as regras de negócio e a persistência; não há operações de sucesso simuladas.

### Responsabilidades das camadas

| Camada | Responsabilidade |
| --- | --- |
| Routes | Definir endpoints e aplicar middlewares, sem regras de negócio |
| Controller | Receber a entrada HTTP, chamar o service e enviar a resposta com o status adequado |
| Service | Executar regras de negócio, verificar permissões e coordenar transações |
| Repository | Consultar e alterar dados com Prisma, sem depender de objetos HTTP |
| Schema | Validar os dados recebidos usando Zod |
| Middleware | Centralizar comportamentos compartilhados, como autenticação, validação e tratamento de erros |

Por exemplo, o módulo de tarefas terá `tasks.routes.ts`, `tasks.controller.ts`, `tasks.service.ts`, `tasks.repository.ts` e `tasks.schemas.ts`. O fluxo será `rota → middlewares → controller → service → repository → banco`.

### Convenções adotadas

- **Service Layer e Repository:** controllers não consultam diretamente o banco; repositories não decidem permissões.
- **Injeção de dependências manual:** serviços receberão suas dependências explicitamente, permitindo substituí-las em testes sem um framework adicional.
- **DTOs de entrada e saída:** contratos explícitos para os dados aceitos e retornados; hash de senha e dados internos não serão expostos.
- **Transações:** o service coordenará operações que precisam concluir juntas, passando o mesmo contexto de transação para os repositories envolvidos.
- **Erros centralizados:** `AppError` representa erros esperados; o middleware converte erros em JSON no formato `{ "error": { "code": "...", "message": "..." } }`. Falhas inesperadas retornam uma mensagem genérica com `500`.
- **Separação de inicialização:** `app.ts` configura e exporta o Express; `server.ts` abre a porta local. Testes importam a aplicação sem iniciar o servidor por esse arquivo.
- **Código em inglês:** identificadores e arquivos em inglês; mensagens e interface em português.
- **TypeScript estrito:** sem uso de `any` como solução padrão; interfaces serão criadas nas dependências que precisarem de substituição, sem repositories genéricos ou classes base antecipadas.
- **Padronização:** ESLint verifica problemas de código e Prettier verifica a formatação.

### Dependências do backend

| Dependências | Finalidade |
| --- | --- |
| `express` | API HTTP e roteamento |
| `zod` | Validação de dados e configuração de ambiente |
| `dotenv` | Carregamento de variáveis do arquivo `.env` |
| `helmet` | Configuração de cabeçalhos de segurança HTTP |
| `argon2` | Hash e verificação de senhas, quando a autenticação for implementada |
| `express-session`, `connect-pg-simple` | Sessões com armazenamento PostgreSQL, ainda não ativadas |
| `@prisma/client`, `@prisma/adapter-pg`, `pg` | Cliente ORM, adaptador e driver PostgreSQL |
| `prisma` | CLI de validação, geração do cliente e migrações |
| `typescript`, `tsx`, pacotes `@types/*` | Tipagem, compilação e execução em desenvolvimento |
| `vitest`, `supertest` | Testes e requisições HTTP contra a aplicação |
| `eslint`, `@eslint/js`, `typescript-eslint`, `globals`, `eslint-config-prettier`, `prettier` | Análise estática e formatação |

O projeto utiliza Prisma 7 com adaptador PostgreSQL. O arquivo `prisma7.config.ts` configura o endereço do banco, e `prisma/schema.prisma` define o modelo `User`. O cliente gerado fica em `src/generated/prisma`, fora do versionamento; ele pode ser recriado com `npm run prisma:generate`. Instalar uma dependência ou gerar o cliente não significa que a funcionalidade correspondente já está implementada.

O `package-lock.json` registra as versões instaladas para reprodução com `npm ci`. O `package.json` também contém um override de `effect` para uma versão corrigida da série 3, pois a configuração do Prisma 7 depende de uma versão com o aviso de segurança [GHSA-7589-6fvf-x4pw](https://github.com/advisories/GHSA-7589-6fvf-x4pw). Esse override deverá ser reavaliado ao atualizar o Prisma.

## API REST e validação

Os contratos iniciais de autenticação e projetos estão registrados. Membros, convites, colunas, tarefas e administração de usuários permanecem para etapas futuras.

### Endpoints disponíveis nesta etapa

Todos os caminhos abaixo incluem o prefixo `/api`. As nove rotas de autenticação e projetos validam a entrada quando aplicável e retornam **`501 Not Implemented`**, com mensagem em português e o código indicado. Não criam usuários ou projetos, não verificam credenciais, não consultam existência no banco e não geram cookies de sessão. A proteção com `401` será adicionada junto da autenticação real.

| Método | Caminho | Entrada | Código de erro após validação |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Corpo: `name`, `email`, `password` | `REGISTER_NOT_IMPLEMENTED` |
| `POST` | `/api/auth/login` | Corpo: `email`, `password` | `LOGIN_NOT_IMPLEMENTED` |
| `POST` | `/api/auth/logout` | Sem corpo necessário | `LOGOUT_NOT_IMPLEMENTED` |
| `GET` | `/api/auth/me` | Sem corpo | `CURRENT_USER_NOT_IMPLEMENTED` |
| `GET` | `/api/projects` | Sem filtros implementados | `LIST_PROJECTS_NOT_IMPLEMENTED` |
| `POST` | `/api/projects` | Corpo: `name`; `description` e `collaborators` opcionais | `CREATE_PROJECT_NOT_IMPLEMENTED` |
| `GET` | `/api/projects/:projectId` | Parâmetro UUID | `GET_PROJECT_NOT_IMPLEMENTED` |
| `PATCH` | `/api/projects/:projectId` | Parâmetro UUID; corpo com `name` e/ou `description` | `UPDATE_PROJECT_NOT_IMPLEMENTED` |
| `DELETE` | `/api/projects/:projectId` | Parâmetro UUID | `DELETE_PROJECT_NOT_IMPLEMENTED` |
| `GET` | `/api/health` | Sem corpo | Retorna `200` com `{ "status": "ok" }` |

### Regras de entrada implementadas

- Cadastro: nome entre 2 e 100 caracteres, e-mail válido e senha entre 8 e 128 caracteres.
- Login: e-mail válido e senha não vazia, com até 128 caracteres; não aplica o mínimo de cadastro a uma tentativa de login.
- Projeto: nome entre 1 e 100 caracteres e descrição opcional com até 2.000 caracteres.
- Criação de projeto: `collaborators` é um array opcional de IDs numéricos inteiros positivos de usuários, como `[1, 2, 3]`. Omissão ou `[]` permite criar sem colaboradores adicionais; a entrada validada sempre fornece uma lista, usando `[]` quando omitida. IDs duplicados são rejeitados, assim como strings, UUIDs, zero, negativos, frações e valores fora da precisão segura de inteiros do JavaScript. Não há conversão automática de strings para números.
- Convites só são aceitos no contrato de criação; o PATCH continua restrito a nome e descrição. O dono será obtido da sessão na implementação futura, nunca de um `ownerId` enviado pelo cliente.
- Atualização de projeto: exige ao menos um campo permitido. `description: ""` é aceito para permitir a limpeza da descrição na implementação futura; `null` não é aceito.
- Nomes e e-mails perdem espaços externos; e-mails são convertidos para minúsculas. Senhas e descrições não são modificadas.
- Corpos de cadastro, login, criação e atualização rejeitam campos desconhecidos.
- O identificador do projeto deve ser um UUID válido, sem verificação de existência nesta etapa.

O middleware `validateRequest` valida corpo e parâmetros por meio dos schemas Zod e disponibiliza a entrada normalizada em `res.locals.validated`, com tipagem específica para cada controller. Falhas retornam `400` com código `VALIDATION_ERROR` e mensagem genérica, sem expor valores recebidos ou senhas.

Os IDs em `collaborators` identificam os usuários selecionados para colaborar no projeto. O fluxo de aceite continua previsto: a seleção dará origem a convites pendentes dentro do aplicativo, sem envio de mensagens por serviço de e-mail. A verificação de existência das contas, a criação de convites e a associação do criador ao projeto dependem da implementação futura de autenticação e persistência. Nesta etapa, a API verifica apenas o contrato e continua retornando `501`, sem adicionar membros ou gerar convites. A antiga chave `inviteeEmails` não é aceita.

### Exemplos de requisição

Com a API local em execução, as requisições abaixo demonstram os contratos. Os dados são exemplos; nenhum registro será persistido.

Cadastro com entrada válida — resposta esperada: `501` com `REGISTER_NOT_IMPLEMENTED`:

```bash
curl -i http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Pedro","email":"pedro@example.com","password":"senha-exemplo-123"}'
```

Login com entrada válida — resposta esperada: `501` com `LOGIN_NOT_IMPLEMENTED`:

```bash
curl -i http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"pedro@example.com","password":"senha-exemplo-123"}'
```

Criação de projeto com convidados — resposta esperada: `501` com `CREATE_PROJECT_NOT_IMPLEMENTED`:

```bash
curl -i http://localhost:3000/api/projects \
  -H 'Content-Type: application/json' \
  -d '{"name":"Projeto Web","description":"Trabalho da disciplina","collaborators":[1,2,3]}'
```

Para criar sem colaboradores adicionais, omita `collaborators` ou informe uma lista vazia. Os IDs acima são exemplos de formato, sem correspondência com contas reais. Usuários convidados precisarão aceitar no aplicativo antes de participar, quando o fluxo de convites estiver implementado.

Atualização parcial com UUID válido e descrição vazia — resposta esperada: `501` com `UPDATE_PROJECT_NOT_IMPLEMENTED`:

```bash
curl -i -X PATCH http://localhost:3000/api/projects/550e8400-e29b-41d4-a716-446655440000 \
  -H 'Content-Type: application/json' \
  -d '{"description":""}'
```

O UUID é apenas um exemplo de formato válido; não representa um projeto cadastrado. Um PATCH com corpo `{}` ou uma consulta a `/api/projects/not-a-uuid` retornará `400` com `VALIDATION_ERROR`.

Exemplo do formato de resposta para funcionalidade pendente:

```json
{
  "error": {
    "code": "CREATE_PROJECT_NOT_IMPLEMENTED",
    "message": "A criação de projetos ainda não foi implementada."
  }
}
```

### Métodos previstos para as funcionalidades completas

| Método | Uso previsto |
| --- | --- |
| `GET` | Consultar recursos e listar dados permitidos ao usuário |
| `POST` | Criar recursos e executar ações como login e aceite de convite |
| `PATCH` | Atualizar dados, prioridades, posições e demais propriedades |
| `DELETE` | Excluir recursos conforme as permissões |

### Códigos de status

| Código | Uso previsto |
| --- | --- |
| `200 OK` | Consulta, atualização ou ação concluída com resposta |
| `201 Created` | Criação de um recurso |
| `204 No Content` | Operação concluída sem corpo de resposta, como exclusão |
| `400 Bad Request` | Dados inválidos ou campos obrigatórios ausentes |
| `401 Unauthorized` | Ausência de sessão válida ou credenciais incorretas |
| `403 Forbidden` | Usuário autenticado sem permissão para a operação |
| `404 Not Found` | Recurso não encontrado |
| `409 Conflict` | Conflito com o estado atual, como e-mail já cadastrado ou convite pendente duplicado |
| `500 Internal Server Error` | Falha inesperada, tratada sem expor detalhes internos ao cliente |
| `501 Not Implemented` | Contrato registrado, mas funcionalidade ainda não implementada |

Atualmente, `200` está implementado no health check, `400` cobre validação e JSON malformado, `404` cobre caminhos inexistentes e `501` identifica os contratos pendentes. O tratamento de falhas inesperadas com `500` permanece ativo. O parser também retorna `413` para corpos acima de 100 KB. Os demais códigos serão usados conforme as funcionalidades forem implementadas.

A validação atual cobre os campos recebidos e o formato dos identificadores. A existência de relacionamentos e as permissões serão verificadas quando houver persistência e autenticação. A validação no frontend servirá como auxílio ao usuário e não substituirá a validação do backend.

O tratamento de erros já está centralizado no middleware da base HTTP, seguindo o formato documentado na seção de padrões do backend. Os contratos de sucesso dos módulos ainda serão definidos.

## Persistência e dados de exemplo

O modelo de dados deverá representar usuários, sessões, projetos, membros, convites, colunas e tarefas, com os relacionamentos necessários para aplicar as permissões e regras de negócio.

### Identidade e participação em projetos

A conta existe independentemente de qualquer projeto. A relação entre usuários e projetos será muitos para muitos, representada por uma entidade de participação.

| Entidade prevista | Responsabilidade |
| --- | --- |
| `User` | Conta independente com ID numérico, nome, e-mail único, hash da senha e datas; modelo já definido, sem role global |
| `Project` | Dados do projeto |
| `ProjectMember` | Associação entre usuário e projeto, com titularidade, permissões individuais e unicidade do par usuário/projeto; modelagem futura |
| `Invitation` | Convite para uma conta existente, com aceite ou recusa no aplicativo |

- O cadastro cria uma conta, sem associá-la obrigatoriamente a um projeto.
- Criar um projeto associa o usuário autenticado como dono.
- Os IDs enviados em `collaborators` identificam contas existentes que receberão convites; aceitar cria a participação no projeto.
- Um usuário pode ser dono de um projeto e participante de outro; suas permissões pertencem à participação em cada projeto.
- A conta não possui role global; cada usuário gerencia sua própria conta, e o dono concede permissões individuais aos participantes de seu projeto.
- Remover uma participação preserva a conta e suas outras participações. Excluir um projeto também preserva as contas dos participantes.

As regras de participação estão definidas para a implementação futura. Somente o modelo de usuários e sua migração inicial foram criados; as tabelas de projetos, participações e convites ainda serão modeladas. As rotas permanecem como contratos com resposta `501`.

### Modelo de usuários e migração inicial

O modelo Prisma `User` é mapeado para a tabela PostgreSQL `users`. Todos os campos abaixo são obrigatórios:

| Campo Prisma | Coluna SQL | Tipo PostgreSQL | Regra |
| --- | --- | --- | --- |
| `id` | `id` | `SERIAL` / `INTEGER` | Chave primária autoincremental |
| `name` | `name` | `VARCHAR(100)` | Nome do usuário |
| `email` | `email` | `TEXT` | Índice único |
| `passwordHash` | `password_hash` | `TEXT` | Hash da senha, nunca a senha em texto puro |
| `createdAt` | `created_at` | `TIMESTAMPTZ(3)` | Padrão: instante da criação |
| `updatedAt` | `updated_at` | `TIMESTAMPTZ(3)` | Padrão: instante da criação; atualizado pelo Prisma |

Não existem campos `role`, `projectId` ou flag de desativação em `User`, nem enum de perfil global. A senha recebida no cadastro deverá ser transformada em hash na implementação futura. O e-mail deverá ser persistido sem espaços externos e em minúsculas, conforme o contrato de cadastro; o índice único compara os valores armazenados e não realiza essa normalização automaticamente.

A migração `backend/prisma/migrations/20261126000000_create_users/migration.sql` foi gerada a partir do schema, sem conexão com um banco. O arquivo `migration_lock.toml` registra o provedor PostgreSQL. O SQL está versionável, mas **não foi aplicado** e nenhuma conta foi criada.

`updatedAt` possui `@updatedAt` no Prisma e valor inicial no SQL. Não existe trigger: uma atualização feita diretamente por SQL deverá definir `updated_at` explicitamente, enquanto atualizações via Prisma serão gerenciadas pelo cliente.

Serão incluídos:

- Migrações SQL versionadas para criação e evolução das tabelas.
- Script de carga de dados de exemplo para a demonstração.
- Dados que permitam demonstrar contas, dono de projeto, participantes com permissões individuais e tarefas em diferentes colunas.
- Orientações de configuração das variáveis de ambiente, sem versionar segredos.

As regras para exclusão de colunas com tarefas, saída ou remoção de membros e tratamento de suas tarefas serão definidas antes da implementação desses fluxos.

## Execução local e deploy

### Ambiente local

Pré-requisitos da base atual: Node.js 24 ou superior e npm. O arquivo `.nvmrc` na raiz indica Node.js 24 para quem utiliza nvm.

Na raiz do repositório:

```bash
cd backend
npm ci
cp .env.example .env
npm run dev
```

A API local fica disponível em `http://localhost:3000`, com verificação em `GET /api/health`. Essa etapa ainda não exige um PostgreSQL em execução, pois os módulos de persistência não estão conectados. O arquivo `.env` não deve ser versionado.

| Comando, dentro de `backend/` | Finalidade |
| --- | --- |
| `npm run dev` | Executar a API com recarregamento em desenvolvimento |
| `npm run typecheck` | Verificar tipos sem gerar arquivos |
| `npm run build` | Compilar o código de `src/` para `dist/` |
| `npm start` | Executar a versão compilada, após o build |
| `npm test` | Executar os testes automatizados existentes |
| `npm run test:watch` | Executar testes em modo de acompanhamento |
| `npm run lint` | Verificar as regras de código |
| `npm run format:check` | Verificar formatação |
| `npm run format` | Aplicar formatação |
| `npm run prisma:validate` | Validar a configuração e o schema Prisma |
| `npm run prisma:generate` | Gerar o cliente Prisma após definir os modelos |
| `npm run db:migrate -- --name nome_da_migracao` | Criar e aplicar uma migração em desenvolvimento, após definir os modelos |
| `npm run db:deploy` | Aplicar migrações versionadas no banco de destino |
| `npm run db:studio` | Abrir a interface de inspeção do banco |

Os comandos Prisma exigem `DATABASE_URL` configurada. Validar o schema, gerar o cliente ou gerar um diff entre schema vazio e modelo não exige banco acessível. Aplicar migrações e usar o Studio exige banco acessível. O modelo `User` e a migração inicial já existem, mas não foram aplicados; os demais modelos e o script de carga de exemplo serão criados nas próximas etapas. Nenhum comando de execução da API aplica migrações automaticamente.

Está prevista a inclusão de Dockerfile e Docker Compose para iniciar a aplicação e o PostgreSQL com um comando. A execução local atual usa Node.js diretamente; os comandos Docker serão documentados quando os arquivos forem criados e validados.

### Ambiente público

- Frontend React e API Express hospedados na Vercel.
- Banco PostgreSQL hospedado no Neon.
- Acesso público por HTTPS.
- Configuração das credenciais e dos segredos por variáveis de ambiente.
- Uso inicial dos planos gratuitos, sujeito às cotas e condições de cada serviço.

O Docker será usado para execução local; o deploy na Vercel utilizará o formato de execução da própria plataforma. As URLs públicas serão registradas após o deploy.

Referências oficiais da arquitetura proposta: [Express na Vercel](https://vercel.com/docs/frameworks/backend/express), [plano Hobby](https://vercel.com/docs/plans/hobby), [encaminhamento de requisições](https://vercel.com/docs/routing/rewrites) e [plano gratuito do Neon](https://neon.com/blog/neon-free-plan-1-gb-per-project).

## Testes e verificação

Os testes iniciais em `backend/tests/integration/app.test.ts` verificam o health check, o retorno JSON de rota inexistente e a resposta `400` para JSON malformado. Não exigem banco de dados.

Os testes em `backend/tests/integration/contracts.test.ts` verificam as nove rotas com `501`, os códigos de cada operação, a ausência de cookies de sessão, os campos obrigatórios, formatos, limites de tamanho, campos desconhecidos, PATCH vazio e UUID inválido. Os testes em `backend/tests/unit/schemas.test.ts` verificam a normalização de nomes e e-mails e a preservação de senhas e descrições.

Os contratos também possuem testes de colaboradores opcionais, listas de IDs numéricos inválidas, IDs duplicados, rejeição de UUIDs, e-mails e da chave antiga `inviteeEmails`, e rejeição de alterações de colaboradores pelo PATCH. A suíte não exige banco ou segredos de autenticação. Os testes HTTP usam portas locais temporárias.

Estão previstos testes automatizados da API para os seguintes cenários:

- Cadastro válido, dados inválidos e e-mail duplicado.
- Login, logout e acesso sem autenticação.
- Titularidade da própria conta, controle do dono e permissões individuais dos participantes em cada projeto.
- Criação, consulta, atualização e exclusão de projetos e tarefas.
- Convites, aceite, recusa e prevenção de duplicidade pendente.
- Atribuição de tarefa somente a membro do projeto.
- Movimentação e ordenação de tarefas e colunas.
- Respostas de recurso inexistente, conflito e falha inesperada; falhas internas serão simuladas em testes, sem criar rota pública para provocá-las.

Também serão verificados manualmente a responsividade, os dois temas, as mensagens de erro, a persistência após recarregar a página e o fluxo de autenticação no deploy HTTPS.

## Acompanhamento da entrega

- [x] Definir tema, tecnologias e funcionalidades iniciais.
- [x] Documentar a proposta neste arquivo.
- [x] Criar a estrutura inicial do backend em TypeScript, com configuração de ferramentas e testes da base HTTP.
- [x] Criar e testar os contratos HTTP de autenticação e projetos, com validação e respostas `501`.
- [x] Definir o modelo `User` e gerar a migração SQL inicial, sem aplicá-la ao banco.
- [ ] Estruturar o frontend em React com TypeScript.
- [ ] Implementar o modelo de dados, as migrações e a carga de exemplo.
- [ ] Implementar cadastro, login, logout e sessões persistentes.
- [ ] Implementar validação no servidor e tratamento de erros HTTP.
- [ ] Implementar projetos, membros e convites.
- [ ] Implementar colunas personalizáveis e tarefas no Kanban.
- [ ] Implementar titularidade de conta e permissões individuais por participação no projeto.
- [ ] Integrar a interface à API por `fetch`.
- [ ] Implementar responsividade e temas claro e escuro.
- [ ] Criar e executar os testes automatizados da API.
- [ ] Configurar e validar a execução local com Docker.
- [ ] Realizar e verificar o deploy público com HTTPS.
- [ ] Completar o relatório técnico com instruções reais, endpoints e resultados de testes.
- [ ] Manter o repositório público com commits incrementais durante o desenvolvimento.
- [ ] Preparar e ensaiar a demonstração individual.
- [ ] Enviar o link do repositório no Moodle dentro do prazo.

## Roteiro previsto para a demonstração

1. Apresentar a proposta e a arquitetura da aplicação.
2. Demonstrar cadastro, login e proteção de rotas.
3. Criar um projeto e personalizar seu quadro.
4. Convidar outro usuário e demonstrar o aceite.
5. Criar uma tarefa, atribuir responsável e movê-la entre colunas.
6. Mostrar um erro de validação e um conflito tratado pela API.
7. Demonstrar as permissões concedidas pelo dono a um participante e o logout.
8. Apresentar exemplos de testes, persistência e histórico incremental no GitHub.

## Detalhes ainda em definição

- Nome definitivo e identidade visual do aplicativo.
- Modelo detalhado do banco, contratos de sucesso e endpoints dos módulos ainda não iniciados. Os contratos iniciais de entrada de autenticação e projetos já estão documentados.
- Biblioteca de arrastar e soltar do frontend. No backend, foram escolhidos Zod para validação, Argon2 para senhas e Vitest com Supertest para testes.
- Regras de exclusão e de alteração de membros com tarefas atribuídas.
- Configuração completa das variáveis de autenticação e banco, comandos Docker e de carga de exemplo e URLs públicas. Os comandos da base HTTP já estão documentados.

Este documento deverá ser atualizado ao longo do desenvolvimento para refletir o comportamento efetivamente implementado e os resultados verificados.
