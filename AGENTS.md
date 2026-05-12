# AGENTS.md

## Project: Alfamed API

This repository contains the backend API for **Alfamed**, a SaaS platform for **clinical and hospital management**.

Alfamed allows clinics and hospitals to manage:

- patients
- healthcare professionals
- units (clinics/hospital branches)

The core functionality of the platform is **managing clinical entities and relationships between patients and healthcare professionals inside specific clinic units**.

The backend is built with:

* Bun runtime
* Elysia framework
* Drizzle ORM
* Better Auth
* Zod validation
* Modular architecture

This file defines strict rules that AI agents must follow when generating code.

---

# LANGUAGE RULE

AI agents MUST ALWAYS respond in **Portuguese (Brazil)**.

Even if prompts are written in English, responses must be written in Portuguese.

---

# CLARIFICATION RULE

Before implementing code, if any part of the task is ambiguous, the AI must:

1. Ask clarifying questions
2. Confirm assumptions with the developer
3. Avoid guessing behavior that is not clearly defined in the project

The AI should prioritize **correctness and alignment with the existing project** over generating code quickly.

---

# CRITICAL RULE

AI agents MUST ALWAYS follow the **existing project structure and patterns**.

NEVER introduce a new architecture, structure, folder organization, or naming pattern if a similar pattern already exists in the project.

When in doubt:

1. Look for an existing module
2. Copy the same structure
3. Follow the same naming conventions
4. Reuse existing patterns

The **users module and professionals module are the main reference implementations**.

All new modules must follow the same architecture used there.

---

# SaaS MULTI-TENANCY RULE (VERY IMPORTANT)

Alfamed is a **multi-tenant SaaS platform**.

Clinics and hospitals may have **multiple units (branches)**.

All domain data must be **scoped by unit**.

This means:

* A user from **Clinic A** must NEVER access data from **Clinic B**.
* Queries must always be filtered by the **unit context**.
* Cross-unit access must never be allowed.

Examples of domain entities that must respect this rule:

- professionals
- patients
- schedules
- medical records

If an entity belongs to a unit, all database queries must enforce that constraint.

---

# UNIT CONTEXT RULE

The current unit context is provided by:

```
x-unit-id
```

This header identifies the **clinic unit making the request**.

All operations must respect this unit scope.

Examples:

✔ Correct behavior:

User from Unit A lists professionals → only professionals from Unit A are returned.

❌ Incorrect behavior:

User from Unit A lists professionals → professionals from Unit B are returned.

---

# DATABASE ACCESS RULE FOR UNIT-SCOPED ENTITIES

When accessing entities related to units (professionals, patients, etc.), the repository must always:

* filter by unit
* validate unit ownership
* use join tables when necessary

Example from the professionals module:

professionals are linked to units through:

```
professional_units
```

Queries must ensure that the professional belongs to the requesting unit.

This pattern must be reused for other modules like schedules and patient assignments.

---

# PROJECT STRUCTURE

The project uses a **modular architecture** where each domain is isolated in a module.

Example:

src/

db/
schema/
migrations/

http/
plugins/

modules/
users/
users.repository.ts
users.service.ts
users.routes.ts
users.schemas.ts

tests/
e2e/
unit/

---

# MODULE ARCHITECTURE

Each module must follow the same layered structure.

Example:

modules/users

users.repository.ts
users.service.ts
users.routes.ts
users.schemas.ts

Never introduce additional layers unless they already exist elsewhere in the project.

---

# REFERENCE MODULES

The following modules are considered **architecture references**:

users
professionals

New modules must follow the same patterns implemented there.

---

# REPOSITORY LAYER

Repositories are responsible ONLY for database access.

Responsibilities:

* database queries
* using Drizzle ORM
* returning database results

Rules:

* No business logic
* No HTTP logic
* No validation logic

Example repository methods:

create
findById
list
update
delete

Repositories must import database schemas from:

```
src/db/schema
```

---

# SERVICE LAYER

Services contain **business logic**.

Responsibilities:

* orchestrate repository calls
* enforce domain rules
* validate unit ownership
* throw domain errors

Rules:

* Services must not access HTTP request or response
* Services must not contain database queries directly
* Services must only communicate with repositories

Example service methods:

createUser
getUserById
listUsers
updateUser
deleteUser

---

# ROUTES LAYER

Routes define HTTP endpoints using Elysia.

Responsibilities:

* define endpoints
* validate requests
* extract headers
* call services
* return responses

Rules:

* No database access
* No business logic
* Only call service methods

Typical endpoints:

GET /entities
GET /entities/:id
POST /entities
PATCH /entities/:id
DELETE /entities/:id

---

# OPENAPI DOCUMENTATION RULE

API documentation must be kept in sync with module routes.

Rules:

* Every route must define `detail.summary`, `detail.description`, and `detail.tags`
* Route descriptions must reflect real behavior (especially unit-scoped filters)
* Every new module must have a corresponding tag registered in the OpenAPI setup (`src/app.ts`)
* Better Auth docs and module docs must coexist in `/openapi` without losing module endpoints

Examples:

* users routes -> `Users` tag
* professionals routes -> `Professionals` tag

---

# SCHEMAS

All validation schemas must use Zod.

