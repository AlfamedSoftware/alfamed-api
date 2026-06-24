# Regras de Negócio — Criação de Agendamento (Appointment)

**Sistema:** Alfamed API  
**Módulo:** Appointments  
**Data:** Junho/2026  

---

## 1. Visão Geral

Um agendamento (`appointment`) representa a reserva de uma vaga individual (`schedule_slot`) por um paciente junto a um profissional. Ao criar um agendamento, o sistema registra a consulta, gera um log de histórico de status, marca a vaga como indisponível e atualiza os contadores da agenda vinculada.

---

## 2. Payload de Entrada

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `patientId` | UUID | Sim | Paciente que está sendo agendado |
| `professionalUnitId` | UUID | Sim | Vínculo do profissional com a unidade onde ocorrerá o atendimento |
| `scheduleSlotId` | UUID | Sim | Vaga específica da agenda sendo reservada |
| `statusId` | Inteiro | Sim | Código numérico do status inicial do agendamento (ver seção 3) |
| `startAt` | DateTime | Não | Data/hora de início efetivo do atendimento (preenchido após o atendimento iniciar) |
| `endAt` | DateTime | Não | Data/hora de término efetivo do atendimento |
| `diagnostics` | String | Não | Diagnóstico registrado pelo profissional |
| `evolution` | String | Não | Evolução clínica registrada pelo profissional |

---

## 3. Status do Agendamento

O campo `statusId` é enviado como um **código numérico** pelo frontend. O sistema resolve internamente o UUID correspondente na tabela `appointments_status`.

| Código | Descrição |
|---|---|
| `1` | Agendado |
| `2` | Atendimento iniciado |
| `3` | Atendimento finalizado |
| `4` | Faltou ao atendimento |
| `5` | Cancelado |
| `6` | Transferido |

> Na criação de um novo agendamento, o status padrão esperado é `1` (Agendado).

---

## 4. Validações de Negócio

### 4.1 Autenticação

A rota exige que o usuário esteja autenticado. Requisições sem token válido são rejeitadas imediatamente.

**Resposta de erro (HTTP 401):**
```json
{ "message": "Unauthorized" }
```

---

### 4.2 Disponibilidade da Vaga

Antes de criar o agendamento, o sistema verifica em tempo real se a vaga (`schedule_slot`) ainda está disponível. Essa verificação é necessária para evitar condições de corrida onde dois usuários tentam reservar a mesma vaga simultaneamente.

**Regra:** `schedule_slots.isAvailable` deve ser `true`.

**Resposta de erro (HTTP 409):**
```json
{ "message": "Essa vaga não está mais disponivel para o agendamento" }
```

---

### 4.3 Consulta no Passado

O sistema impede o agendamento de uma vaga cuja data/hora de início já passou.

**Regra:** `slotDatetime > agora` — caso contrário, rejeitar.

**Lógica:** O datetime do slot é montado combinando `schedules.date` + `schedule_slots.startTime`. Se o horário do slot for anterior ao momento atual, o agendamento é bloqueado.

**Resposta de erro (HTTP 410):**
```json
{ "message": "Não é possível agendar uma consulta que já passou" }
```

---

### 4.4 Antecedência Mínima

O sistema impede o agendamento quando faltam menos de 30 minutos para o horário de início da vaga.

**Regra:** `agora < slotDatetime - 30 minutos` — caso contrário, rejeitar.

**Lógica:** Verificado após a checagem de data no passado. Se a diferença entre o horário do slot e o momento atual for menor que 30 minutos (mas o slot ainda não passou), o agendamento é bloqueado.

**Resposta de erro (HTTP 422):**
```json
{ "message": "Não é possível agendar com menos de 30 minutos de antecedência" }
```

---

### 4.5 Proibição de Auto-Agendamento

O sistema impede que um profissional se auto-agende. Como médicos e pacientes compartilham a mesma tabela de usuários (`users`), um profissional não pode criar um agendamento onde ele próprio é o paciente.

**Regra:** O `userId` do paciente deve ser diferente do `userId` do profissional vinculado ao `professionalUnitId`.

