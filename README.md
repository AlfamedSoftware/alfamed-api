# Alfamed API

Backend do Alfamed, uma API SaaS para gestão clínica e hospitalar.

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
- O contexto de clínica é selecionado via endpoints de sessão.
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

Sessão de clínica:

- GET /session/clinics
- POST /session/select-clinic
- POST /session/switch-clinic

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

Admin (acesso interno por e-mail @alfamed.com):

- GET /admin/units
- POST /admin/units
- GET /admin/units/:id
- PATCH /admin/units/:id
- DELETE /admin/units/:id
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