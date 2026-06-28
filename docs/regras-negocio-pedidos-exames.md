# Regras de Negócio — Pedidos de Exames (Requests)

**Sistema:** Alfamed API  
**Módulo:** Requests  
**Data:** Junho/2026  

---

## 1. Visão Geral

O módulo de pedidos de exames gerencia a solicitação, execução e liberação de resultados de exames (ex.: exame de sangue, raio-x) originados a partir de um agendamento (`appointment`). Cada transição de status é registrada em `request_logs`, permitindo rastrear todo o histórico do pedido. O resultado é armazenado em `request_results` e vinculado ao prontuário do paciente ao ser liberado (status `5`).

> **Pré-requisito:** Este módulo só está disponível para unidades com o parâmetro `modulo1GestaoExames = true` em `unit_parameters`. Unidades com o parâmetro desativado não podem criar pedidos internos — apenas pedidos externos (`external_requests`). Consulte [regras-negocio-parametros-unidade.md](regras-negocio-parametros-unidade.md).

---

## 2. Status do Pedido

| Código | Descrição | Ação esperada |
|--------|-----------|---------------|
| `1` | Prescrito | Pedido criado pelo médico durante o atendimento |
| `2` | Paciente em Exame | Paciente chegou e o exame foi iniciado — vincula `professionalUnitId` ao executor |
| `3` | Aguardando análise | Exame concluído — preenche `performedAt`, gera `request_result` e entra na fila de revisão |
| `4` | Laudo em análise | Profissional assume a revisão — vincula `professionalUnitId` em `request_results` |
| `5` | Laudo liberado | Profissional libera o anexo (PDF/imagem) no prontuário |
| `6` | Exame não realizado | Exame não pôde ser executado — requer `justification` |
| `7` | Paciente não compareceu | Paciente faltou — requer `justification` |

---

## 3. Estrutura de Dados

### 3.1 `requests` — Pedido de exame

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | text (PK) | Identificador único |
| `appointmentId` | text (FK → appointments) | Agendamento de origem |
| `procedureId` | text (FK → procedures) | Procedimento/exame solicitado — deve ser do tipo `3` (Exames) |
| `professionalUnitId` | text (FK → professional_units, nullable) | Profissional da unidade executor — preenchido ao avançar para status `2` |
| `complementaryInfo` | text (nullable) | Informações complementares sobre o pedido |
| `performedAt` | timestamp (nullable) | Data/hora da execução do exame — preenchido ao avançar para status `3` |
| `justification` | text (nullable) | Justificativa de encerramento sem resultado (status `6` e `7`) |
| `statusId` | text (FK → requests_status) | Status atual do pedido |
| `isActive` | boolean | Se o pedido está ativo |

### 3.2 `request_results` — Resultado do exame

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | text (PK) | Identificador único |
| `requestId` | text (FK → requests, unique) | Um resultado por pedido |
| `professionalUnitId` | text (FK → professional_units, nullable) | Profissional que assumiu a análise — preenchido ao avançar para o status `4` |
| `complementaryInfo` | text (nullable) | Informações complementares sobre o resultado |
| `attachmentUrl` | text (nullable) | URL do PDF ou imagem do laudo — preenchido no status `5` |
| `releasedAt` | timestamp (nullable) | Data/hora da liberação do laudo — preenchido no status `5` |

### 3.3 `request_logs` — Histórico de status

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `requestId` | text (FK → requests) | Pedido relacionado |
| `oldStatusId` | text (nullable) | Status anterior |
| `newStatusId` | text | Novo status |
| `changedBy` | text (FK → users) | Usuário que realizou a transição |
| `observation` | text (nullable) | Observação livre sobre a mudança |

---

## 4. Fluxo Principal

```
Médico prescreve
      │
      ▼
[1] Prescrito ──────────────────────────────────► [7] Paciente não compareceu
      │                                                  (justification obrigatório)
      ▼
[2] Paciente em Exame
      │  vincula professionalUnitId em requests
      ├──────────────────────────────────────────► [6] Exame não realizado
      │                                                  (justification obrigatório)
      ▼
[3] Aguardando análise
      │  preenche performedAt em requests
      │  cria request_result (professionalUnitId = null)
      ▼
[4] Laudo em análise
      │  profissional assume a revisão
      │  preenche professionalUnitId em request_results
      ▼
[5] Laudo liberado
      │  preenche attachmentUrl + releasedAt em request_results
      ▼
   PDF do laudo acessível no prontuário
```