**Lógica de validação:**
1. Buscar o `userId` do paciente através do `patientId`
2. Buscar o `userId` do profissional através do `professionalUnitId` → `professional` → `user`
3. Comparar os dois `userId`s
4. Se forem iguais, rejeitar o agendamento

**Resposta de erro (HTTP 404):**
```json
{ "message": "Profissional não pode se auto agendar" }
```

---

## 5. Efeitos Colaterais da Criação

Ao criar um agendamento com sucesso, o sistema executa **quatro operações em sequência**:

### 5.1 Criação do Registro de Agendamento

Insere um novo registro na tabela `appointments` com `isActive = true`. O `statusId` numérico recebido é convertido para o UUID correspondente na tabela `appointments_status`.

### 5.2 Criação do Log de Histórico

Insere um registro em `appointment_logs` para rastrear a criação do agendamento:

| Campo | Valor |
|---|---|
| `appointmentId` | ID do agendamento recém-criado |
| `oldStatusId` | `null` (sem status anterior — é a criação inicial) |
| `newStatusId` | UUID do status fornecido |
| `changedBy` | `userId` do profissional resolvido via `professionalUnit → professional → user` |
| `observation` | `null` |

### 5.3 Bloqueio da Vaga

A vaga reservada tem sua disponibilidade marcada como `false`:

```
schedule_slots.isAvailable = false  (para o scheduleSlotId informado)
```

Isso impede que outros agendamentos sejam criados para a mesma vaga.

### 5.4 Atualização dos Contadores da Agenda

Os contadores da agenda (`schedule`) à qual a vaga pertence são atualizados:

```
schedules.emptySlots     = emptySlots - 1
schedules.allocatedSlots = allocatedSlots + 1
```

---

## 6. Fluxo Completo de Criação

```
Frontend envia payload
        │
        ▼
[1] Verificar autenticação
   └── Não autenticado? → HTTP 401
        │
        ▼
[2] Verificar disponibilidade da vaga (scheduleSlotId)
   └── isAvailable = false? → HTTP 409
        │
        ▼
[3] Verificar auto-agendamento
   └── userId paciente = userId profissional? → HTTP 404
        │
        ▼
[4] Verificar se a consulta já passou
   └── slotDatetime < agora? → HTTP 422
        │
        ▼
[5] Verificar antecedência mínima (30 minutos)
   └── agora >= slotDatetime - 30min? → HTTP 422
        │
        ▼
[6] Resolver statusId numérico → UUID em appointments_status
        │
        ▼
[7] Inserir registro em `appointments`
   └── isActive = true
        │
        ▼
[8] Inserir log em `appointment_logs`
   ├── oldStatusId = null
   ├── newStatusId = UUID do status
   └── changedBy = userId do profissional
        │
        ▼
[9] Marcar vaga como indisponível
   └── schedule_slots.isAvailable = false
        │
        ▼
[10] Atualizar contadores da agenda
   ├── schedules.emptySlots - 1
   └── schedules.allocatedSlots + 1
        │
        ▼
[11] Retornar agendamento criado → HTTP 201
```

---

## 7. Resposta de Sucesso (HTTP 201)

```json
{
  "id": "uuid",
  "patientId": "uuid",
  "professionalUnitId": "uuid",
  "scheduleSlotId": "uuid",
  "startAt": null,
  "endAt": null,
  "diagnostics": null,
  "evolution": null,
  "statusId": "uuid",
  "isActive": true,
  "createdAt": "2026-06-20T10:00:00.000Z",
  "updatedAt": "2026-06-20T10:00:00.000Z"
}
```

> **Atenção:** O campo `statusId` na resposta é o **UUID** do status, não o código numérico enviado no payload.

---

## 8. Tabela de Respostas HTTP

| Código | Situação |
|---|---|
| `201 Created` | Agendamento criado com sucesso |
| `401 Unauthorized` | Usuário não autenticado |
| `403 Forbidden` | Usuário não tem permissão para realizar esta operação |
| `404 Not Found` | Profissional tentando se auto-agendar |
| `409 Conflict` | A vaga já foi reservada por outro agendamento |
| `410 Gone` | Data/hora da consulta já passou |
| `422 Unprocessable Entity` | Faltam menos de 30 minutos para o horário do slot |
| `500 Internal Server Error` | Erro inesperado no servidor |
