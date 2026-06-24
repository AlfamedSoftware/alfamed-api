# Regras de Negócio — Usuários, Pacientes, Profissionais e Vínculos de Unidade

**Sistema:** Alfamed API  
**Módulos:** Users · Patients · Professionals · Professional Units  
**Data:** Junho/2026  

---

## 1. Modelo de Dados e Relacionamentos

O sistema separa **identidade** de **papel clínico**. Todo acesso começa por um `user`, que pode exercer simultaneamente os papéis de paciente e profissional.

```
users
 ├── patients          (1 user → 0 ou 1 patient)
 └── professionals     (1 user → 0 ou 1 professional)
       └── professional_units   (1 professional → N vínculos com unidades)
             └── professional_unit_roles  (1 vínculo → 1 role obrigatório)
```

| Entidade | Descrição |
|---|---|
| `users` | Dados pessoais e de acesso (nome, e-mail, CPF, telefone, nascimento, sexo) |
| `patients` | Papel de paciente de um usuário. Único por `userId` |
| `professionals` | Papel de profissional de um usuário. Único por `userId` |
| `professional_units` | Vínculo de um profissional com uma unidade. Único por `professionalId + unitId` |
| `professional_unit_roles` | Role do profissional dentro de um vínculo. **Sempre obrigatório** |

> Um mesmo usuário pode ser **paciente e profissional ao mesmo tempo**. Os cadastros são independentes mas compartilham os dados do `user`.

---

## 2. Contexto de Unidade

Rotas do módulo de **profissionais** e **vínculos de unidade** exigem que uma unidade esteja selecionada na requisição (via cabeçalho de contexto). Sem esse contexto, a requisição é rejeitada com HTTP 400 antes de qualquer lógica de negócio.

**Resposta de erro (HTTP 400):**
```json
{ "message": "Selecione uma unidade para continuar" }
```

Além disso, o sistema verifica se o usuário autenticado **tem acesso à unidade informada**. Caso não tenha, a operação é bloqueada com HTTP 403.

---

## 3. Módulo: Users

### 3.1 `GET /users/:id` — Buscar perfil do usuário

Retorna os dados do usuário autenticado. O sistema impõe que o `id` informado na rota seja **obrigatoriamente o do próprio usuário autenticado** — nenhum usuário pode consultar o perfil de outro.

**Regras:**
- `:id` deve ser igual ao `userId` da sessão → caso contrário, HTTP 403
- Usuário não encontrado → HTTP 404

| Código | Situação |
|---|---|
| `200` | Perfil retornado |
| `401` | Não autenticado |
| `403` | Tentativa de acessar perfil de outro usuário |
| `404` | Usuário não encontrado |

---

## 4. Módulo: Patients

> **Consumo por plataforma:** As rotas `POST` e `PATCH` deste módulo são **exclusivas do aplicativo mobile**. O painel web não realiza criação ou atualização de pacientes diretamente por estas rotas — esse fluxo é gerenciado pelo módulo de Professional Units (`/professional-units/full-create` e `/professional-units/full-update`).

### 4.1 `POST /patients/full-create` — Criação completa de paciente *(Mobile)*

Cria em uma **única transação**: `user`, `account` (credenciais de acesso) e `patient`. Não exige autenticação — é usado no fluxo de auto-cadastro do paciente pelo app mobile.

**Validações:**
- E-mail já cadastrado → HTTP 409 `"E-mail já cadastrado"`
- CPF já cadastrado → HTTP 409 `"CPF já cadastrado"`

| Código | Situação |
|---|---|
| `201` | Usuário e paciente criados |
| `409` | E-mail ou CPF duplicado |
| `500` | Erro interno |

---

### 4.2 `POST /patients/` — Criar paciente para usuário existente *(Mobile)*

Cria o registro de `patient` vinculado a um `userId` já existente. Requer autenticação. Usado no mobile quando o usuário já tem conta mas ainda não possui o papel de paciente.

**Validação:**
- Já existe um `patient` para o `userId` informado → HTTP 409

| Código | Situação |
|---|---|
| `201` | Paciente criado |
| `401` | Não autenticado |
| `409` | Paciente já existe para este usuário |
| `500` | Erro interno |

