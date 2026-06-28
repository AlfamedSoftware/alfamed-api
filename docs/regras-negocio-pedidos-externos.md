# Regras de Negócio — Pedidos Externos (External Requests)

**Sistema:** Alfamed API  
**Módulo:** External Requests  
**Data:** Junho/2026  

---

## 1. Visão Geral

O módulo de pedidos externos registra procedimentos/exames solicitados pelo médico durante um atendimento (`appointment`) que **não são realizados internamente pela unidade** — ou seja, são encaminhamentos para serviços externos (laboratórios, clínicas parceiras, etc.).

Diferente dos pedidos internos (`requests`), os pedidos externos não possuem fluxo de status, executor vinculado ou geração de resultado dentro do sistema. Funcionam como uma lista de encaminhamentos associada ao atendimento, visível no prontuário do paciente.

> **Disponibilidade:** Pedidos externos estão disponíveis para **todas as unidades**, independente do parâmetro `modulo1GestaoExames`. São a única forma de registro de exames para unidades com o módulo de gestão desativado. Consulte [regras-negocio-parametros-unidade.md](regras-negocio-parametros-unidade.md).

---

## 2. Estrutura de Dados

### 2.1 `external_requests` — Pedido externo

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | text (PK) | Identificador único |
| `appointmentId` | text (FK → appointments) | Agendamento de origem |
| `procedureId` | text (FK → procedures) | Procedimento/exame encaminhado |
| `isActive` | boolean | Se o pedido está ativo |
| `createdAt` | timestamp | Data de criação |
| `updatedAt` | timestamp | Data da última atualização |

---

## 3. Fluxo

```
Médico durante o atendimento
          │
          ▼
Seleciona um ou mais procedimentos externos
          │
          ▼
  Cada procedimento gera um registro em external_requests
  vinculado ao appointment
          │
          ▼
  Lista de encaminhamentos acessível no prontuário do paciente
```

---

## 4. Regras de Negócio

### 4.1 Criação
- Um pedido externo só pode ser criado a partir de um `appointment` ativo.
- Um `appointment` pode ter **múltiplos** pedidos externos (um por procedimento encaminhado).
- Não há status, executor ou resultado — o acompanhamento do encaminhamento ocorre fora do sistema.

### 4.2 Exclusão
- A exclusão do `appointment` remove todos os seus pedidos externos em cascata (`ON DELETE CASCADE`).
- O `procedure` referenciado não pode ser excluído enquanto houver pedidos externos vinculados (`ON DELETE RESTRICT`).

### 4.3 Desativação
- Pedidos externos podem ser desativados via `isActive = false` sem serem excluídos, preservando o histórico do atendimento.

---

## 5. Diferenças em relação aos Pedidos Internos (`requests`)

| Característica | Pedido Interno (`requests`) | Pedido Externo (`external_requests`) |
|---|---|---|
| Fluxo de status | Sim (1 → 7) | Não |
| Executor vinculado | Sim (`professionalUnitId`) | Não |
| Geração de resultado | Sim (`request_results`) | Não |
| Histórico de transições | Sim (`request_logs`) | Não |
| Realizado na unidade | Sim | Não |

---

## 6. Relacionamentos com outros módulos

| Módulo | Relação |
|--------|---------|
| **Agendamentos** | Todo pedido externo origina de um `appointment` |
| **Procedimentos** | O encaminhamento referencia um `procedure` cadastrado |
| **Prontuário** | A lista de pedidos externos do atendimento é exibida no prontuário do paciente |
| **Parâmetros da Unidade** | Sempre disponível — não depende de `modulo1GestaoExames`; consulte [regras-negocio-parametros-unidade.md](regras-negocio-parametros-unidade.md) |
