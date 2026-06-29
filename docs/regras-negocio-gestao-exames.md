# Regras de Negócio — Gestão de Exames (Exam Management)

**Sistema:** Alfamed API  
**Módulo:** Exam Management  
**Data:** Junho/2026  

---

## 1. Visão Geral

O módulo de Gestão de Exames consolida, em uma única resposta, todos os agendamentos que possuem ao menos um pedido de exame interno ativo (`requests`). Serve como ponto de entrada para a fila de exames da unidade, permitindo ao profissional visualizar pacientes, horários, procedimentos e o estado atual de cada pedido.

> **Pré-requisito:** Este módulo exibe apenas pedidos internos (`requests`). Para que pedidos internos existam, a unidade deve ter `modulo1GestaoExames = true` em `unit_parameters`. Consulte [regras-negocio-parametros-unidade.md](regras-negocio-parametros-unidade.md) e [regras-negocio-pedidos-exames.md](regras-negocio-pedidos-exames.md).

---

## 2. Status dos Pedidos de Exame

| Código | Descrição | Quem aciona |
|--------|-----------|-------------|
| `1` | Prescrito | Médico — pedido gerado ao finalizar o atendimento |
| `2` | Aguardando realização | Recepção — pagamento confirmado, pedido liberado para execução |
| `3` | Paciente em exame | Técnico/executor — exame iniciado na sala |
| `4` | Aguardando análise | Sistema — exame concluído, aguardando profissional assumir |
| `5` | Laudo em análise | Profissional — assumiu a revisão do resultado |
| `6` | Laudo liberado | Profissional — laudo assinado e disponível no prontuário |
| `7` | Exame não realizado | Técnico/executor — exame não pôde ser executado |
| `8` | Paciente não compareceu | Recepção/técnico — paciente faltou |

---

## 3. Rotas

### `GET /exam-management`

Lista todos os agendamentos com pelo menos um pedido de exame ativo, ordenados por data da agenda e horário do slot.

**Query params (todos opcionais):**

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `professionalUserId` | `string` | Filtra pelo `userId` do profissional vinculado à agenda |
| `date` | `string` | Filtra pela data da agenda (`YYYY-MM-DD`) |
| `statusCode` | `number` | Filtra pelo código de status dos pedidos (ver tabela na seção 2) |

**Respostas:**

| Código | Descrição |
|---|---|
| `200` | Array de `ExamManagementItem` |
| `401` | Não autenticado |
| `500` | Erro interno |

---

### `GET /exam-management/:appointmentId`

Retorna os detalhes completos de um agendamento específico com todos os seus pedidos de exame ativos.

**Path param:**

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `appointmentId` | `string (UUID)` | ID do agendamento |

**Respostas:**

| Código | Descrição |
|---|---|
| `200` | `ExamManagementItem` |
| `401` | Não autenticado |
| `404` | Agendamento não encontrado ou sem pedidos ativos |
| `500` | Erro interno |

---

### `PATCH /exam-management/:appointmentId/liberar`

Libera todos os pedidos ativos do agendamento para realização, após confirmação de pagamento. Avança o `statusId` de `1` (Prescrito) para `2` (Aguardando realização) e registra a transição em `request_logs` para cada pedido.

**Path param:**

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `appointmentId` | `string (UUID)` | ID do agendamento |

**Respostas:**

| Código | Descrição |
|---|---|
| `200` | `{ message: "Requests liberadas com sucesso" }` |
| `401` | Não autenticado |
| `404` | Agendamento não encontrado ou sem pedidos ativos |
| `500` | Erro interno |

**Efeitos colaterais:**
- Atualiza `requests.status_id` para o código `2` em todos os pedidos ativos do agendamento.
- Insere um registro em `request_logs` por pedido com `oldStatusId`, `newStatusId` e `changedBy` (usuário autenticado da sessão).

---

### `PATCH /exam-management/:appointmentId/iniciar`

Inicia o exame para todos os pedidos ativos do agendamento. Avança o `statusId` de `2` (Aguardando realização) para `3` (Paciente em exame), vincula o `professionalUnitId` da sessão ao executor e registra a transição em `request_logs` para cada pedido.

**Path param:**

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `appointmentId` | `string (UUID)` | ID do agendamento |

**Respostas:**

| Código | Descrição |
|---|---|
| `200` | `{ message: "Exame iniciado com sucesso" }` |
| `401` | Não autenticado ou sem unidade profissional selecionada |
| `404` | Agendamento não encontrado ou sem pedidos ativos |
| `500` | Erro interno |

**Efeitos colaterais:**
- Atualiza `requests.status_id` para o código `3` e `requests.professional_unit_id` para o `professionalUnitId` do cookie de sessão, em todos os pedidos ativos do agendamento.
- Insere um registro em `request_logs` por pedido com `oldStatusId`, `newStatusId` e `changedBy`.

---

## 4. Fluxo — Pagar, Liberar e Iniciar (Recepção e Técnico)

As duas primeiras etapas operacionais do fluxo de gestão de exames.

