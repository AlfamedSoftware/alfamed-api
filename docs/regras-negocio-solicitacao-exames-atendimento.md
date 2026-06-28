# Regras de Negócio — Solicitação de Exames no Atendimento (Módulo Requests)

**Sistema:** Alfamed API
**Módulo:** Requests
**Data:** Junho/2026

---

## 1. Visão Geral

Este documento descreve a **implementação** da solicitação de exames a partir de um atendimento (`appointment`). Durante o atendimento, o médico seleciona procedimentos do tipo `3` (Exames) e, ao **finalizar**, esses exames são gravados — separados automaticamente entre **pedidos internos** (`requests`) e **pedidos externos** (`external_requests`).

O modelo de dados completo e o ciclo de vida (status 1–7) estão em [regras-negocio-pedidos-exames.md](regras-negocio-pedidos-exames.md) e [regras-negocio-pedidos-externos.md](regras-negocio-pedidos-externos.md). Aqui o foco é a **API implementada** e a **integração com o atendimento**.

---

## 2. Estrutura do Módulo

```
src/modules/requests/
├── requests.repository.ts   # Regra de separação + persistência + leitura
├── requests.service.ts      # Camada fina sobre o repository
└── requests.routes.ts       # Endpoints HTTP (Elysia)
```

Registrado em `src/app.ts` via `requestsRoutes({ db })` (mesmo padrão de `unitParametersRoutes`).

---

## 3. Endpoints

### 3.1 `POST /requests/save-from-appointment`

Grava os exames selecionados de um atendimento. **Chamado pelo front ao finalizar, antes do `PATCH /attendiments/:id/finalizar`.**

**Body:**
```ts
{
  appointmentId: string (uuid),
  procedureIds: string[] (uuids)
}
```

**Respostas:** `200 { message }` · `401 Unauthorized` · `500`

### 3.2 `GET /requests/by-appointment/:appointmentId`

Lista os exames (internos + externos) gravados em um atendimento. Usado na aba "Solicitação de Exames" quando o atendimento está finalizado.

**Resposta `200`:**
```ts
Array<{
  id: string
  procedureId: string
  description: string            // nome do procedimento
  kind: "internal" | "external"
  statusCode: number | null      // status do pedido interno; null p/ externo
  statusDescription: string | null
}>
```

### 3.3 `GET /procedures/list-procedures-by-unit/:unitId` — filtro `type`

A listagem de procedimentos ganhou o query param opcional **`type`**. O front lista os exames disponíveis com `?type=3&isActive=true`.

---

## 4. Regra de Separação (interno × externo)

Decidida em `RequestsRepository.saveExamRequests`:

```
1. Deriva o unitId do appointment (appointments → professional_units.unitId).
2. Lê unit_parameters.modulo1GestaoExames da unidade.
3. Lê isPerformedInUnit de cada procedure (restrito à unidade).
4. Para cada exame:
     - modulo1GestaoExames = false  →  EXTERNO   (sempre, ignora isPerformedInUnit)
     - modulo1GestaoExames = true:
         - isPerformedInUnit = true   →  INTERNO  (requests)
         - isPerformedInUnit = false  →  EXTERNO  (external_requests)
```

| `modulo1GestaoExames` | `isPerformedInUnit` | Destino |
|-----------------------|---------------------|---------|
| `false`               | (qualquer)          | `external_requests` |
| `true`                | `true`              | `requests` |
| `true`                | `false`             | `external_requests` |

> ⚠️ **Atenção operacional:** se o parâmetro `modulo1GestaoExames` da unidade estiver `false`, **todos** os exames vão para `external_requests`, independente do `isPerformedInUnit`. Para usar o fluxo interno, a unidade precisa do parâmetro ativo. Ver [regras-negocio-parametros-unidade.md](regras-negocio-parametros-unidade.md).

---

## 5. Persistência

### 5.1 Pedido interno (`createInternalRequests`)
- Insere em `requests` com `statusId` do status código `1` (Prescrito), `professionalUnitId = null` e `performedAt = null` (preenchidos só nas transições posteriores).
- Cria o log inicial em `request_logs` (`oldStatusId = null`, `newStatusId = 1`, `changedBy` = userId do profissional do atendimento), conforme a regra 5.2 dos pedidos de exames.

### 5.2 Pedido externo (`createExternalRequests`)
- Insere em `external_requests` (`appointmentId`, `procedureId`, `isActive = true`). Sem status nem log.

### 5.3 IDs
`requests` e `external_requests` têm PK `text` **sem default no banco** — o id é gerado em código com `randomUUID()`.

---

## 6. Idempotência

`saveExamRequests` ignora procedimentos que **já possuem pedido ativo** (interno ou externo) no mesmo atendimento. Isso evita duplicação caso a função seja chamada novamente — por exemplo, se a finalização falhar após o save e o usuário tentar de novo.

---

## 7. Integração com o Atendimento (fluxo separado)

A gravação dos exames é **desacoplada** da finalização (não vai no payload de `finalizar`). O front orquestra a ordem:

```
Clique em "Finalizar"
   │
   ├─ 1. POST /requests/save-from-appointment   (se houver exames selecionados)
   │        └─ falhou? → aborta, NÃO finaliza, atendimento segue em andamento (retry seguro)
   │
   └─ 2. PATCH /attendiments/:id/finalizar       (só se o passo 1 deu certo)
```

Motivo: garantir que uma falha ao gravar exames não deixe o atendimento finalizado sem os exames (operações não são atômicas). Ver [docs do front — atendimentos.md].

---

## 8. Relacionamentos

| Módulo | Relação |
|--------|---------|
| **Atendimentos** | Origem do `appointmentId`; a gravação ocorre no fluxo de finalização |
| **Procedimentos** | Exames são `procedures` com `type = 3`; o `isPerformedInUnit` define interno/externo |
| **Parâmetros da Unidade** | `modulo1GestaoExames` habilita o fluxo interno |
| **Pedidos de Exames / Externos** | Modelo de dados e ciclo de vida completos nos docs dedicados |
