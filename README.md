# Alfamed API

Backend do Alfamed, uma API SaaS para gestão clínica e hospitalar.

> **Agentes de IA:** leia também [`AGENTS.md`](./AGENTS.md) — regras de arquitetura, escopo por unidade (cookies) e Service Desk.

O projeto implementa autenticação, gestão de usuários e perfis clínicos, escopo por unidade, agenda e solicitações de atendimento, com arquitetura modular em TypeScript.

## Escopo atual

- Autenticação com Better Auth
- Gestão de sessão e seleção da unidade ativa
- Usuários
- Profissionais
- Pacientes
- Unidades
- Vínculos profissional-unidade
- Roles
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
- O contexto ativo **não** usa header `x-unit-id` (removido). A unidade é definida por **cookies HTTP** após a seleção na sessão.
- O vínculo usuário ↔ unidade é validado no banco via `professional_units` (`createHasUserAccessToUnitChecker`).
- Requisições fora do escopo retornam `403 Forbidden` ou `400` quando a clínica não foi selecionada.

### Cookies de contexto (após `POST /session/select-unit`)

| Cookie | Descrição |
|--------|-----------|
| `selectedUnitId` | UUID da unidade ativa (`units.id`) |
| `selectedProfessionalUnitId` | UUID do vínculo em `professional_units` |

Helpers: `src/http/plugins/unit-context.ts` (`getUnitIdFromRequest`, `getProfessionalUnitIdFromRequest`).

Rotas de domínio clínico (ex.: `GET /professionals`, `POST /professional-units/full-create`) leem `selectedUnitId`. Se ausente:

```json
{ "message": "Selecione uma clínica para continuar" }
```

Status: **400**.

`GET /professionals/professional-unit/roles` exige também `selectedProfessionalUnitId` (mensagem: *Selecione um vínculo profissional para continuar*).

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

O seed cria ou garante:

- as roles base (`administrative`, `administrative_assistant`, `medic`, `internal_alfamed`)
- a unidade interna `Alfamed Interno`
- registro em `users`
- conta de login em `accounts` com senha hashada
- `professional` vinculado ao usuário admin
- vínculo em `professional_units` com `is_active = true`
- role `internal_alfamed` aplicada ao vínculo profissional-unidade

Regra do seed: o e-mail do admin inicial deve terminar com `@alfamed.com`.

## Autenticação e sessão

- Better Auth montado em `/auth` (sessão por **cookies**, `credentials: include` no frontend).
- Rota de conveniência: `POST /auth/register` (encaminha para sign-up com `cpf`, `phone`, `birthdate`).
- Senha: bcrypt com **12 rounds**.
- Sessão: expira em **1 hora** e usa cache de cookie no Better Auth.
- O helper de renovação em `src/http/plugins/session-helpers.ts` renova cookies autenticados em requisições válidas.

### Login clínico (fluxo padrão)

1. `POST /auth/sign-in/email` com e-mail e senha.
2. Hook `before` em `src/auth.ts` valida:
   - `users.isActive` e `professionals.isActive` (se existir profissional).
  - se o login apontar para `/admin/` via `callbackURL` ou path, também valida a role `internal_alfamed`.
3. Frontend redireciona para `/session`.
4. `GET /session/units` → lista unidades disponíveis e a unidade/vínculo atuais.
5. `POST /session/select-unit` com `{ "unitId": "uuid" }`:
  - valida acesso via `professional_units`;
  - define cookies `selectedUnitId` e `selectedProfessionalUnitId`.
6. Demais chamadas à API enviam os cookies automaticamente (não é necessário header de unidade).

### Login Service Desk (admin interno)

Área interna para equipe Alfamed com role `internal_alfamed`.

**Frontend** (`/admin/login`):

```typescript
auth.signIn.email({
  email,
  password,
  callbackURL: `${origin}/admin/unidades`, // path contém /admin/
})
```

**API** — no mesmo hook `before` do sign-in:

- Se o e-mail/senha pertencerem a um usuário ativo com profissional ativo, o login é aceito.
- Se o callback incluir `/admin/`, o usuário também precisa possuir a role `internal_alfamed` no vínculo profissional-unidade.
- O logout (`POST /auth/sign-out`) expira `selectedUnitId` e `selectedProfessionalUnitId`.

