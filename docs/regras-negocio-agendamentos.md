# Regras de Negócio — Agendamentos (Appointments)

**Sistema:** Alfamed API  
**Módulo:** Appointments  
**Data:** Junho/2026  

---

## 1. Visão Geral

O módulo de agendamentos gerencia a reserva de vagas (`schedule_slots`) por pacientes junto a profissionais de saúde. Um agendamento (`appointment`) nasce com status `1` (Agendado) e evolui ao longo do seu ciclo de vida via o módulo de atendimentos.

> Para as regras detalhadas de **criação** de um agendamento, consulte:  
> [`docs/regras-negocio-criacao-agendamento.md`](./regras-negocio-criacao-agendamento.md)

---

## 2. Status do Agendamento

| Código | Descrição |
|---|---|
| `1` | Agendado |
| `2` | Atendimento iniciado |
| `3` | Atendimento finalizado |
| `4` | Faltou ao atendimento |
| `5` | Cancelado |
| `6` | Transferido |

> O campo `statusCode` é sempre enviado como inteiro pelo frontend. O sistema resolve internamente o UUID correspondente na tabela `appointments_status`.

---

## 3. Rotas

### 3.1 Criar Agendamento

**`POST /appointments`**

Cria um novo agendamento reservando uma vaga para um paciente. Inclui validações de disponibilidade, antecedência mínima e proibição de auto-agendamento.

> Regras detalhadas em [`docs/regras-negocio-criacao-agendamento.md`](./regras-negocio-criacao-agendamento.md).

**Tabela de respostas:**

| Código | Situação |
|---|---|
| `201 Created` | Agendamento criado com sucesso |
| `401 Unauthorized` | Usuário não autenticado |
| `403 Forbidden` | Usuário não tem permissão |
| `404 Not Found` | Profissional tentando se auto-agendar |
| `409 Conflict` | Vaga já reservada por outro agendamento |
| `410 Gone` | Data/hora da consulta já passou |
| `422 Unprocessable Entity` | Menos de 30 minutos de antecedência |
| `500 Internal Server Error` | Erro inesperado no servidor |

---

### 3.2 Atualizar Agendamento

**`PATCH /appointments/:id`**

Atualiza campos de um agendamento existente. Permite alterar paciente, profissional, vaga, horários, diagnóstico, evolução, status e estado ativo. Somente agendamentos com `isActive = true` são atualizáveis.

**Path params:**

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | UUID | ID do agendamento a ser atualizado |

**Body (todos opcionais):**

| Campo | Tipo | Descrição |
|---|---|---|
| `patientId` | UUID | Novo paciente do agendamento |
| `professionalUnitId` | UUID | Novo vínculo profissional/unidade |
| `scheduleSlotId` | UUID | Nova vaga de agenda |
| `startAt` | DateTime \| null | Data/hora de início efetivo |
| `endAt` | DateTime \| null | Data/hora de término efetivo |
| `diagnostics` | String \| null | Diagnóstico registrado |
| `evolution` | String \| null | Evolução clínica registrada |
| `statusCode` | Inteiro | Código numérico do novo status |
| `isActive` | Boolean | Estado ativo do agendamento |

**Efeitos colaterais:**

Quando `statusCode` e `professionalUnitId` são fornecidos simultaneamente, é inserido um registro em `appointment_logs` rastreando a transição de status.

**Tabela de respostas:**

| Código | Situação |
|---|---|
| `200 OK` | Agendamento atualizado com sucesso |
| `401 Unauthorized` | Usuário não autenticado |
| `403 Forbidden` | Usuário não tem permissão |
| `500 Internal Server Error` | Erro inesperado no servidor |

---

### 3.3 Listar Próximos Agendamentos do Usuário

**`GET /appointments/list-next-appointments-by-user/:userId`**

Retorna todos os agendamentos pendentes (status `1` — Agendado) e ativos do paciente vinculado ao `userId` informado. Utilizado para exibir os próximos compromissos do usuário no aplicativo.

**Path params:**

| Campo | Tipo | Descrição |
|---|---|---|
| `userId` | UUID | ID do usuário (`users.id`) cujos agendamentos serão listados |

**Filtros aplicados internamente:**

| Critério | Valor |
|---|---|
| `patients.userId` | igual ao `userId` informado |
| `appointment_status.code` | `1` (Agendado) |
| `appointments.isActive` | `true` |

**Resposta de sucesso (HTTP 200):**

Array de objetos com dados completos do agendamento (`appointmentFullDataSchema`), incluindo informações do paciente (`users`), agenda (`schedules`), vaga (`schedules_slots`), especialidade (`specialties`), procedimento (`procedures`) e status (`appointment_status`).

**Tabela de respostas:**

| Código | Situação |
|---|---|
| `200 OK` | Lista retornada com sucesso (pode ser array vazio) |
| `401 Unauthorized` | Usuário não autenticado |
| `500 Internal Server Error` | Erro inesperado no servidor |

---

## 4. Modelo de Dados

### Agendamento (`appointments`)

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | UUID | Identificador único |
| `patientId` | UUID | Referência ao paciente |
| `professionalUnitId` | UUID | Referência ao vínculo profissional/unidade |
| `scheduleSlotId` | UUID | Referência à vaga reservada |
| `startAt` | DateTime \| null | Início efetivo do atendimento |
| `endAt` | DateTime \| null | Término efetivo do atendimento |
| `diagnostics` | String \| null | Diagnóstico registrado |
| `evolution` | String \| null | Evolução clínica |
| `clinicNotes` | String \| null | Notas clínicas internas |
| `statusId` | UUID | Referência ao status atual |
| `isActive` | Boolean | Se o agendamento está ativo |
| `createdAt` | DateTime | Data de criação |
| `updatedAt` | DateTime | Data da última atualização |