---

### 4.3 `GET /patients/` — Listar pacientes

Retorna lista simplificada de todos os pacientes com dados básicos do usuário vinculado (`name`, `email`, `cpf`, `phone`). Requer autenticação.

---

### 4.4 `GET /patients/:patientId` — Buscar paciente por ID

Retorna os dados de um paciente. O sistema valida que o `userId` do paciente encontrado corresponde ao usuário autenticado — **um paciente não pode acessar dados de outro paciente**.

**Regras:**
- Paciente não encontrado → HTTP 404
- `patient.userId` ≠ `userId` da sessão → HTTP 403

| Código | Situação |
|---|---|
| `200` | Dados retornados |
| `401` | Não autenticado |
| `403` | Tentativa de acessar dados de outro paciente |
| `404` | Paciente não encontrado |

---

### 4.5 `GET /patients/patient-full-data-by-user/:userId` — Dados completos por userId

Retorna dados completos do paciente (usuário + paciente) filtrando pelo `userId`. O acesso é restrito ao próprio usuário autenticado.

**Regras:**
- `:userId` deve ser igual ao `userId` da sessão → caso contrário, HTTP 403
- Paciente não encontrado → HTTP 404
- Filtro opcional `?isActive=true/false` para filtrar pelo status do paciente

---

### 4.6 `GET /patients/patient-full-data-by-user-cpf/:cpf` — Dados completos por CPF

Retorna os dados completos do paciente cujo usuário vinculado possui o CPF informado. Requer autenticação. Não restringe ao próprio usuário — qualquer usuário autenticado pode buscar por CPF.

---

### 4.7 `PATCH /patients/full-update` — Atualização completa de paciente *(Mobile)*

Atualiza dados do `user` e do `patient` simultaneamente. Exclusivo do mobile — permite que o próprio paciente edite seu perfil pelo app. Apenas o próprio usuário pode atualizar seus dados (`userId` no body deve coincidir com o `userId` da sessão).

**Campos suportados:**
- `user`: `name`, `socialName`, `email`, `cpf`, `phone`, `sex`, `birthdate`, `password`
- `patient`: `patientStatus` (isActive)

**Regras:**
- `userId` do body ≠ `userId` da sessão → HTTP 403
- E-mail novo já cadastrado para outro usuário → HTTP 409
- CPF novo já cadastrado para outro usuário → HTTP 409
- Paciente não encontrado → HTTP 404
- **Apenas campos alterados são persistidos**
- E-mail é normalizado para letras minúsculas; CPF e nome são trimados

| Código | Situação |
|---|---|
| `200` | Dados atualizados |
| `401` | Não autenticado |
| `403` | Tentativa de atualizar dados de outro usuário |
| `404` | Paciente não encontrado |
| `409` | E-mail ou CPF duplicado |

---

## 5. Módulo: Professionals

> Todas as rotas exigem autenticação e contexto de unidade selecionada.

### 5.1 `POST /professionals/` — Criar profissional

Cria um registro de `professional` para o **usuário autenticado** e o vincula automaticamente à unidade do contexto, gerando também um `professional_unit`.

**Regras:**
- Usuário deve ter acesso à unidade do contexto → caso contrário, HTTP 403
- Já existe um `professional` para este `userId` → HTTP 409

| Código | Situação |
|---|---|
| `201` | Profissional e vínculo criados |
| `400` | Unidade não selecionada |
| `401` | Não autenticado |
| `403` | Sem acesso à unidade |
| `409` | Profissional já existe para este usuário |

---

### 5.2 `GET /professionals/` — Listar profissionais da unidade

Retorna todos os profissionais vinculados à unidade do contexto.

---

### 5.3 `GET /professionals/professional-by-user-cpf` — Buscar por CPF

Busca um usuário pelo CPF e retorna os IDs relevantes para o fluxo de vinculação: `userId`, `professionalId`, `patientId` e `professionalUnitId`. Retorna objeto vazio `{}` caso o CPF não seja encontrado — **sem lançar 404**. Isso permite que o frontend verifique a existência antes de iniciar qualquer criação.

---

