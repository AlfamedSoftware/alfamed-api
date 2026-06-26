# Regras de Negócio — Parâmetros da Unidade (Unit Parameters)

**Sistema:** Alfamed API  
**Módulo:** Unit Parameters  
**Data:** Junho/2026  

---

## 1. Visão Geral

Cada unidade (`unit`) possui um registro de parâmetros em `unit_parameters` que controla quais módulos e funcionalidades estão habilitados para ela. Os parâmetros permitem que o comportamento do sistema seja configurado por unidade, sem impactar as demais.

Um registro é criado automaticamente para cada unidade no momento em que a migration é executada, e também deve ser criado ao cadastrar uma nova unidade (Precisa fazer a inclusão no ServiceDesk).

---

## 2. Estrutura de Dados

### 2.1 `unit_parameters` — Parâmetros da unidade

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | text (PK) | Identificador único |
| `unitId` | text (FK → units, unique) | Unidade referenciada — um registro por unidade |
| `modulo1GestaoExames` | boolean | Ativa o módulo de gestão de exames para a unidade |

---

## 3. Módulos Configuráveis

### 3.1 `modulo1GestaoExames` — Gestão de Exames

Controla se a unidade opera com o fluxo completo de pedidos de exames internos.

#### Quando **ativado** (`true`)

- As telas de gestão de exames ficam disponíveis para a unidade (fila de exames, laudos, resultados).
- Durante o atendimento médico, o profissional pode criar **pedidos internos** (`requests`) vinculados ao `appointment`.
- O fluxo completo de status (Prescrito → Laudo liberado) é habilitado, incluindo `request_logs` e `request_results`.
- Pedidos externos (`external_requests`) também continuam disponíveis para encaminhamentos.

#### Quando **desativado** (`false`) — padrão

- As telas de gestão de exames **não são exibidas**.
- Durante o atendimento médico, **não é possível criar pedidos internos** (`requests`).
- Apenas **pedidos externos** (`external_requests`) estão disponíveis, para registrar encaminhamentos a serviços externos.

---

## 4. Fluxo de Atendimento por Configuração

```
Módulo desativado (padrão)          Módulo ativado
─────────────────────────           ─────────────────────────
Atendimento médico                  Atendimento médico
      │                                   │
      ▼                                   ├──► Pedido Interno (requests)
Apenas encaminhamentos                    │    └── Fluxo completo de status
(external_requests)                       │        (exame realizado na unidade)
                                          │
                                          └──► Encaminhamento (external_requests)
                                               └── Registro simples, sem status
```

---

## 5. Rotas

### 5.1 `GET /unit-parameters/get-parameters/:unitId` — Buscar parâmetros da unidade

Retorna o registro de parâmetros de uma unidade pelo seu ID.

**Parâmetros:**

| Parâmetro | Local | Tipo | Descrição |
|-----------|-------|------|-----------|
| `:unitId` | Path | UUID | ID da unidade |

**Regras:**
- Requer autenticação.
- Não exige unidade no cabeçalho de contexto — qualquer usuário autenticado pode consultar.
- Retorna HTTP 404 se a unidade não possuir registro de parâmetros.

| Código | Situação |
|--------|---------|
| `200 OK` | Parâmetros retornados |
| `401 Unauthorized` | Não autenticado |
| `404 Not Found` | Parâmetros não encontrados para a unidade |
| `500 Internal Server Error` | Erro interno |

---

## 6. Regras de Negócio

### 6.1 Criação do registro
- Todo `unit_parameters` é criado junto com a unidade, com todos os módulos desativados por padrão.
- Não pode existir mais de um registro por unidade (`unitId` é único).

### 6.2 Alteração de parâmetros
- Os parâmetros podem ser alterados apenas pelo ServiceDesk.
- A mudança tem efeito imediato — não requer reinicialização ou nova sessão.
- Desativar `modulo1GestaoExames` **não exclui** pedidos internos existentes; apenas impede a criação de novos.

### 6.3 Exclusão
- A exclusão da unidade remove seu registro de parâmetros em cascata (`ON DELETE CASCADE`).

---

## 7. Relacionamentos com outros módulos

| Módulo | Relação |
|--------|---------|
| **Unidades** | Cada unidade possui exatamente um registro de parâmetros |
| **Pedidos Internos** (`requests`) | Só podem ser criados se `modulo1GestaoExames = true` |
| **Pedidos Externos** (`external_requests`) | Sempre disponíveis, independente dos parâmetros |
| **Atendimento médico** | Exibe ou oculta a opção de pedido interno conforme o parâmetro |
| **Telas de gestão de exames** | Visíveis apenas para unidades com `modulo1GestaoExames = true` |
