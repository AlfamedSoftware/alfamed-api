# Regras de Negócio — Pedidos de Exames (Requests)

**Sistema:** Alfamed API  
**Módulo:** Requests  
**Data:** Junho/2026  

---

## 1. Visão Geral

O módulo de pedidos de exames gerencia a solicitação, execução e liberação de resultados de exames (ex.: exame de sangue, raio-x) originados a partir de um agendamento (`appointment`). Cada transição de status é registrada em `request_logs`, permitindo rastrear todo o histórico do pedido. O resultado é armazenado em `request_results` e vinculado ao prontuário do paciente ao ser liberado (status `6`).

> **Pré-requisito:** Este módulo só está disponível para unidades com o parâmetro `modulo1GestaoExames = true` em `unit_parameters`. Unidades com o parâmetro desativado não podem criar pedidos internos — apenas pedidos externos (`external_requests`). Consulte [regras-negocio-parametros-unidade.md](regras-negocio-parametros-unidade.md).

---

## 2. Status do Pedido

| Código | Descrição | Ação esperada |
|--------|-----------|---------------|
| `1` | Prescrito | Pedido criado pelo médico durante o atendimento |
| `2` | Aguardando realização | Recepção — pagamento confirmado, pedido liberado para execução |
| `3` | Paciente em exame | Paciente chegou e o exame foi iniciado — vincula `professionalUnitId` ao executor |
| `4` | Aguardando análise | Exame concluído — preenche `performedAt`, gera `request_result` e entra na fila de revisão |
| `5` | Laudo em análise | Profissional assume a revisão — vincula `professionalUnitId` em `request_results` |
| `6` | Laudo liberado | Profissional libera o anexo (PDF/imagem) no prontuário |
| `7` | Exame não realizado | Exame não pôde ser executado — requer `justification` |
| `8` | Paciente não compareceu | Paciente faltou — requer `justification` |

---

## 3. Rotas

Todas as rotas de transição de status operam sobre **todos os pedidos ativos do agendamento** de uma vez (`requests.isActive = true` e `requests.appointmentId = :appointmentId`). Toda transição gera um registro em `request_logs` por pedido.

---

### `PATCH /exam-management/:appointmentId/liberar`

**Transição:** `1` (Prescrito) → `2` (Aguardando realização)

Confirmação de pagamento na recepção. Libera todos os pedidos do agendamento para a fila de realização de exames.

**Efeitos:**
- Atualiza `requests.status_id` para o código `2` em todos os pedidos ativos.
- Insere log em `request_logs` por pedido (`changedBy` = usuário autenticado).

**Respostas:**

| Código | Descrição |
|---|---|
| `200` | `{ message: "Requests liberadas com sucesso" }` |
| `401` | Não autenticado |
| `404` | Agendamento não encontrado ou sem pedidos ativos |
| `500` | Erro interno |

---

### `PATCH /exam-management/:appointmentId/iniciar`

**Transição:** `2` (Aguardando realização) → `3` (Paciente em exame)

Técnico/executor recebe o paciente e inicia o exame. Vincula a unidade profissional da sessão como executora.

**Efeitos:**
- Atualiza `requests.status_id` para o código `3` em todos os pedidos ativos.
- Preenche `requests.professional_unit_id` com o `professionalUnitId` do cookie de sessão.
- Insere log em `request_logs` por pedido.

**Respostas:**

| Código | Descrição |
|---|---|
| `200` | `{ message: "Exame iniciado com sucesso" }` |
| `401` | Não autenticado ou sem unidade profissional selecionada |
| `404` | Agendamento não encontrado ou sem pedidos ativos |
| `500` | Erro interno |

---

### `PATCH /exam-management/:appointmentId/finalizar`

**Transição:** `3` (Paciente em exame) → `4` (Aguardando análise)

Técnico/executor conclui o exame. Registra o horário de realização e cria o resultado para revisão.

**Body (opcional):**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `complementaryInfo` | `string \| null` | Não | Informações complementares sobre o exame — gravadas em `requests.complementary_info` de cada pedido |

**Efeitos:**
- Atualiza `requests.status_id` para o código `4` em todos os pedidos ativos.
- Preenche `requests.performed_at` com o timestamp atual.
- Preenche `requests.complementary_info` com o valor informado (quando presente; ignorado se não enviado).
- Cria um registro em `request_results` para cada pedido (`professional_unit_id = null`, sem `complementary_info`).
- Insere log em `request_logs` por pedido.

**Respostas:**

| Código | Descrição |
|---|---|
| `200` | `{ message: "Exame finalizado com sucesso" }` |
| `401` | Não autenticado |
| `404` | Agendamento não encontrado ou sem pedidos ativos |
| `500` | Erro interno |

---

### `PATCH /exam-management/:appointmentId/iniciar-laudo`

