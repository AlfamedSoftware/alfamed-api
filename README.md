# Alfamed API

API backend para o projeto Alfamed — aplicação em TypeScript usando Elysia, Drizzle-ORM e Bun.

**Resumo:** esta API implementa módulos para autenticação, usuários, profissionais, unidades, agendamentos e mais. Foi desenvolvida com foco em testes (Vitest), migrations com Drizzle e deploy via Vercel.

**Tecnologias principais**
- TypeScript
- Bun (runtime & package manager)
- Elysia (framework HTTP)
- Drizzle ORM + drizzle-kit (migrations/generate)
- Postgres (via `postgres`)
- Vitest (testes unitários & e2e)
- SendGrid (envio de e‑mails)

**Pré-requisitos**
- Bun instalado (https://bun.sh)
- Postgres acessível - Supabase
- Variáveis de ambiente configuradas (veja `.env.example`)

Instalação rápida

```bash
git clone <repo> 
cd alfamed-api
bun install
cp .env.example .env
# editar .env com as credenciais reais
```

Scripts úteis
- Instalar dependências: `bun install`
- Rodar em modo desenvolvimento (watch): `bun run dev` ou `bunx vercel dev`
- Executar migrations: `bun run db:migrate`
- Gerar tipos/migrations: `bun run db:generate`
- Popular DB com admin inicial: `bun run db:seed`
- Testes: `bun run test` (ou `bun run test:unit`, `bun run test:e2e`)

Variáveis de ambiente (principais)
- `BETTER_AUTH_SECRET` — chave para Better Auth
- `BETTER_AUTH_BASE_URL` — URL base pública da API
- `SENDGRID_API_KEY` — chave da API SendGrid (opcional, para envio de e‑mails)
- `SENDGRID_FROM_EMAIL` — e‑mail remetente para SendGrid
- `DATABASE_URL` — string de conexão PostgreSQL

Banco de dados
- As migrations estão em `db/migrations/` e são gerenciadas por `drizzle-kit`.
- Para criar migrations ou aplicar, use os scripts `db:generate` e `db:migrate`.

Estrutura do projeto (resumo)
- `api/` — rota da API para Vercel (entry)
- `src/` — código fonte do servidor
	- `src/server.ts`, `src/app.ts` — bootstrap do servidor
	- `src/modules/` — módulos do domínio (auth, users, professionals, units, etc.)
	- `src/db/` — cliente DB e configurações
	- `src/scripts/seed-initial-admin.ts` — script para criar um admin inicial
- `tests/` — testes unitários e e2e (Vitest)

Executando localmente
1. Preencha `.env` com as variáveis necessárias.
2. Inicie em dev: `bun run dev` ou `bunx vercel dev`

Testes
- Rodar todos: `bun run test`
- Rodar apenas unit: `bun run test:unit`
- Rodar apenas e2e: `bun run test:e2e`

Deploy
- O projeto contém `vercel.json` e está preparado para deploy em Vercel. Configure as variáveis de ambiente no painel do Vercel.

Para iniciar um novo banco de dados (ex: para testes ou desenvolvimento), siga:
0. Configure `DATABASE_URL` no `.env` para apontar para o novo banco.
1. Aplique migrations: `bun run db:migrate`
2. Rode o seed (precisa ser configurado na env): `bun run db:seed`

Rotas e documentação
- A API segue uma estrutura RESTful, com rotas organizadas por módulos (ex: `/api/professionals`, `units`, etc.).
- Acesse `http://localhost:3000/openapi` para ver a documentação OpenAPI gerada automaticamente via Elysia.