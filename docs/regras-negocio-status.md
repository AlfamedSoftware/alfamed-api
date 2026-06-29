# Regras de Negócio — Status

**Sistema:** Alfamed API  
**Módulos:** Appointment Status / Request Status  
**Data:** Junho/2026  

---

## 1. Appointment Status

Status do ciclo de vida de um agendamento (`appointments`).

| Código | Descrição |
|---|---|
| `1` | Agendado |
| `2` | Atendimento iniciado |
| `3` | Atendimento finalizado |
| `4` | Faltou ao atendimento |
| `5` | Cancelado |
| `6` | Transferido |

### Rota

**`GET /appointment-status`**

Retorna todos os status de agendamento, opcionalmente filtrados por `isActive`.

**Query params:**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `isActive` | Boolean | Não | Filtra por status ativo/inativo |

**Estrutura da resposta (200):**

```json
[
  {
    "id": "uuid",
    "code": 1,
    "description": "Agendado",
    "isActive": true,
    "createdAt": "datetime",
    "updatedAt": "datetime"
  }
]
```

**Tabela de respostas:**

| Código | Situação |
|---|---|
| `200 OK` | Lista retornada com sucesso |
| `401 Unauthorized` | Sessão inválida ou ausente |
| `500 Internal Server Error` | Erro inesperado no servidor |

---

## 2. Request Status

Status do ciclo de vida de uma solicitação de exame (`requests`).

| Código | Descrição |
|---|---|
| `1` | Prescrito |
| `2` | Aguardando realização |
| `3` | Paciente em exame |
| `4` | Aguardando análise |
| `5` | Laudo em análise |
| `6` | Laudo liberado |
| `7` | Exame não realizado |
| `8` | Paciente não compareceu |

### Rota

**`GET /request-status`**

Retorna todos os status de solicitação, opcionalmente filtrados por `isActive`.

**Query params:**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `isActive` | Boolean | Não | Filtra por status ativo/inativo |

**Estrutura da resposta (200):**

```json
[
  {
    "id": "uuid",
    "code": 1,
    "description": "Prescrito",
    "isActive": true,
    "createdAt": "datetime",
    "updatedAt": "datetime"
  }
]
```

**Tabela de respostas:**

| Código | Situação |
|---|---|
| `200 OK` | Lista retornada com sucesso |
| `401 Unauthorized` | Sessão inválida ou ausente |
| `500 Internal Server Error` | Erro inesperado no servidor |