Schemas are responsible for:

* request validation
* response typing

Rules:

* Do not duplicate schemas unnecessarily
* Prefer reusing existing schemas

Example:

createUserSchema
updateUserSchema
userProfileSchema

---

# DATABASE

Database access uses Drizzle ORM.

All table schemas are located in:

```
src/db/schema
```

Repositories must use those schemas instead of hardcoded table names.

---

# AUTHENTICATION

Authentication uses Better Auth.

Auth plugins are located in:

```
src/http/plugins
```

Routes requiring authentication must use the existing auth plugin.

Never implement custom authentication logic if Better Auth already provides it.

---

# ERROR HANDLING

Business errors must be thrown inside services.

Routes should translate them into HTTP responses.

Standard status codes:

400 → validation error
401 → unauthorized
404 → entity not found
409 → conflict
500 → internal error

---

# TESTING

Tests are located in:

```
tests
```

Types of tests:

Unit tests
tests/unit

E2E tests
tests/e2e

Every new module must include E2E tests for:

* create
* list
* get by id
* update
* delete
* not found scenarios

Example:

users.routes.e2e.test.ts

Tests should follow the same pattern used in the users module.

---

# CREATING NEW MODULES

When creating a new module:

1. Look at the `users` module
2. Look at the `professionals` module
3. Copy the same structure
4. Follow the same naming pattern
5. Respect the **unit scoping rules**

Example module:

modules/<entity>

<entity>.repository.ts
<entity>.service.ts
<entity>.routes.ts
<entity>.schemas.ts

---

# NAMING CONVENTIONS

Repositories

<entity>.repository.ts

Services

<entity>.service.ts

Routes

<entity>.routes.ts

Schemas

<entity>.schemas.ts

---

# CODE QUALITY RULES

Always:

* use strict TypeScript
* avoid any
* use async/await
* keep functions small
* keep layers separated

Never:

* mix database logic with HTTP
* put business logic in routes
* access request objects in services
* create new architectural patterns

---

# AI AGENT BEHAVIOR

Before generating code, the AI must:

1. Inspect existing modules
2. Follow the same structure
3. Reuse patterns already present
4. Respect multi-tenant unit isolation
5. Avoid introducing new patterns

If a pattern already exists in the repository, ALWAYS prefer it instead of creating a new one.

Consistency across modules is more important than introducing new ideas.

---

# REUSABLE CODE RULE (IMPORTANT)

When a cross-module rule appears more than once, extract it into a shared utility and reuse it.

Examples of reusable rules:

- unit header parsing/validation
- unit ownership checks
- domain error mapping conventions

Prefer reusing existing shared helpers before creating new ones.
Do not duplicate the same validation flow across routes/services.

Current shared reference:

- src/http/plugins/unit-access.ts

---

# SHARED HELPERS FIRST RULE

Before creating any new helper for unit scope/auth validation, AI agents MUST:

1. Search existing helpers in `src/http/plugins`
2. Reuse existing helper functions when behavior is equivalent
3. Extend existing helpers when behavior is close
4. Create a new helper only when no current helper can be safely reused

If creating a new helper, explain in the PR/commit why existing helpers were insufficient.

---

# UNIT SCOPE REUSE RULE

For any unit-scoped domain (professionals, schedules, patients, etc.):

- Always validate x-unit-id using shared helper functions.
- Always validate user-to-unit ownership using shared helper functions.
- Never trust x-unit-id from request without ownership verification.
- Return 403 Forbidden when user does not belong to the selected unit.

---

# WRITE CONSISTENCY RULE

If a create/update flow needs to persist related records (e.g. main entity + N:N link),
perform it in a single database transaction.

Example:
- create professional
- create professional_units link

---

# ERROR STANDARDIZATION RULE

Services must throw domain errors with stable semantic messages/types.
Routes must map domain errors consistently to HTTP status codes.

Preferred mappings:
- Forbidden -> 403
- NotFound -> 404
- Conflict -> 409

---

# RECENT PROJECT UPDATES (MAY/2026)

The following project updates are now part of the current baseline and must be respected by AI agents:

1. Initial admin bootstrap seed was added at:

`src/scripts/seed-initial-admin.ts`

Current seed behavior:
- creates first admin user in `users`
- creates credential account in `accounts` with bcrypt hash
- creates linked professional in `professionals`
- validates `INITIAL_ADMIN_*` inputs via Zod
- enforces admin email domain `@alfamed.com`

2. New script was added in `package.json`:

`db:seed` -> `bun --env-file .env --bun src/scripts/seed-initial-admin.ts`

3. README was updated with bootstrap instructions for first admin creation using:

`bun run db:seed`

4. Environment file conventions were updated:
- `.env.example` now keeps only generic placeholders for the 3 core keys:
	- `BETTER_AUTH_SECRET`
	- `BETTER_AUTH_BASE_URL`
	- `DATABASE_URL`
- Initial admin variables (`INITIAL_ADMIN_*`) are expected in local/private env files (`.env` / `.env.local`) when running seed.

5. Repository ignore rules were updated:
- `.env.local` is now ignored in `.gitignore`.

Agents must preserve this bootstrap flow and avoid reintroducing sensitive real credentials into `.env.example`.
