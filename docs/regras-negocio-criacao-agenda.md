# Regras de Negócio — Criação de Agenda (Schedule)

**Sistema:** Alfamed API  
**Módulo:** Schedules  
**Data:** Junho/2026  

---

## 1. Visão Geral

A criação de uma agenda (`schedule`) representa a disponibilidade de um profissional para atender pacientes em uma data, horário e especialidade específicos. Ao criar uma agenda, o sistema gera automaticamente os registros de vagas individuais (`schedule_slots`) correspondentes ao número de atendimentos disponíveis naquele período.

---

## 2. Payload de Entrada

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `professionalUnitId` | UUID | Sim | Vínculo do profissional com a unidade onde a agenda será criada |
| `specialtyId` | UUID | Sim | Especialidade associada à agenda |
| `procedureId` | UUID | Sim | Procedimento associado à agenda |
| `date` | String (YYYY-MM-DD) | Sim | Data da agenda |
| `startTime` | String (HH:MM) | Sim | Horário de início da agenda |
| `slots` | Inteiro ≥ 1 | Sim | Quantidade de vagas disponíveis |
| `durationMinutes` | Inteiro ≥ 1 | Sim | Duração em minutos de cada vaga |
| `isActive` | Boolean | Sim | Define se a agenda estará ativa |

> **Nota:** O campo `endTime` **não é enviado pelo frontend** — ele é calculado automaticamente pelo sistema com base em `startTime`, `slots` e `durationMinutes`.

---

## 3. Campos Calculados Automaticamente

### 3.1 `endTime` da Agenda

O horário de término da agenda é calculado pela soma do horário de início com o tempo total ocupado por todas as vagas:

```
endTime = startTime + (slots × durationMinutes)
```

**Exemplo:** `startTime = 12:00`, `slots = 3`, `durationMinutes = 30`  
→ `endTime = 12:00 + (3 × 30min) = 13:30` → gravado como `"13:30:00"`

O valor é sempre formatado como `HH:MM:SS` para compatibilidade com o tipo `time` do PostgreSQL.

### 3.2 `emptySlots`

Inicializado com o mesmo valor de `slots`. Representa o número de vagas ainda disponíveis para agendamento. É decrementado conforme os pacientes são agendados.

```
emptySlots = slots  (no momento da criação)
```

### 3.3 `allocatedSlots`

Inicializado em `0`. Representa o número de vagas já ocupadas por pacientes agendados. É incrementado conforme os agendamentos ocorrem.

```
allocatedSlots = 0  (no momento da criação)
```

---

## 4. Vagas Individuais (Schedule Slots)

Ao criar uma agenda, o sistema gera automaticamente `N` registros de `schedule_slots`, onde `N` é o valor de `slots`. Cada vaga representa um bloco de tempo individual disponível para um único atendimento.

### 4.1 Cálculo de Horário de Cada Vaga

O horário de início e término de cada vaga é calculado sequencialmente a partir do `startTime` da agenda:

```
Vaga i (base 0):
  startTime = agendaStartTime + (i × durationMinutes)
  endTime   = agendaStartTime + ((i + 1) × durationMinutes)
```

**Exemplo:** `startTime = 12:00`, `slots = 3`, `durationMinutes = 30`

| Vaga | Início | Término |
|------|--------|---------|
| 1 | 12:00:00 | 12:30:00 |
| 2 | 12:30:00 | 13:00:00 |
| 3 | 13:00:00 | 13:30:00 |

> O horário de término de uma vaga coincide com o horário de início da próxima — isso é intencional e não constitui sobreposição.

### 4.2 Valores Padrão dos Slots

| Campo | Valor padrão |
|---|---|
| `isAvailable` | `true` |
| `isActive` | `true` |

### 4.3 Atomicidade

A criação da agenda e de todos os seus slots ocorre dentro de uma **transação de banco de dados**. Se qualquer inserção falhar, toda a operação é revertida, garantindo consistência entre `schedules` e `schedule_slots`.

---

## 5. Validações de Negócio

### 5.1 Autenticação

A rota exige que o usuário esteja autenticado. Requisições sem token válido são rejeitadas imediatamente.

**Resposta de erro (HTTP 401):**
```json
{ "message": "Unauthorized" }
```

---

### 5.2 Validação de Ultrapassagem da Meia-Noite

Uma agenda **não pode** cruzar para o dia seguinte. O sistema calcula o total de minutos que a agenda ocupa e verifica se ela ultrapassa `00:00` (meia-noite = 1440 minutos a partir de `00:00`).

**Regra:**
```
startTimeEmMinutos + (slots × durationMinutes) > 1440  →  BLOQUEADO
```

**Cálculo do máximo de vagas permitidas:**
```
maxSlots = floor((1440 - startTimeEmMinutos) / durationMinutes)
```

