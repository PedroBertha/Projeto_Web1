# Gerenciador de Projetos e Tarefas

Projeto FullStack para a disciplina **Desenvolvimento Web 1**. A proposta é uma aplicação colaborativa na qual usuários criam projetos, organizam tarefas em um quadro Kanban e acompanham o trabalho de uma equipe.

**Estado atual:** estrutura inicial do backend criada, com TypeScript, configuração de ferramentas, tratamento centralizado de erros e endpoint `GET /api/health`. Os módulos de negócio, autenticação, conexão com o banco, frontend e deploy ainda serão implementados. O health check verifica somente o processo HTTP, não o banco.

## Funcionalidades planejadas

### Contas e autenticação

- Cadastro, login e logout de usuários.
- Senhas armazenadas com hash, nunca em texto puro.
- Sessões persistidas no PostgreSQL, sem depender da memória da instância do backend.
- Cookie de sessão com `HttpOnly`, `SameSite` e `Secure` em produção via HTTPS.
- Proteção das rotas privadas, retornando `401 Unauthorized` quando não houver autenticação válida.
- Verificação das permissões no servidor, independentemente dos controles exibidos na interface.

### Projetos e colaboração

- Criar, consultar, editar e excluir projetos.
- Listar os projetos dos quais o usuário participa.
- Convidar usuários já cadastrados pelo e-mail.
- Consultar e aceitar ou recusar convites dentro do aplicativo.
- Permitir que o dono do projeto gerencie os membros e as colunas do quadro.
- Permitir que membros consultem o quadro e trabalhem nas tarefas do projeto.

Não está previsto envio de convites por serviço de e-mail. O endereço será usado para localizar uma conta existente; o aceite ou a recusa acontecerá no aplicativo.

### Quadro Kanban e tarefas

- Criar, renomear e ordenar colunas personalizadas por projeto.
- Criar, consultar, editar e excluir tarefas.
- Mover tarefas entre colunas por arrastar e soltar, com alternativa acessível por controle na interface.
- Persistir a posição das tarefas e das colunas no banco de dados.
- Registrar título, descrição, prioridade, prazo opcional e um responsável por tarefa.
- Restringir a atribuição de responsáveis aos membros do projeto.

Comentários, anexos e subtarefas não fazem parte da primeira entrega planejada.

### Administração

O sistema terá os perfis de usuário comum e administrador geral. O administrador poderá gerenciar contas e consultar e excluir projetos e tarefas de qualquer usuário.

O papel de dono de projeto será uma permissão vinculada ao projeto, distinta do perfil de administrador geral do sistema.

### Interface

- Interface em português, com HTML semântico e CSS responsivo.
- Temas claro e escuro, com persistência da preferência.
- Telas de cadastro, login, projetos, quadro Kanban, convites e administração.
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
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── config/
│   │   └── env.ts
│   ├── database/
│   ├── errors/
│   │   └── app-error.ts
│   ├── middlewares/
│   │   └── error-handler.middleware.ts
│   └── modules/
│       ├── auth/
│       ├── users/
│       ├── projects/
│       ├── invitations/
│       ├── columns/
│       └── tasks/
├── tests/
│   └── integration/
│       └── app.test.ts
├── .env.example
├── eslint.config.js
├── package.json
├── package-lock.json
├── prisma7.config.ts
├── tsconfig.json
└── tsconfig.build.json
```

Os diretórios de módulos, banco e migrações são inicialmente reservados com `.gitkeep`, pois o Git não versiona pastas vazias. Os arquivos de cada funcionalidade serão criados durante sua implementação, sem arquivos de negócio vazios ou operações simuladas.

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

O projeto utiliza Prisma 7 com adaptador PostgreSQL. O arquivo `prisma7.config.ts` configura o endereço do banco, e `prisma/schema.prisma` está reservado para a modelagem. O cliente gerado ficará em `src/generated/prisma`, fora do versionamento. Instalar uma dependência não significa que a funcionalidade correspondente já está implementada.

O `package-lock.json` registra as versões instaladas para reprodução com `npm ci`. O `package.json` também contém um override de `effect` para uma versão corrigida da série 3, pois a configuração do Prisma 7 depende de uma versão com o aviso de segurança [GHSA-7589-6fvf-x4pw](https://github.com/advisories/GHSA-7589-6fvf-x4pw). Esse override deverá ser reavaliado ao atualizar o Prisma.

## API REST e validação

Os caminhos exatos dos endpoints ainda serão definidos durante a implementação. Os recursos previstos são autenticação, projetos, membros, convites, colunas, tarefas e administração de usuários.

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

A validação no servidor deverá abranger os campos recebidos, a existência dos relacionamentos e as permissões sobre cada recurso. A validação no frontend servirá como auxílio ao usuário e não substituirá a validação do backend.

O tratamento de erros já está centralizado no middleware da base HTTP, seguindo o formato documentado na seção de padrões do backend. Os contratos de sucesso dos módulos ainda serão definidos.

## Persistência e dados de exemplo

O modelo de dados deverá representar usuários, sessões, projetos, membros, convites, colunas e tarefas, com os relacionamentos necessários para aplicar as permissões e regras de negócio.

Serão incluídos:

- Migrações SQL versionadas para criação e evolução das tabelas.
- Script de carga de dados de exemplo para a demonstração.
- Dados que permitam demonstrar usuário comum, administrador, colaboração e tarefas em diferentes colunas.
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

Os comandos Prisma exigem `DATABASE_URL` configurada. Migrações e Studio também exigem banco acessível. Ainda não existem modelos, migrações ou script de carga de exemplo; esses itens serão criados na etapa de modelagem.

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

Estão previstos testes automatizados da API para os seguintes cenários:

- Cadastro válido, dados inválidos e e-mail duplicado.
- Login, logout e acesso sem autenticação.
- Permissões de usuário comum, dono de projeto e administrador.
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
- [ ] Estruturar o frontend em React com TypeScript.
- [ ] Implementar o modelo de dados, as migrações e a carga de exemplo.
- [ ] Implementar cadastro, login, logout e sessões persistentes.
- [ ] Implementar validação no servidor e tratamento de erros HTTP.
- [ ] Implementar projetos, membros e convites.
- [ ] Implementar colunas personalizáveis e tarefas no Kanban.
- [ ] Implementar permissões e administração geral.
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
7. Demonstrar o perfil de administrador e o logout.
8. Apresentar exemplos de testes, persistência e histórico incremental no GitHub.

## Detalhes ainda em definição

- Nome definitivo e identidade visual do aplicativo.
- Modelo detalhado do banco e contratos dos endpoints.
- Biblioteca de arrastar e soltar do frontend. No backend, foram escolhidos Zod para validação, Argon2 para senhas e Vitest com Supertest para testes.
- Regras de exclusão e de alteração de membros com tarefas atribuídas.
- Configuração completa das variáveis de autenticação e banco, comandos Docker e de carga de exemplo e URLs públicas. Os comandos da base HTTP já estão documentados.

Este documento deverá ser atualizado ao longo do desenvolvimento para refletir o comportamento efetivamente implementado e os resultados verificados.