**Transição:** `4` (Aguardando análise) → `5` (Laudo em análise)

Profissional assume a análise do resultado. Vincula a unidade profissional da sessão como responsável pela revisão.

**Efeitos:**
- Atualiza `requests.status_id` para o código `5` em todos os pedidos ativos.
- Preenche `request_results.professional_unit_id` com o `professionalUnitId` do cookie de sessão.
- Insere log em `request_logs` por pedido.

**Respostas:**

| Código | Descrição |
|---|---|
| `200` | `{ message: "Laudo iniciado com sucesso" }` |
| `401` | Não autenticado ou sem unidade profissional selecionada |
| `404` | Agendamento não encontrado ou sem pedidos ativos |
| `500` | Erro interno |

---

### `PATCH /exam-management/:appointmentId/finalizar-laudo`

**Transição:** `5` (Laudo em análise) → `6` (Laudo liberado)

Profissional assina e libera o laudo. Anexa o arquivo PDF/imagem e registra o horário de liberação.

**Body:**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `attachmentUrl` | `string` | Sim | URL do PDF ou imagem do laudo (upload feito previamente pelo frontend) |
| `complementaryInfo` | `string \| null` | Não | Informações complementares sobre o resultado — gravadas em `request_results.complementary_info` |

**Efeitos:**
- Atualiza `requests.status_id` para o código `6` em todos os pedidos ativos.
- Preenche `request_results.attachment_url`, `request_results.released_at` (timestamp atual) e, quando informado, `request_results.complementary_info`.
- Insere log em `request_logs` por pedido.
- O laudo fica acessível no **prontuário do paciente**.

**Respostas:**

| Código | Descrição |
|---|---|
| `200` | `{ message: "Laudo liberado com sucesso" }` |
| `401` | Não autenticado |
| `404` | Agendamento não encontrado ou sem pedidos ativos |
| `500` | Erro interno |

---

### `PATCH /exam-management/:appointmentId/encerrar`

**Transição:** `2` ou `3` (em andamento) → `7` (Exame não realizado) ou `8` (Paciente não compareceu)

Encerra o fluxo sem gerar resultado. Usado quando o exame não pôde ser executado ou o paciente não compareceu.

**Body:**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `statusCode` | `7` \| `8` | Sim | Código do status de encerramento |
| `justification` | `string` | Sim | Motivo do encerramento |

**Efeitos:**
- Atualiza `requests.status_id` para o código informado (`7` ou `8`) em todos os pedidos ativos.
- Preenche `requests.justification` com o motivo informado.
- Insere log em `request_logs` por pedido.
- Nenhum `request_result` é criado.

**Respostas:**

| Código | Descrição |
|---|---|
| `200` | `{ message: "Pedidos encerrados com sucesso" }` |
| `400` | `statusCode` inválido ou `justification` ausente |
| `401` | Não autenticado |
| `404` | Agendamento não encontrado ou sem pedidos ativos |
| `500` | Erro interno |

---

## 4. Estrutura de Dados

### 4.1 `requests` — Pedido de exame

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | text (PK) | Identificador único |
| `appointmentId` | text (FK → appointments) | Agendamento de origem |
| `procedureId` | text (FK → procedures) | Procedimento/exame solicitado — deve ser do tipo `3` (Exames) |
| `professionalUnitId` | text (FK → professional_units, nullable) | Profissional da unidade executor — preenchido ao avançar para status `3` |
| `complementaryInfo` | text (nullable) | Informações complementares sobre o pedido |
| `performedAt` | timestamp (nullable) | Data/hora da execução do exame — preenchido ao avançar para status `4` |
| `justification` | text (nullable) | Justificativa de encerramento sem resultado (status `7` e `8`) |
| `statusId` | text (FK → requests_status) | Status atual do pedido |
| `isActive` | boolean | Se o pedido está ativo |

### 4.2 `request_results` — Resultado do exame

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | text (PK) | Identificador único |
| `requestId` | text (FK → requests, unique) | Um resultado por pedido |
| `professionalUnitId` | text (FK → professional_units, nullable) | Profissional que assumiu a análise — preenchido ao avançar para o status `5` |
| `complementaryInfo` | text (nullable) | Informações complementares sobre o resultado |
| `attachmentUrl` | text (nullable) | URL do PDF ou imagem do laudo — preenchido no status `6` |
| `releasedAt` | timestamp (nullable) | Data/hora da liberação do laudo — preenchido no status `6` |

### 4.3 `request_logs` — Histórico de status

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `requestId` | text (FK → requests) | Pedido relacionado |
| `oldStatusId` | text (nullable) | Status anterior |
| `newStatusId` | text | Novo status |
| `changedBy` | text (FK → users) | Usuário que realizou a transição |
| `observation` | text (nullable) | Observação livre sobre a mudança |

---

## 5. Fluxo Principal