### 5.4 `GET /professionals/:id` — Buscar profissional por ID

Verifica que o profissional pertence à unidade do contexto antes de retornar os dados.

**Regra:** profissional que não pertence à unidade → HTTP 404.

---

### 5.5 `PATCH /professionals/:id` — Atualizar profissional

Atualiza dados do profissional. Verifica pertencimento à unidade antes de permitir a atualização.

---

## 6. Módulo: Professional Units

> Todas as rotas exigem autenticação. **Todo vínculo `professional_unit` deve ter um `roleId` obrigatório** — não é possível criar um vínculo sem definir o cargo do profissional na unidade.

### 6.1 `POST /professional-units/` — Criar vínculo simples

Cria um `professional_unit` vinculando um profissional existente a uma unidade, junto com seu `professional_unit_role`.

**Payload:**

| Campo | Obrigatório | Descrição |
|---|---|---|
| `professionalId` | Sim | ID do profissional |
| `unitId` | Sim | ID da unidade |
| `roleId` | **Sim** | Cargo do profissional na unidade |
| `isActive` | Não | Padrão `true` |

**Regras:**
- Usuário deve ter acesso à unidade informada → HTTP 403
- `professionalId` não existe → HTTP 404
- `roleId` não existe → HTTP 404
- Já existe um vínculo `professionalId + unitId` → HTTP 409

| Código | Situação |
|---|---|
| `201` | Vínculo e role criados |
| `401` | Não autenticado |
| `403` | Sem acesso à unidade |
| `404` | Profissional ou role não encontrado |
| `409` | Vínculo já existe |

---

### 6.2 `POST /professional-units/create-by-user-cpf` — Criar vínculo por CPF

Busca o usuário pelo CPF e cria o vínculo `professional_unit` com seu role. Dependendo dos flags `professionalExists` e `patientExists`, pode **criar professional e/ou patient** automaticamente se ainda não existirem.

**Payload:**

| Campo | Obrigatório | Descrição |
|---|---|---|
| `cpf` | Sim | CPF do usuário |
| `roleId` | **Sim** | Cargo do profissional na unidade |
| `professionalExists` | Sim | Flag: indica se o `professional` já existe |
| `patientExists` | Sim | Flag: indica se o `patient` já existe |
| `isActive` | Não | Padrão `true` |

**Fluxo:**
1. Valida acesso à unidade do contexto
2. Busca usuário pelo CPF → não encontrado → HTTP 404
3. Se `patientExists = false`: verifica e cria `patient` se necessário
4. Se `professionalExists = false`: verifica e cria `professional` se necessário
5. Verifica se já existe o vínculo → HTTP 409 se sim
6. Valida existência do `roleId` → HTTP 404 se não existir
7. Cria `professional_unit` e `professional_unit_role`

| Código | Situação |
|---|---|
| `201` | Vínculo e role criados |
| `400` | Unidade não selecionada |
| `401` | Não autenticado |
| `403` | Sem acesso à unidade |
| `404` | Usuário ou role não encontrado |
| `409` | Vínculo já existe |

---

### 6.3 `POST /professional-units/full-create` — Criação completa de profissional

Cria em uma **única transação**: `user`, `account`, `professional`, `patient`, `professional_unit` e `professional_unit_role`. É o fluxo principal do **painel web** para cadastrar um novo profissional que ainda não existe no sistema.

**Validações:**
- Usuário deve ter acesso à unidade do contexto
- E-mail já cadastrado → HTTP 409
- CPF já cadastrado → HTTP 409
- `roleId` não encontrado → HTTP 404

| Código | Situação |
|---|---|
| `201` | Todos os registros criados |
| `400` | Unidade não selecionada |
| `401` | Não autenticado |
| `403` | Sem acesso à unidade |
| `404` | Role não encontrado |
| `409` | E-mail ou CPF duplicado |

---

### 6.4 `PATCH /professional-units/profile-update` — Atualização de perfil

Atualiza dados do `user` e do `professional` (sem tocar em status de vínculo, role ou paciente).

**Campos suportados:**
- `user`: `name`, `socialName`, `email`, `cpf`, `phone`, `sex`, `birthdate`, `password`
- `professional`: `crm` (montado a partir de `crmState` + `crmNumber`)