Service Desk **não** passa por seleção de unidade; rotas `/admin/*` não dependem de `selectedUnitId`.

### Proteção de rotas admin (`/admin/units`)

| Rotas | Validação |
|-------|-----------|
| `GET /admin/units`, `POST /admin/units` | `auth: true` (sessão) |
| `GET /admin/units/:id`, `PATCH /admin/units/:id`, `GET /admin/units/:id/professionals`, `POST /admin/units/:id/professionals` | `auth: true` + `resolveAdminAccess` (role `internal_alfamed`) |

`resolveAdminAccess`: consulta `professionals` → `professional_unit_roles` → `roles.key === "internal_alfamed"`.

Rotas `/admin/upm/*`: `auth: true` (gestão de usuários internos UPM).

### Endpoints de sessão

- `GET /session/units` — lista unidades do profissional + cookies atuais
- `POST /session/select-unit` — seleciona unidade e grava cookies

### Padrões de validação nas rotas

| Camada | Mecanismo | Quando |
|--------|-----------|--------|
| Sessão | macro `auth: true` (`better-auth.ts`) | Maioria das rotas de domínio |
| Unidade ativa | `getUnitIdFromRequest(request)` | Professionals, professional-units, units, etc. |
| Acesso à unidade | `assertUserHasUnitAccess` / `createHasUserAccessToUnitChecker` | Services (regra no banco) |
| Admin interno | `resolveAdminAccess` | Operações sensíveis em `/admin/units/:id+` |
| Recurso próprio | comparação `userId` na rota | Ex.: `GET /users/:id` só para o próprio id |

Referências de plugins:

- `src/http/plugins/better-auth.ts` — macro `auth`
- `src/http/plugins/unit-context.ts` — cookies e seleção de unidade
- `src/http/plugins/unit-access.ts` — checker de unidade
- `src/config/session.ts` — `TRUSTED_ORIGINS` e expiração de sessão
- `src/http/plugins/clinic-context-middleware.ts` — middleware opcional (derive/guard)

## Headers e cookies importantes

**Requisições autenticadas (browser / cliente com cookies):**

- `Cookie` — sessão Better Auth + `selectedUnitId` + `selectedProfessionalUnitId` (após seleção de unidade)
- `Content-Type: application/json` — quando houver body

**CORS:** `credentials: true`; origens em `TRUSTED_ORIGINS` (`src/config/session.ts`).

Não utilize `x-unit-id` — não é lido pelo código atual.

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
- Professional Units
- Patients
- Roles
- Session Management
- Better Auth
- Admin

## Rotas por módulo (resumo)

System:

- GET /
- GET /health

Auth:

- POST /auth/register
- POST /auth/sign-in/email
- POST /auth/sign-out
- POST /auth/forgot-password
- GET /auth/validate-reset-token/:token
- POST /auth/reset-password

Session Management:

- GET /session/units
- POST /session/select-unit

Users:

- GET /users/:id

Patients:

- POST /patients
- GET /patients/:patientId

Roles:

- GET /roles

Professionals:

- POST /professionals
- GET /professionals/professional-unit/roles
- POST /professionals/link-user
- GET /professionals
- GET /professionals/:id
- PATCH /professionals/:id

Professional Units:

- POST /professional-units
- POST /professional-units/full-create
- GET /professional-units/list-professional-unit-full-data-by-unit/:unitId
- GET /professional-units/professional-unit-full-data/:professionalUnitId
- GET /professional-units/:professionalUnitId
- PATCH /professional-units/profile-update
- PATCH /professional-units/full-update

Units:

- POST /units
- GET /units/by-user
- GET /units/:id
- PATCH /units/:id

<!-- Specialties and Appointments modules removed from this project -->

Admin / Service Desk (login com `callbackURL` `/admin/` + role `internal_alfamed`; detalhe por id exige `resolveAdminAccess`):

- GET /admin/units
- POST /admin/units
- GET /admin/units/:id
- PATCH /admin/units/:id
- GET /admin/units/:id/professionals
- POST /admin/units/:id/professionals
- GET /admin/upm/users
- POST /admin/upm/users
- PATCH /admin/upm/users/:professionalUnitId

Auth — reset de senha (sem sessão):

- POST /auth/forgot-password
- GET /auth/validate-reset-token/:token
- POST /auth/reset-password

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