```
Médico prescreve
      │
      ▼
[1] Prescrito
      │  /liberar
      ▼
[2] Aguardando realização ──── /encerrar (statusCode=8) ──► [8] Paciente não compareceu
      │  /iniciar
      ▼
[3] Paciente em exame ──────── /encerrar (statusCode=7) ──► [7] Exame não realizado
      │  /finalizar
      ▼
[4] Aguardando análise
      │  /iniciar-laudo
      ▼
[5] Laudo em análise
      │  /finalizar-laudo (body: attachmentUrl, complementaryInfo?)
      ▼
[6] Laudo liberado
      │
      ▼
   PDF do laudo acessível no prontuário
```

**Transições permitidas por rota:**

| Rota | De | Para |
|------|----|------|
| `/liberar` | `1` | `2` |
| `/iniciar` | `2` | `3` |
| `/finalizar` | `3` | `4` |
| `/iniciar-laudo` | `4` | `5` |
| `/finalizar-laudo` | `5` | `6` |
| `/encerrar` | `2` ou `3` | `7` ou `8` |

---

## 6. Regras de Negócio

### 6.1 Criação do pedido
> **Implementação:** a criação a partir do atendimento (seleção de exames + separação interno/externo + endpoints) está documentada em [regras-negocio-solicitacao-exames-atendimento.md](regras-negocio-solicitacao-exames-atendimento.md).

- Um pedido (`request`) só pode ser criado se a unidade tiver `modulo1GestaoExames = true` em `unit_parameters`.
- Um pedido (`request`) é sempre criado a partir de um `appointment` ativo.
- O `procedureId` define qual exame foi solicitado e deve existir na tabela `procedures` com o tipo `3` (Exames).
- O status inicial é obrigatoriamente `1` (Prescrito).
- Os campos `professionalUnitId` e `performedAt` são preenchidos durante o fluxo, não na criação.

### 6.2 Transição de status
- Toda mudança de status deve gerar um registro em `request_logs` com o `changedBy` (usuário responsável).
- Transições para `7` (Exame não realizado) ou `8` (Paciente não compareceu) encerram o fluxo sem gerar resultado.
- Ao mover para status `7` ou `8`, o campo `justification` deve ser preenchido com o motivo do encerramento.

### 6.3 Status 3 — Paciente em exame
- Ao mover para status `3`, o `professionalUnitId` em `requests` é preenchido com o profissional/unidade que iniciou o exame.
- Usa o `professionalUnitId` do cookie de sessão (`selectedProfessionalUnitId`).
- Somente esse profissional poderá avançar o pedido para o status `4` (Aguardando análise).

### 6.4 Geração do resultado (status 4 — Aguardando análise)
- A transição para status `4` indica que o exame foi executado:
  - `performedAt` em `requests` é preenchido automaticamente.
  - Um registro em `request_results` é criado com `complementaryInfo` opcional e `professionalUnitId` **null**.
- O resultado fica na fila aguardando um profissional assumir a análise.
- Cada pedido tem **no máximo um** resultado (`requestId` é único em `request_results`).

### 6.5 Status 5 — Laudo em análise
- Ao mover para status `5`, um profissional assume a análise e o `professionalUnitId` em `request_results` é preenchido (cookie de sessão).
- Somente esse profissional poderá avançar o pedido para o status `6` (Laudo liberado).

### 6.6 Liberação do laudo (status 6 — Laudo liberado)
- Ao mover para status `6`, o `request_result` existente é atualizado com:
  - `attachmentUrl` — URL do arquivo PDF ou imagem do laudo.
  - `releasedAt` — data/hora da liberação.
- Sem um `request_result` criado no status `4`, não é possível liberar o laudo.
- Após a liberação, o PDF do laudo fica acessível no **prontuário do paciente**.

### 6.7 Rastreabilidade
- Os logs de status `3` e `4` registram em `request_logs` quem realizou cada transição, identificando o profissional que iniciou e executou o exame.
- O histórico completo de transições pode ser consultado a qualquer momento via `request_logs`.

---

## 7. Relacionamentos com outros módulos

| Módulo | Relação |
|--------|---------|
| **Agendamentos** | Todo pedido origina de um `appointment` |
| **Procedimentos** | O exame solicitado é um `procedure` cadastrado na unidade com o tipo `3` (Exames) |
| **Unidades Profissionais** | Profissional da unidade responsável pela execução e assinatura do laudo |
| **Prontuário** | Todos os pedidos e seus status são visíveis no prontuário do paciente; o PDF do laudo só fica acessível no status `6` (Laudo liberado) |
| **Logs** | Toda transição de status é auditada em `request_logs` |
| **Parâmetros da Unidade** | Requer `modulo1GestaoExames = true` em `unit_parameters` — consulte [regras-negocio-parametros-unidade.md](regras-negocio-parametros-unidade.md) |
