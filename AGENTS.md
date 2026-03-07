# AGENTS.md

## Project: Alfamed API

This repository contains the backend API for **Alfamed**, a clinical and hospital management system.

The backend is built with:

* Bun runtime
* Elysia framework
* Drizzle ORM
* Better Auth
* Zod validation
* Modular architecture

This file defines strict rules that AI agents must follow when generating code.

---

# CRITICAL RULE

AI agents MUST ALWAYS follow the **existing project structure and patterns**.

NEVER introduce a new architecture, structure, folder organization, or naming pattern if a similar pattern already exists in the project.

When in doubt:

1. Look for an existing module
2. Copy the same structure
3. Follow the same naming conventions
4. Reuse existing patterns

The **users module is the main reference implementation**.

All new modules must follow the same architecture used there.

---

# Project Structure

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

# Module Architecture

Each module must follow the same layered structure.

Example:

modules/users

users.repository.ts
users.service.ts
users.routes.ts
users.schemas.ts

Never introduce additional layers unless they already exist elsewhere in the project.

---

# Repository Layer

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

* create
* findById
* list
* update
* delete

Repositories must import database schemas from:

src/db/schema

---

# Service Layer

Services contain **business logic**.

Responsibilities:

* orchestrate repository calls
* enforce domain rules
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

# Routes Layer

Routes define HTTP endpoints using Elysia.

Responsibilities:

* define endpoints
* validate requests
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

# Schemas

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

# Database

Database access uses Drizzle ORM.

All table schemas are located in:

src/db/schema

Repositories must use those schemas instead of hardcoded table names.

---

# Authentication

Authentication uses Better Auth.

Auth plugins are located in:

src/http/plugins

Routes requiring authentication must use the existing auth plugin.

Never implement custom authentication logic if Better Auth already provides it.

---

# Error Handling

Business errors must be thrown inside services.

Routes should translate them into HTTP responses.

Standard status codes:

400 → validation error
401 → unauthorized
404 → entity not found
409 → conflict
500 → internal error

---

# Testing

Tests are located in:

src/tests

Types of tests:

Unit tests
src/tests/unit

E2E tests
src/tests/e2e

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

# Creating New Modules

When creating a new module:

1. Look at the `users` module
2. Copy the same structure
3. Follow the same naming pattern

Example module:

modules/professionals

professionals.repository.ts
professionals.service.ts
professionals.routes.ts
professionals.schemas.ts

---

# Naming Conventions

Repositories

<entity>.repository.ts

Services

<entity>.service.ts

Routes

<entity>.routes.ts

Schemas

<entity>.schemas.ts

---

# Code Quality Rules

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

# AI Agent Behavior

Before generating code, the AI must:

1. Inspect existing modules
2. Follow the same structure
3. Reuse patterns already present
4. Avoid introducing new patterns

If a pattern already exists in the repository, ALWAYS prefer it instead of creating a new one.

Consistency across modules is more important than introducing new ideas.