---

## 5. Regras de Negócio

### 5.1 Criação do pedido
> **Implementação:** a criação a partir do atendimento (seleção de exames + separação interno/externo + endpoints) está documentada em [regras-negocio-solicitacao-exames-atendimento.md](regras-negocio-solicitacao-exames-atendimento.md).

- Um pedido (`request`) só pode ser criado se a unidade tiver `modulo1GestaoExames = true` em `unit_parameters`.
- Um pedido (`request`) é sempre criado a partir de um `appointment` ativo.
- O `procedureId` define qual exame foi solicitado e deve existir na tabela `procedures` com o tipo `3` (Exames).
- O status inicial é obrigatoriamente `1` (Prescrito).
- Os campos `professionalUnitId` e `performedAt` são preenchidos durante o fluxo, não na criação.

### 5.2 Transição de status
- Toda mudança de status deve gerar um registro em `request_logs` com o `changedBy` (usuário responsável).
- Transições para `6` (Exame não realizado) ou `7` (Paciente não compareceu) encerram o fluxo sem gerar resultado.
- Ao mover para status `6` ou `7`, o campo `justification` deve ser preenchido com o motivo do encerramento.

### 5.2.1 Status 2 — Paciente em Exame
- Ao mover para status `2`, o `professionalUnitId` em `requests` é preenchido com o profissional que iniciou o exame.
- Somente esse profissional poderá avançar o pedido para o status `3` (Aguardando análise).

### 5.3 Geração do resultado (status 3 — Aguardando análise)
- A transição para status `3` indica que o exame foi executado:
  - `performedAt` em `requests` é preenchido automaticamente.
  - Um registro em `request_results` é criado com `complementaryInfo` opcional e `professionalUnitId` **null**.
- O resultado fica na fila aguardando um profissional assumir a análise.
- Cada pedido tem **no máximo um** resultado (`requestId` é único em `request_results`).

### 5.3.1 Status 4 — Laudo em análise
- Ao mover para status `4`, um profissional assume a análise e o `professionalUnitId` em `request_results` é preenchido.
- Somente esse profissional poderá avançar o pedido para o status `5` (Laudo liberado).

### 5.4 Liberação do laudo (status 5 — Laudo liberado)
- Ao mover para status `5`, o `request_result` existente é atualizado com:
  - `attachmentUrl` — URL do arquivo PDF ou imagem do laudo.
  - `releasedAt` — data/hora da liberação.
- Sem um `request_result` criado no status `3`, não é possível liberar o laudo.
- Após a liberação, o PDF do laudo fica acessível no **prontuário do paciente**.
- O acompanhamento do status do pedido é visível no prontuário em todas as etapas do fluxo.

### 5.5 Rastreabilidade
- Os logs de status `2` e `3` registram em `request_logs` quem realizou cada transição, identificando o profissional que iniciou e executou o exame.
- O histórico completo de transições pode ser consultado a qualquer momento via `request_logs`.

---

## 6. Relacionamentos com outros módulos

| Módulo | Relação |
|--------|---------|
| **Agendamentos** | Todo pedido origina de um `appointment` |
| **Procedimentos** | O exame solicitado é um `procedure` cadastrado na unidade com o tipo `3` (Exames) |
| **Unidades Profissionais** | Profissional da unidade responsável pela execução e assinatura do laudo |
| **Prontuário** | Todos os pedidos e seus status são visíveis no prontuário do paciente; o PDF do laudo só fica acessível no status `5` (Laudo liberado) |
| **Logs** | Toda transição de status é auditada em `request_logs` |
| **Parâmetros da Unidade** | Requer `modulo1GestaoExames = true` em `unit_parameters` — consulte [regras-negocio-parametros-unidade.md](regras-negocio-parametros-unidade.md) |
