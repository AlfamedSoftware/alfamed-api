# Regras de Negócio — Anamnese (Anamnesis)

**Sistema:** Alfamed API  
**Módulo:** Anamnesis  
**Data:** Junho/2026  

---

## 1. Visão Geral

A anamnese é o conjunto de informações de saúde coletadas do paciente antes da consulta. Ela é preenchida pelo próprio paciente no aplicativo mobile ao final do fluxo de agendamento, de forma opcional — ou seja, um agendamento pode existir sem anamnese registrada.

Na tela de atendimento médico, o profissional visualiza a anamnese do agendamento em questão. Caso o paciente não tenha preenchido, nenhum dado é exibido.

---

## 2. Rotas

### 2.1 Registrar Anamnese

**`POST /anamnesis`**

Chamado pelo aplicativo mobile ao final do fluxo de agendamento. O paciente preenche os campos de saúde antes de confirmar a consulta. Todos os campos, exceto `appointmentId`, são opcionais.

**Body:**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `appointmentId` | UUID | Sim | ID do agendamento ao qual a anamnese pertence |
| `mainComplaint` | String \| null | Não | Queixa principal relatada pelo paciente |
| `painLevel` | Inteiro (0–3) \| null | Não | Nível de dor: `0` = Não, `1` = Leve, `2` = Moderada, `3` = Intensa |
| `takingMedication` | String \| null | Não | Medicamentos em uso |
| `knownAllergy` | String \| null | Não | Alergias conhecidas |
| `hadSurgery` | Boolean \| null | Não | Se o paciente já realizou cirurgia |
| `surgeryDetails` | String \| null | Não | Detalhes da(s) cirurgia(s) realizada(s) |
| `familyHistory` | Boolean \| null | Não | Se há histórico familiar relevante |
| `familyHistoryDetails` | String \| null | Não | Detalhes do histórico familiar |

**Tabela de respostas:**

| Código | Situação |
|---|---|
| `201 Created` | Anamnese registrada com sucesso |
| `401 Unauthorized` | Usuário não autenticado |
| `500 Internal Server Error` | Erro inesperado no servidor |

---

### 2.2 Buscar Anamnese do Agendamento

**`GET /anamnesis/:appointmentId`**

Utilizado na tela de atendimento médico para exibir as informações de saúde preenchidas pelo paciente. Retorna um array vazio quando a anamnese não foi registrada — o frontend deve tratar esse caso exibindo a seção como não preenchida.

**Path params:**

| Campo | Tipo | Descrição |
|---|---|---|
| `appointmentId` | UUID | ID do agendamento cuja anamnese será buscada |

**Tabela de respostas:**

| Código | Situação |
|---|---|
| `200 OK` | Retorna array com a anamnese, ou array vazio se não foi preenchida |
| `401 Unauthorized` | Usuário não autenticado |
| `500 Internal Server Error` | Erro inesperado no servidor |

---

## 3. Modelo de Dados

### Anamnese (`anamnesis`)

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | UUID | Identificador único |
| `appointmentId` | UUID | Referência ao agendamento |
| `mainComplaint` | String \| null | Queixa principal |
| `painLevel` | Inteiro (0–3) \| null | Nível de dor (`0` Não · `1` Leve · `2` Moderada · `3` Intensa) |
| `takingMedication` | String \| null | Medicamentos em uso |
| `knownAllergy` | String \| null | Alergias conhecidas |
| `hadSurgery` | Boolean \| null | Se realizou cirurgia |
| `surgeryDetails` | String \| null | Detalhes da cirurgia |
| `familyHistory` | Boolean \| null | Se há histórico familiar |
| `familyHistoryDetails` | String \| null | Detalhes do histórico familiar |
| `isActive` | Boolean | Se o registro está ativo (padrão: `true`) |
| `createdAt` | DateTime | Data de criação |
| `updatedAt` | DateTime | Data da última atualização |
