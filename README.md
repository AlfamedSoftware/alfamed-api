# Alfamed API

API backend do **Alfamed**, uma plataforma SaaS para gestão clínica e hospitalar.

O projeto usa arquitetura modular com foco em:

- pacientes
- profissionais de saúde
- consultas
- especialidades
- unidades da clínica
- autenticação com Better Auth

## Stack

- Bun
- Elysia
- Drizzle ORM
- Better Auth
- Zod
- PostgreSQL

## Requisitos

- Bun instalado
- Vercel CLI instalado, se quiser rodar o projeto com `vercel dev`
- PostgreSQL disponível
- Variáveis de ambiente configuradas

## Variáveis de ambiente

Crie as variáveis abaixo no ambiente local. Na Vercel, configure os mesmos valores ou os equivalentes de produção:

```env
DATABASE_URL=postgresql://usuario:senha@localhost:5432/alfamed
BETTER_AUTH_SECRET=sua_chave_secreta_forte
BETTER_AUTH_BASE_URL=http://localhost:3333
```

Exemplo para produção (Vercel):

```env
BETTER_AUTH_BASE_URL=https://alfamed-api-prod.vercel.app
```

Observações:

- `BETTER_AUTH_SECRET` é obrigatório.
- `BETTER_AUTH_BASE_URL` é obrigatório e nao possui fallback.
- Em producao, configure `BETTER_AUTH_BASE_URL` com a URL publica da API.

Valores recomendados para `BETTER_AUTH_BASE_URL` por modo de execucao:

- `bun run dev` -> `http://localhost:3333`
- `bunx vercel dev` -> `http://localhost:3000`
- Deploy na Vercel -> `https://seu-dominio-da-api`

## Origens confiáveis (CORS e Better Auth)

As URLs permitidas de frontend nao sao mais configuradas por variavel de ambiente.

Agora elas ficam centralizadas no backend em um unico ponto compartilhado:

- `src/http/plugins/unit-access.ts` (constante `trustedOrigins`)

Esse valor e reutilizado por:

- CORS da API
- `trustedOrigins` do Better Auth

URLs atuais permitidas:

- `https://dev-alfamed.vercel.app`
- `https://web-alfamed.vercel.app`
- `http://localhost:5137`

Para adicionar ou remover dominios, altere apenas essa constante.

Importante: após alterar `trustedOrigins`, faça novo deploy da API para aplicar as mudanças.

## Instalação

```bash
bun install
```

## Execução local

### Com Bun

```bash
bun run dev
```

Isso inicia o servidor em modo watch usando `src/server.ts`.

### Com Vercel local

```bash
bunx vercel dev
```

Use essa opção se quiser testar o mesmo fluxo do deploy localmente, incluindo a função serverless em `api/index.ts`.

Observação: neste ambiente, `npx vercel dev` pode falhar durante a instalação do CLI com `ETARGET`; `bunx vercel dev` está funcionando normalmente.

Observação: para esse modo, garanta que o arquivo `.env` tenha pelo menos `DATABASE_URL`, `BETTER_AUTH_SECRET` e `BETTER_AUTH_BASE_URL=http://localhost:3000`.

## Banco de dados

Geração de migração:

```bash
bun run db:generate
```

Aplicação das migrações:

```bash
bun run db:migrate
```

## Testes

```bash
bun run test
```

Testes separados:

```bash
bun run test:unit
bun run test:e2e
```

## Documentação da API

A documentação OpenAPI fica disponível em:

```text
/openapi
```

## Rotas

### System

- `GET /` - health check da aplicação, padrão ao acessar a raiz
- `GET /health` - health check da aplicação

### Auth

- `POST /auth/register` - registra usuário com email, senha e dados obrigatórios do perfil (`cpf`, `phone`, `birthdate`) (alias para `/auth/sign-up/email` do Better Auth)
- `POST /auth/sign-in/email` - realiza login com email e senha (endpoint nativo do Better Auth)

### Users

- `GET /users/:id` - retorna o perfil do usuário autenticado quando o `id` da rota bate com a sessão

### Professionals

As rotas de profissionais exigem autenticação e o header `x-unit-id`.

Observação de domínio: o mesmo usuário pode possuir vínculo de `patient` e `professional` ao mesmo tempo.

- `POST /professionals` - cria um profissional para o usuário autenticado
- `POST /professionals/link-user` - cria um profissional para um `userId` informado no body
- `GET /professionals` - lista profissionais da unidade
- `GET /professionals/:id` - busca um profissional por id
- `PATCH /professionals/:id` - atualiza um profissional
- `DELETE /professionals/:id` - remove um profissional

### Patients

As rotas de patients exigem autenticação.

- `POST /patients/link-user` - cria um patient para um `userId` informado no body
- `GET /patients/:patientId` - busca um patient por id (somente quando pertence ao usuário autenticado)
- `GET /patients/me` - retorna o profile de patient do usuário autenticado

## Headers importantes

- `Authorization` - autenticação
- `x-unit-id` - unidade ativa da requisição

## Deploy na Vercel

O projeto está preparado para deploy como função serverless na Vercel.

Antes de publicar, confirme:

- `DATABASE_URL` está configurada
- `BETTER_AUTH_SECRET` está configurado
- `BETTER_AUTH_BASE_URL` aponta para a URL pública correta da aplicação
- As URLs confiáveis de frontend estão corretas na constante `trustedOrigins`

## Estrutura resumida

```text
src/
  app.ts
  auth.ts
  server.ts
  db/
  http/
  modules/
tests/
```

## Licença

Projeto interno para uso acadêmico e desenvolvimento do sistema Alfamed.