```
[Atendimento finalizado]
        │
        │  Médico seleciona exames ao finalizar o atendimento
        │  Pedidos criados com status 1 (Prescrito)
        ▼
[Recepção confirma pagamento]
        │
        │  PATCH /exam-management/:appointmentId/liberar
        │  status: 1 (Prescrito) → 2 (Aguardando realização)
        │  Log registrado em request_logs (por pedido)
        ▼
[Pedidos aparecem na fila de exames]
        │
        │  Visível via GET /exam-management?statusCode=2
        ▼
[Técnico recebe o paciente e inicia o exame]
        │
        │  PATCH /exam-management/:appointmentId/iniciar
        │  status: 2 (Aguardando realização) → 3 (Paciente em exame)
        │  professionalUnitId vinculado em requests (por pedido)
        │  Log registrado em request_logs (por pedido)
        ▼
[Exame em andamento — próximas etapas no módulo de pedidos]
```

**Regras desta etapa:**
- O atendente confirma na recepção que o paciente pagou (ou que o convênio está validado) antes de liberar.
- A liberação e o início operam sobre **todos os pedidos ativos do agendamento** de uma vez — não é necessário acionar rota por pedido.
- O `professionalUnitId` vinculado ao iniciar vem do cookie `selectedProfessionalUnitId` da sessão — o técnico precisa ter uma unidade selecionada.
- O usuário autenticado que aciona cada rota fica registrado como `changedBy` nos logs.

---

## 5. Shape da Resposta (`ExamManagementItem`)

```ts
{
  id: string           // appointment id
  statusId: string     // status do agendamento
  isActive: boolean
  createdAt: string    // ISO 8601
  updatedAt: string    // ISO 8601

  schedules: {
    id: string
    date: string       // "YYYY-MM-DD"
    startTime: string
    endTime: string
    procedures: {      // procedimento principal da agenda
      id: string
      description: string
      code: string
    }
    specialties: {
      id: string
      name: string
    }
  }

  schedules_slots: {
    id: string
    startTime: string
    endTime: string
  }

  patients: {
    id: string
    name: string
    socialName: string | null
    cpf: string
    phone: string
    email: string
    sex: string | null
    birthdate: string  // "YYYY-MM-DD"
  }

  professional_units: {
    id: string
    professional: {
      id: string
      crm: string | null
      user: {
        id: string
        name: string
      }
    }
  }

  requests: Array<{         // somente requests com isActive = true
    id: string
    statusId: string
    statusCode: number      // ver tabela de status na seção 2
    statusDescription: string
    performedAt: string | null  // ISO 8601
    complementaryInfo: string | null
    justification: string | null
    procedures: {             // procedimento do exame solicitado
      id: string
      description: string
      code: string
      price: string
    }
    createdAt: string
    updatedAt: string
  }>
}
```

---

## 6. Regras de Negócio

### 6.1 Inclusão na lista
- Apenas agendamentos com **ao menos um pedido interno ativo** (`requests.isActive = true`) aparecem na resposta. O `INNER JOIN` em `requests` garante essa restrição.
- O filtro `statusCode` é aplicado sobre os pedidos: se nenhum pedido do agendamento corresponde ao código, o agendamento não aparece.
- Agendamentos inativos (`appointments.isActive = false`) são excluídos.

### 6.2 Dados do paciente
- Nome exibido é `patients.users.name`. O `socialName`, quando preenchido, pode ser usado pelo frontend como substituto.
- `birthdate` é retornado no formato `YYYY-MM-DD` para cálculo de idade no frontend.

### 6.3 Procedimentos
- O campo `schedules.procedures` representa o **procedimento principal da agenda** (exame para o qual a agenda foi criada).
- O campo `requests[].procedures` representa o **exame solicitado** em cada pedido individual, que pode diferir do procedimento da agenda.

### 6.4 Especialidade
- `schedules.specialties` identifica a especialidade da agenda, útil para filtrar/agrupar por área na interface.

### 6.5 Ordenação
- A listagem é ordenada por `schedules.date ASC` e `schedule_slots.startTime ASC`.

---

## 7. Joins Realizados

```
appointments
  → requests                              INNER — garante ao menos 1 request ativo
  → requests_status
  → procedures                            (exame do request)
  → schedule_slots
  → schedules
  → procedures AS schedule_procedures     (procedimento principal da agenda)
  → specialties
  → patients
  → users AS patient_users
  → professional_units
  → professionals
  → users AS professional_users
```

---

## 8. Relacionamentos com outros módulos

| Módulo | Relação |
|--------|---------|
| **Pedidos de Exames** | Os `requests` exibidos seguem o fluxo de status documentado em [regras-negocio-pedidos-exames.md](regras-negocio-pedidos-exames.md) |
| **Agendamentos** | Cada item representa um `appointment` com slot e agenda associados |
| **Parâmetros da Unidade** | Requer `modulo1GestaoExames = true` para que pedidos internos existam — consulte [regras-negocio-parametros-unidade.md](regras-negocio-parametros-unidade.md) |
| **Prontuário** | O resultado dos pedidos liberados (status `6` — Laudo liberado) fica acessível no prontuário — consulte [regras-negocio-prontuario-paciente.md](regras-negocio-prontuario-paciente.md) |
