# Alfamed API

Backend do Alfamed, uma API SaaS para gestão clínica e hospitalar.

O projeto implementa autenticação, gestão de usuários e perfis clínicos, escopo por unidade, agenda e solicitações de atendimento, com arquitetura modular em TypeScript.

## Escopo atual

- Autenticação com Better Auth
 - Gestão de sessão e seleção de unidade ativa
- Usuários
- Profissionais
- Pacientes
- Unidades
 - Usuários
 - Profissionais
 - Pacientes
 - Unidades
 - Administração interna

## Stack

- Bun
- Elysia
- Drizzle ORM
- Better Auth
- Zod
- PostgreSQL (incluindo Supabase)

## Arquitetura

Arquitetura modular com separação por camadas:

- repository: acesso a dados
- service: regras de negócio
- routes: endpoints HTTP
- schemas: validação com Zod

Referências principais de padrão: módulos users e professionals.

## Multi-tenant e escopo por unidade

O sistema é multi-tenant por unidade clínica/hospitalar.

- Dados de domínio devem respeitar o escopo da unidade selecionada.
- O contexto de unidade é selecionado via endpoints de sessão.
- Requisições fora do escopo retornam Forbidden.

## Requisitos

- Bun instalado
- PostgreSQL disponível
- Vercel CLI opcional para execução local em modo serverless
- Variáveis de ambiente configuradas

## Variáveis de ambiente

Configuração mínima:

```env
BETTER_AUTH_SECRET=sua_chave
BETTER_AUTH_BASE_URL=http://localhost:3333
DATABASE_URL=postgresql://usuario:senha@host:5432/database
```

Para seed do primeiro admin:

```env
INITIAL_ADMIN_NAME=Nome Admin
INITIAL_ADMIN_EMAIL=admin@alfamed.com
INITIAL_ADMIN_PASSWORD=SenhaForte123
INITIAL_ADMIN_CPF=00000000000
INITIAL_ADMIN_PHONE=11999999999
INITIAL_ADMIN_BIRTHDATE=1990-01-01
```

Observações:

- BETTER_AUTH_SECRET é obrigatório.
- BETTER_AUTH_BASE_URL é obrigatório.
- Para bun run dev, use base URL local em porta 3333.
- Para bunx vercel dev, use base URL local em porta 3000.

## Origens confiáveis

As origens de frontend ficam centralizadas na constante trustedOrigins do plugin de acesso por unidade.

Atualmente:

- https://dev-alfamed.vercel.app
- https://web-alfamed.vercel.app
- http://localhost:5173
- http://localhost:53441

Esse valor é reutilizado por CORS e Better Auth.

## Instalação

```bash
bun install
```

## Execução local

Com Bun:

```bash
bun run dev
```

Com Vercel local:

```bash
bunx vercel dev
```

## Scripts disponíveis

```bash
bun run dev
bun run db:generate
bun run db:migrate
bun run db:seed
bun run test
bun run test:unit
bun run test:e2e
bun run test:watch
```

## Banco de dados e bootstrap

Gerar migrações:

```bash
bun run db:generate
```

Aplicar migrações:

```bash
bun run db:migrate
```

Criar primeiro usuário administrativo:

```bash
bun run db:seed
```

O seed cria:

- registro em users
- conta de login em accounts com senha hashada
- professional vinculado ao user

Regra do seed: o e-mail do admin inicial deve terminar com @alfamed.com.

## Autenticação e sessão

- Better Auth está montado em /auth
- Existe rota de conveniência POST /auth/register para cadastro por e-mail/senha
- Endpoints nativos de login e sessão do Better Auth permanecem disponíveis em /auth


Sessão e renovação de cookies (atualização recente)

- A aplicação renova automaticamente a sessão e os cookies relacionados em cada request autenticada. Isso previne que usuários ativos sejam desconectados por inatividade curta.
- Cookies renovados:
  - `better-auth.session_token` (cookie do Better Auth)
  - `better-auth.session_data` (cookie do Better Auth)
  - `selectedUnitId` (unidade selecionada)
  - `selectedProfessionalUnitId` (vínculo profissional selecionado)
- Configurações e pontos de controle:
  - Constantes centrais em `src/config/session.ts`:
    - `SESSION_EXPIRY_SECONDS` — tempo de expiração da sessão (padrão: 1 hora)
    - `SELECTED_UNIT_COOKIE_MAX_AGE_SECONDS` — usado para cookies de unidade/profissional (igual a `SESSION_EXPIRY_SECONDS` por padrão)
    - `TRUSTED_ORIGINS` — origens confiáveis usadas por CORS/Better Auth
  - Renovação implementada via helper `src/http/plugins/session-helpers.ts` e invocação global em `src/app.ts` (`onBeforeHandle`).
  - Para desativar esse comportamento remova a chamada a `renewSessionCookies` em `src/app.ts`.

- Observação: o logout (POST `/auth/sign-out`) já expira explicitamente os cookies de seleção de unidade/vínculo no plugin `src/http/plugins/better-auth.ts`.

## Headers importantes

- Authorization
- x-unit-id (em fluxos que exigem unidade selecionada)

## Documentação OpenAPI

Disponível em:

```text
/openapi
```

Tags atuais:

- System
- Users
- Units
- Professionals
- Patients
- Better Auth
- Admin

## Rotas por módulo (resumo)

System:

- GET /
- GET /health

Users:

- GET /users/:id

Patients:

- POST /patients/link-user
- GET /patients/:patientId

Professionals:

- POST /professionals
- GET /professionals/professional-unit/roles
- POST /professionals/link-user
- GET /professionals
- GET /professionals/:id
- PATCH /professionals/:id

Units:

- POST /units
- GET /units/by-user
- GET /units/:id
- PATCH /units/:id

<!-- Specialties and Appointments modules removed from this project -->

Admin (acesso interno por e-mail @alfamed.com):

- GET /admin/units
- POST /admin/units
- GET /admin/units/:id
- PATCH /admin/units/:id
- GET /admin/units/:id/professionals
- POST /admin/units/:id/professionals
- GET /admin/upm/users
- POST /admin/upm/users

## Testes

Executar toda a suíte:

```bash
bun run test
```

Separado:

```bash
bun run test:unit
bun run test:e2e
```

## Deploy na Vercel

Antes do deploy:

- configurar DATABASE_URL
- configurar BETTER_AUTH_SECRET
- configurar BETTER_AUTH_BASE_URL com URL pública da API
- validar trustedOrigins para os frontends permitidos

## Estrutura resumida

```text
api/
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