**Regras:**
- Usuário deve ter acesso à unidade do contexto
- E-mail novo já cadastrado para outro usuário → HTTP 409
- CPF novo já cadastrado para outro usuário → HTTP 409
- CRM é concatenado: `crmState.toUpperCase() + crmNumber` (ex: `SP12345`)
- **Apenas campos efetivamente alterados são persistidos**
- Senha é hasheada com bcrypt (custo 12) antes de salvar

| Código | Situação |
|---|---|
| `200` | Perfil atualizado |
| `400` | Unidade não selecionada |
| `401` | Não autenticado |
| `403` | Sem acesso à unidade |
| `404` | Vínculo não encontrado |
| `409` | E-mail ou CPF duplicado |

---

### 6.5 `PATCH /professional-units/full-update` — Atualização completa

Atualiza simultaneamente: `user`, `professional`, `professional_unit` (status ativo), `professional_unit_role` (cargo) e `patient` (status ativo). É o endpoint administrativo completo do **painel web** para gestão do profissional na unidade.

**Campos adicionais em relação ao profile-update:**
- `professionalUnitStatus` → `professional_unit.isActive`
- `roleId` → `professional_unit_role.roleId`
- `patientStatus` → `patient.isActive`

**Regras:**
- Usuário deve ter acesso à unidade do contexto
- E-mail e CPF únicos (mesmas regras do profile-update)
- `roleId` novo deve existir na tabela de roles → caso contrário, HTTP 404
- **Apenas campos efetivamente alterados geram updates**

| Código | Situação |
|---|---|
| `200` | Dados atualizados |
| `400` | Unidade não selecionada |
| `401` | Não autenticado |
| `403` | Sem acesso à unidade |
| `404` | Vínculo ou role não encontrado |
| `409` | E-mail ou CPF duplicado |

---

## 7. Regras Transversais

### 7.1 Consumo por Plataforma

| Rota | Web (painel) | Mobile (app) |
|---|---|---|
| `POST /patients/full-create` | — | ✓ Auto-cadastro |
| `POST /patients/` | — | ✓ |
| `PATCH /patients/full-update` | — | ✓ Edição de perfil próprio |
| `POST /professional-units/full-create` | ✓ | — |
| `PATCH /professional-units/full-update` | ✓ | — |
| `PATCH /professional-units/profile-update` | ✓ | — |
| `GET /patients/*` | ✓ | ✓ |
| `GET /professionals/*` | ✓ | — |
| `GET /professional-units/*` | ✓ | — |

### 7.2 Role Obrigatório em Todo Vínculo

Todo `professional_unit` deve ter um `professional_unit_role` associado. O `roleId` é obrigatório em todas as rotas de criação de vínculo (`POST /`, `create-by-user-cpf`, `full-create`). Não existe vínculo de profissional com unidade sem cargo definido.

### 7.3 Unicidade Global de E-mail e CPF

E-mail e CPF são únicos na tabela `users`. Qualquer tentativa de cadastrar ou atualizar com um valor já existente em **outro** usuário resulta em HTTP 409. A verificação sempre exclui o próprio usuário (`id ≠ userId`).

### 7.4 Atualização Incremental (Diff)

Nos endpoints de atualização, o sistema **compara o valor enviado com o valor atual** e só persiste se houver diferença real. Isso evita writes desnecessários e preserva o `updatedAt` apenas quando há mudança.

### 7.5 Normalização de Dados

| Campo | Normalização aplicada |
|---|---|
| `email` | `.trim().toLowerCase()` |
| `cpf` | `.trim()` |
| `name` | `.trim()` |
| `phone` | `.trim()` |
| `crmState` | `.trim().toUpperCase()` |
| `crmNumber` | `.trim()` |
| `password` | hasheada com bcrypt custo 12 |

### 7.6 Controle de Acesso por Unidade

Operações sobre profissionais e vínculos sempre validam se o usuário autenticado pertence à unidade informada. Esse controle é centralizado na função `assertUserHasUnitAccess` e aplicado **antes de qualquer lógica de negócio**.
