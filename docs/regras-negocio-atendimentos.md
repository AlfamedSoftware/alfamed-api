# Regras de Negócio — Atendimentos

**Sistema:** Alfamed API  
**Módulo:** Attendiments  
**Data:** Junho/2026  

---

## 1. Visão Geral

O módulo de atendimentos gerencia o ciclo de vida de um agendamento (`appointment`) após sua criação. Cada transição de status gera um registro em `appointment_logs`, permitindo rastrear todo o histórico do atendimento. As operações disponíveis são: iniciar, finalizar, registrar falta e cancelar.

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

---

## 3. Rotas

### 3.1 Listar Agendamentos por Especialidade

**`GET /attendiments/list-appointments-by-specialty`**

Retorna todos os agendamentos ativos (status `1` ou `2`) de uma data, agrupados por especialidade.

**Query params:**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `date` | String (YYYY-MM-DD) | Sim | Data dos agendamentos |
| `professionalUnitId` | UUID | Sim | Vínculo profissional/unidade do usuário logado |

**Tabela de respostas:**

| Código | Situação |
|---|---|
| `200 OK` | Lista retornada com sucesso |
| `500 Internal Server Error` | Erro inesperado no servidor |

---

### 3.2 Dados Completos do Agendamento

**`GET /attendiments/attendiment-full-data/:appointmentId`**

Retorna todos os dados de um agendamento em um único payload estruturado, consolidando informações de diversas tabelas.

**Path params:**

| Campo | Tipo | Descrição |
|---|---|---|
| `appointmentId` | UUID | ID do agendamento |

**Estrutura da resposta (200):**

```json
{
  "id": "uuid",
  "patientId": "uuid",
  "professionalUnitId": "uuid",
  "scheduleSlotId": "uuid",
  "startAt": "datetime | null",
  "endAt": "datetime | null",
  "diagnostics": "string | null",
  "evolution": "string | null",
  "clinicNotes": "string | null",
  "statusId": "uuid",
  "statusCode": 1,
  "statusDescription": "Agendado",
  "isActive": true,
  "users": { "id", "name", "socialName", "cpf", "birthdate", "phone", "email", "sex", "image", "isActive" },
  "schedules": { "id", "date", "isActive" },
  "schedules_slots": { "id", "startTime", "endTime", "isActive" },
  "specialties": { "id", "name", "isActive" },
  "procedures": { "id", "type", "description", "observation", "code", "price", "isActive" },
  "appointment_status": { "id", "code", "description", "isActive" }
}
```

**Tabela de respostas:**

| Código | Situação |
|---|---|
| `200 OK` | Dados retornados com sucesso |
| `404 Not Found` | Agendamento não encontrado |
| `500 Internal Server Error` | Erro inesperado no servidor |

---

### 3.3 Iniciar Atendimento

**`PATCH /attendiments/:id/iniciar`**

Marca o início efetivo do atendimento.

**Efeitos:**

| Campo | Valor |
|---|---|
| `appointments.statusId` | UUID do status code `2` (Atendimento iniciado) |
| `appointments.startAt` | Data/hora atual |
| `appointment_logs` | Inserido com `oldStatusId` → `newStatusId` (code 2) |

**Tabela de respostas:**

| Código | Situação |
|---|---|
| `200 OK` | `{ "message": "Atendimento iniciado com sucesso" }` |
| `404 Not Found` | Agendamento não encontrado |
| `500 Internal Server Error` | Erro inesperado no servidor |

---

### 3.4 Finalizar Atendimento

**`PATCH /attendiments/:id/finalizar`**

Registra a conclusão do atendimento com dados clínicos.

**Body (opcional):**

| Campo | Tipo | Descrição |
|---|---|---|
| `diagnostics` | String \| null | Diagnóstico registrado pelo profissional |
| `clinicNotes` | String \| null | Notas clínicas do atendimento |

**Efeitos:**

| Campo | Valor |
|---|---|
| `appointments.statusId` | UUID do status code `3` (Atendimento finalizado) |
| `appointments.endAt` | Data/hora atual |
| `appointments.diagnostics` | Valor enviado no body |
| `appointments.clinicNotes` | Valor enviado no body |
| `appointment_logs` | Inserido com `oldStatusId` → `newStatusId` (code 3) |

> **Pendente:** Gravação dos procedures do atendimento (a implementar).

**Tabela de respostas:**

| Código | Situação |
|---|---|
| `200 OK` | `{ "message": "Atendimento finalizado com sucesso" }` |
| `404 Not Found` | Agendamento não encontrado |
| `500 Internal Server Error` | Erro inesperado no servidor |

---

### 3.5 Registrar Falta

**`PATCH /attendiments/:id/falta`**

Registra a ausência do paciente. A vaga **não é devolvida** à agenda, pois o horário foi consumido.

**Efeitos:**

| Campo | Valor |
|---|---|
| `appointments.statusId` | UUID do status code `4` (Faltou ao atendimento) |
| `appointments.startAt` | Data/hora atual |
| `appointments.endAt` | Data/hora atual |
| `appointment_logs` | Inserido com `oldStatusId` → `newStatusId` (code 4) |
| `schedule_slots.isAvailable` | Inalterado |
| `schedules.emptySlots / allocatedSlots` | Inalterados |

**Tabela de respostas:**

| Código | Situação |
|---|---|
| `200 OK` | `{ "message": "Falta registrada com sucesso" }` |
| `404 Not Found` | Agendamento não encontrado |
| `500 Internal Server Error` | Erro inesperado no servidor |

---

### 3.6 Cancelar Atendimento

**`PATCH /attendiments/:id/cancelar`**

Cancela o agendamento e devolve a vaga à agenda para que possa ser reutilizada.

**Efeitos:**

| Campo | Valor |
|---|---|
| `appointments.statusId` | UUID do status code `5` (Cancelado) |
| `appointments.startAt` | Data/hora atual |
| `appointments.endAt` | Data/hora atual |
| `appointments.isActive` | `false` |
| `appointment_logs` | Inserido com `oldStatusId` → `newStatusId` (code 5) |
| `schedule_slots.isAvailable` | `true` (vaga liberada) |
| `schedules.emptySlots` | `emptySlots + 1` |
| `schedules.allocatedSlots` | `allocatedSlots - 1` |

**Tabela de respostas:**

| Código | Situação |
|---|---|
| `200 OK` | `{ "message": "Atendimento cancelado com sucesso" }` |
| `404 Not Found` | Agendamento não encontrado |
| `500 Internal Server Error` | Erro inesperado no servidor |

---

## 4. Log de Histórico (appointment_logs)

Toda transição de status gera automaticamente um registro em `appointment_logs`:

| Campo | Valor |
|---|---|
| `appointmentId` | ID do agendamento |
| `oldStatusId` | UUID do status anterior |
| `newStatusId` | UUID do novo status |
| `changedBy` | `userId` do profissional (resolvido via `professionalUnit → professional → user`) |
| `observation` | `null` |

---

## 5. Fluxo de Ciclo de Vida

```
[1] Agendado
        │
        ▼
[2] Atendimento iniciado  ──────────────────────────┐
        │                                            │
        ▼                                            ▼
[3] Atendimento finalizado              [4] Faltou ao atendimento
                                        [5] Cancelado
```

| Transição | Rota | Devolve vaga? |
|---|---|---|
| 1 → 2 | `PATCH /:id/iniciar` | Não |
| 2 → 3 | `PATCH /:id/finalizar` | Não |
| 1 → 4 | `PATCH /:id/falta` | Não |
| 1 → 5 | `PATCH /:id/cancelar` | Sim |