**Exemplo:** `startTime = 20:00` (1200 min), `durationMinutes = 60`
```
maxSlots = floor((1440 - 1200) / 60) = floor(240 / 60) = 4 vagas
```

Uma 5ª vaga produziria `1200 + 5×60 = 1500 > 1440` → **bloqueado**.

**Resposta de erro (HTTP 422):**
```json
{
  "message": "Ultrapassa a meia-noite. Máximo de 4 vagas para este horário e duração.",
  "maxSlots": 4
}
```

---

### 5.3 Validação de Conflito de Horário por Profissional

Um profissional **não pode** ter duas agendas na mesma data com horários sobrepostos, **independentemente da unidade** em que a agenda for criada.

**Motivação:** Um profissional pode estar vinculado a mais de uma unidade (`professionalUnit`). O sistema verifica conflito de horário em **todas as unidades** do profissional, evitando que uma agenda criada na Unidade A sobreponha uma agenda existente do mesmo profissional na Unidade B.

**Regra de sobreposição (intervalo semi-aberto `[início, fim)`):**
```
novoInício < existingEnd  E  existingStart < novoFim  →  CONFLITO
```

O uso de intervalo semi-aberto (comparação com `<` estrito) garante que agendas com **horários adjacentes não entrem em conflito**. Se uma agenda termina às `14:00:00` e outra começa às `14:00:00`, a condição `14:00 < 14:00` é **falsa** — portanto, sem conflito.

**Exemplo de conflito:**

| | Início | Fim |
|---|---|---|
| Agenda existente (Unidade A) | 13:00 | 15:00 |
| Nova agenda (Unidade B) | 14:00 | 16:00 |

`14:00 < 15:00` ✓ e `13:00 < 16:00` ✓ → **CONFLITO DETECTADO**

**Exemplo sem conflito (agendas adjacentes):**

| | Início | Fim |
|---|---|---|
| Agenda existente | 12:00 | 14:00 |
| Nova agenda | 14:00 | 16:00 |

`14:00 < 14:00` ✗ → **SEM CONFLITO**

**Resposta de erro (HTTP 409):**
```json
{
  "message": "Dr. João Silva já possui uma agenda na unidade Clínica Central das 13:00 às 15:00."
}
```

A mensagem inclui o **nome do profissional**, a **unidade** onde o conflito existe e o **horário exato** da agenda conflitante.

---

## 6. Fluxo Completo de Criação

```
Frontend envia payload (sem endTime)
        │
        ▼
[1] Calcular startTimeEmMinutos
        │
        ▼
[2] Validar ultrapassagem de meia-noite
   ├── Excede limite? → HTTP 422 com maxSlots
        │
        ▼
[3] Calcular endTime automaticamente
   └── endTime = startTime + (slots × durationMinutes)
        │
        ▼
[4] Verificar conflito de horário do profissional
   ├── Buscar professionalId pelo professionalUnitId
   ├── Buscar todas as unidades do profissional
   ├── Verificar sobreposição com agendas existentes na mesma data
   └── Conflito encontrado? → HTTP 409 com nome, unidade e horário
        │
        ▼
[5] Iniciar transação de banco de dados
        │
        ├── Inserir registro em `schedules`
        │   ├── emptySlots  = slots
        │   ├── allocatedSlots = 0
        │   └── endTime = calculado no passo [3]
        │
        └── Inserir N registros em `schedule_slots`
            ├── Cada slot com startTime e endTime calculados sequencialmente
            ├── isAvailable = true
            └── isActive = true
        │
        ▼
[6] Confirmar transação → HTTP 201 com dados da agenda criada
```

---

## 7. Resposta de Sucesso (HTTP 201)

```json
{
  "id": "uuid",
  "professionalUnitId": "uuid",
  "specialtyId": "uuid",
  "procedureId": "uuid",
  "slots": 3,
  "emptySlots": 3,
  "allocatedSlots": 0,
  "date": "2026-06-20",
  "startTime": "12:00:00",
  "endTime": "13:30:00",
  "durationMinutes": 30,
  "isActive": true,
  "createdAt": "2026-06-20T10:00:00.000Z",
  "updatedAt": "2026-06-20T10:00:00.000Z"
}
```

---

## 8. Tabela de Respostas HTTP

| Código | Situação |
|---|---|
| `201 Created` | Agenda e slots criados com sucesso |
| `401 Unauthorized` | Usuário não autenticado |
| `409 Conflict` | Profissional já possui agenda no mesmo horário (em qualquer unidade) |
| `422 Unprocessable Entity` | A combinação de horário + vagas + duração ultrapassa a meia-noite |
| `500 Internal Server Error` | Erro inesperado no servidor |
