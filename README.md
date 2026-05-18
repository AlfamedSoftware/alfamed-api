# Alfamed API

Backend do Alfamed, uma API SaaS para gestão clínica e hospitalar.

> **Agentes de IA:** leia também [`AGENTS.md`](./AGENTS.md) — regras de arquitetura, escopo por unidade (cookies) e Service Desk.

O projeto implementa autenticação, gestão de usuários e perfis clínicos, escopo por unidade, agenda e solicitações de atendimento, com arquitetura modular em TypeScript.

## Escopo atual

- Autenticação com Better Auth
- Gestão de sessão e seleção de clínica ativa
- Usuários
- Profissionais
- Pacientes
- Unidades
- Especialidades
- Agendamentos e solicitações
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

### Cookies de contexto (após `POST /session/select-clinic`)

| Cookie | Descrição |
|--------|-----------|
| `selectedClinicId` | UUID da unidade ativa (`units.id`) |
| `selectedProfessionalUnitId` | UUID do vínculo em `professional_units` |

Helpers: `src/http/plugins/clinic-context.ts` (`getClinicIdFromRequest`, `getProfessionalUnitIdFromRequest`).

Rotas de domínio clínico (ex.: `GET /professionals`, `POST /specialties`) leem `selectedClinicId`. Se ausente:

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

O seed cria:

- registro em users
- conta de login em accounts com senha hashada
- professional vinculado ao user

Regra do seed: o e-mail do admin inicial deve terminar com @alfamed.com.

## Autenticação e sessão

- Better Auth montado em `/auth` (sessão por **cookies**, `credentials: include` no frontend).
- Rota de conveniência: `POST /auth/register` (encaminha para sign-up com `cpf`, `phone`, `birthdate`).
- Senha: bcrypt com **12 rounds**.
- Sessão: expira em 24h; cache de cookie 5 min.

### Login clínico (fluxo padrão)

1. `POST /auth/sign-in/email` com e-mail e senha.
2. Hook `before` em `src/auth.ts` valida:
   - `users.isActive` e `professionals.isActive` (se existir profissional).
3. Frontend redireciona para `/session`.
4. `GET /session/clinics` → usuário escolhe unidade.
5. `POST /session/select-clinic` com `{ "clinicId": "uuid" }`:
   - valida acesso via `professional_units`;
   - define cookies `selectedClinicId` e `selectedProfessionalUnitId`.
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

- Se `callbackURL` contém `/admin/` **ou** o path da requisição contém `/admin/`:
  - o profissional do usuário deve possuir role `internal_alfamed` em `professional_unit_roles`;
  - caso contrário: `401` com mensagem *User lacks internal Alfamed role*.

**Frontend adicional:** `InternalProtectedRoute` exige e-mail terminando em `@alfamed.com`.

Service Desk **não** passa por seleção de clínica; rotas `/admin/*` não dependem de `selectedClinicId`.

### Proteção de rotas admin (`/admin/units`)

| Rotas | Validação |
|-------|-----------|
| `GET /admin/units`, `POST /admin/units` | Apenas `auth: true` (sessão) |
| `GET/PATCH/DELETE /admin/units/:id`, profissionais da unidade | `auth: true` + `resolveAdminAccess` (role `internal_alfamed`) |

`resolveAdminAccess`: consulta `professionals` → `professional_unit_roles` → `roles.key === "internal_alfamed"`.

Rotas `/admin/upm/*`: `auth: true` (gestão de usuários internos UPM).

### Endpoints de sessão de clínica

- `GET /session/clinics` — lista unidades do profissional + cookies atuais
- `POST /session/select-clinic` — seleciona unidade e grava cookies
- `POST /session/switch-clinic` — troca de unidade (mesma validação)

### Padrões de validação nas rotas

| Camada | Mecanismo | Quando |
|--------|-----------|--------|
| Sessão | macro `auth: true` (`better-auth.ts`) | Maioria das rotas de domínio |
| Clínica ativa | `getClinicIdFromRequest(request)` | Professionals, specialties, schedules (create), etc. |
| Acesso à unidade | `assertUserHasUnitAccess` / `hasUserAccessToUnitChecker` | Services (regra no banco) |
| Admin interno | `resolveAdminAccess` | Operações sensíveis em `/admin/units/:id+` |
| Recurso próprio | comparação `userId` na rota | Ex.: `GET /users/:id` só para o próprio id |

Referências de plugins:

- `src/http/plugins/better-auth.ts` — macro `auth`
- `src/http/plugins/clinic-context.ts` — cookies e listagem de clínicas
- `src/http/plugins/unit-access.ts` — `trustedOrigins`, checker de unidade
- `src/http/plugins/clinic-context-middleware.ts` — middleware opcional (derive/guard)

## Headers e cookies importantes

**Requisições autenticadas (browser / cliente com cookies):**

- `Cookie` — sessão Better Auth + `selectedClinicId` + `selectedProfessionalUnitId` (após seleção de clínica)
- `Content-Type: application/json` — quando houver body

**CORS:** `credentials: true`; origens em `trustedOrigins` (`unit-access.ts`).

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
- Patients
- Specialties
- Better Auth
- Appointments
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
- GET /patients/me

Professionals:

- POST /professionals
- GET /professionals/professional-unit/roles
- POST /professionals/link-user
- GET /professionals
- GET /professionals/:id
- PATCH /professionals/:id
- DELETE /professionals/:id

Units:

- POST /units
- GET /units/by-user
- GET /units/:id
- PATCH /units/:id
- DELETE /units/:id

Specialties:

- POST /specialties
- GET /specialties
- GET /specialties/:id
- PATCH /specialties/:id
- DELETE /specialties/:id
- POST /specialties/:id/professionals/:professionalId
- DELETE /specialties/:id/professionals/:professionalId
- GET /specialties/professionals/:professionalId

Appointments:

- POST /appointments/schedules
- PATCH /appointments/schedules/:id
- GET /appointments/availability
- POST /appointments/requests
- GET /appointments/requests/:id
- PATCH /appointments/requests/:id/confirm
- PATCH /appointments/requests/:id/reject
- PATCH /appointments/requests/:id/counter-propose
- PATCH /appointments/requests/:id/patient-accept
- PATCH /appointments/requests/:id/patient-reject

Admin / Service Desk (login com `callbackURL` `/admin/` + role `internal_alfamed`; detalhe por id exige `resolveAdminAccess`):

- GET /admin/units
- POST /admin/units
- GET /admin/units/:id
- PATCH /admin/units/:id
- DELETE /admin/units/:id
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