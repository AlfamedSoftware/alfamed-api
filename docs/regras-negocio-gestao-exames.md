# Regras de Negócio — Gestão de Exames (Exam Management)

**Sistema:** Alfamed API  
**Módulo:** Exam Management  
**Data:** Junho/2026  

---

## 1. Visão Geral

O módulo de Gestão de Exames consolida, em uma única resposta, todos os agendamentos que possuem ao menos um pedido de exame interno ativo (`requests`). Serve como ponto de entrada para a fila de exames da unidade, permitindo ao profissional visualizar pacientes, horários, procedimentos e o estado atual de cada pedido.

> **Pré-requisito:** Este módulo exibe apenas pedidos internos (`requests`). Para que pedidos internos existam, a unidade deve ter `modulo1GestaoExames = true` em `unit_parameters`. Consulte [regras-negocio-parametros-unidade.md](regras-negocio-parametros-unidade.md) e [regras-negocio-pedidos-exames.md](regras-negocio-pedidos-exames.md).

---

## 2. Rotas

### `GET /exam-management`

Lista todos os agendamentos com pelo menos um pedido de exame ativo, ordenados por data da agenda e horário do slot.

**Query params (todos opcionais):**

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `professionalUserId` | `string` | Filtra pelo `userId` do profissional vinculado à agenda |
| `date` | `string` | Filtra pela data da agenda (`YYYY-MM-DD`) |
| `statusCode` | `number` | Filtra pelo código do status dos pedidos (ver tabela em [regras-negocio-pedidos-exames.md](regras-negocio-pedidos-exames.md)) |

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

## 3. Shape da Resposta (`ExamManagementItem`)

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
    statusCode: number
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

## 4. Regras de Negócio

### 4.1 Inclusão na lista
- Apenas agendamentos com **ao menos um pedido interno ativo** (`requests.isActive = true`) aparecem na resposta. O `INNER JOIN` em `requests` garante essa restrição.
- O filtro `statusCode` é aplicado sobre os pedidos: se nenhum pedido do agendamento corresponde ao código, o agendamento não aparece.
- Agendamentos inativos (`appointments.isActive = false`) são excluídos.

### 4.2 Dados do paciente
- Nome exibido é `patients.users.name`. O `socialName`, quando preenchido, pode ser usado pelo frontend como substituto.
- `birthdate` é retornado no formato `YYYY-MM-DD` para cálculo de idade no frontend.

### 4.3 Procedimentos
- O campo `schedules.procedures` representa o **procedimento principal da agenda** (exame para o qual a agenda foi criada).
- O campo `requests[].procedures` representa o **exame solicitado** em cada pedido individual, que pode diferir do procedimento da agenda.

### 4.4 Especialidade
- `schedules.specialties` identifica a especialidade da agenda, útil para filtrar/agrupar por área na interface.

### 4.5 Ordenação
- A listagem é ordenada por `schedules.date ASC` e `schedule_slots.startTime ASC`.

---

## 5. Joins Realizados

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

## 6. Relacionamentos com outros módulos

| Módulo | Relação |
|--------|---------|
| **Pedidos de Exames** | Os `requests` exibidos seguem o fluxo de status documentado em [regras-negocio-pedidos-exames.md](regras-negocio-pedidos-exames.md) |
| **Agendamentos** | Cada item representa um `appointment` com slot e agenda associados |
| **Parâmetros da Unidade** | Requer `modulo1GestaoExames = true` para que pedidos internos existam — consulte [regras-negocio-parametros-unidade.md](regras-negocio-parametros-unidade.md) |
| **Prontuário** | O resultado dos pedidos liberados (status `5`) fica acessível no prontuário — consulte [regras-negocio-prontuario-paciente.md](regras-negocio-prontuario-paciente.md) |
