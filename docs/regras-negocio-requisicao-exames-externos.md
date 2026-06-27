# Regras de Negócio — Requisição de Exames Externos (PDF)

**Sistema:** Alfamed API  
**Módulo:** External Requests — Geração de Requisição  
**Data:** Junho/2026 — criado 27/06/2026  

---

## 1. Visão Geral

Este módulo expõe uma rota para geração de um PDF de requisição médica a partir dos pedidos externos (`external_requests`) de um atendimento. O PDF reúne os dados da unidade, do paciente, do médico responsável e a lista de exames encaminhados, servindo como documento imprimível para o paciente levar a laboratórios ou clínicas parceiras.

> Para entender o domínio de pedidos externos (regras de criação, diferença com pedidos internos e fluxo de atendimento), consulte [regras-negocio-pedidos-externos.md](regras-negocio-pedidos-externos.md).

---

## 2. Rota

### `GET /external-requests/requisition/:appointmentId`

Gera e retorna o PDF da requisição de exames do atendimento.

**Autenticação:** obrigatória

**Parâmetros:**

| Parâmetro | Local | Tipo | Descrição |
|---|---|---|---|
| `appointmentId` | Path | UUID | ID do atendimento cujos pedidos externos serão incluídos |

**Resposta de sucesso:**

- **HTTP 200**
- `Content-Type: application/pdf`
- `Content-Disposition: inline; filename="requisicao-{appointmentId}.pdf"`
- Body: arquivo PDF binário

**Tabela de respostas:**

| Código | Situação |
|---|---|
| `200 OK` | PDF gerado e retornado |
| `401 Unauthorized` | Usuário não autenticado (`"Não autorizado"`) |
| `404 Not Found` | Atendimento não encontrado |
| `500 Internal Server Error` | Erro inesperado no servidor |

---

## 3. Conteúdo do PDF

O PDF segue o formato de uma requisição médica padrão, com as seguintes seções em ordem:

### 3.1 Cabeçalho — Unidade

| Campo | Fonte |
|---|---|
| Nome da unidade | `units.name` |
| Endereço | `units.address` |
| Cidade / Estado | `units.city`, `units.state` |
| Telefone | `units.phone` |

### 3.2 Título e Data

- Título centralizado: **"REQUISIÇÃO DE EXAMES"**
- Data de emissão (gerada no momento da requisição HTTP, não armazenada)

### 3.3 Dados do Paciente

| Campo | Fonte |
|---|---|
| Nome | `users.social_name` se preenchido, senão `users.name` |
| CPF | `users.cpf` (exibido formatado: `000.000.000-00`) |
| Data de nascimento | `users.birthdate` (formatada em `DD/MM/YYYY`) |

### 3.4 Dados do Médico

| Campo | Fonte |
|---|---|
| Nome | `users.name` (via `professional_user`) |
| CRM | `professionals.crm` (omitido se nulo) |

### 3.5 Lista de Exames

Para cada `external_request` vinculado ao atendimento:

```
• [code] — [description]
  Obs: [observation]   ← exibido apenas se observation não for null
```

Se não houver exames, exibe: `"Nenhum exame solicitado neste atendimento."`

### 3.6 Assinatura

Linha de assinatura centralizada com nome e CRM do médico abaixo.

---

## 4. Fluxo Interno

```
Route → Service → Repository (2 queries) → PDF Generator → Response
```

### 4.1 `ExternalRequestsRepository.findRequisitionData(appointmentId)`

Executa um `SELECT` com 5 `INNER JOIN`s para trazer todos os dados necessários ao cabeçalho e rodapé do PDF:

```
appointments
  → professional_units   (appointments.professional_unit_id)
  → units                (professional_units.unit_id)
  → professionals        (professional_units.professional_id)
  → users AS professional_user (professionals.user_id)
  → patients             (appointments.patient_id)
  → users AS patient_user      (patients.user_id)
```

Retorna `null` se o `appointmentId` não existir.

### 4.2 `ExternalRequestsRepository.listExamsByAppointmentId(appointmentId)`

Busca todos os pedidos externos do atendimento com `INNER JOIN` em `procedures`:

```
external_requests (where appointment_id = ?)
  → procedures (external_requests.procedure_id)
```

Seleciona apenas: `code`, `description`, `observation`.

### 4.3 `ExternalRequestsService.generateRequisitionPdf(appointmentId)`

1. Chama `findRequisitionData` → lança `RequisitionNotFoundError` se retornar `null`
2. Chama `listExamsByAppointmentId` com o mesmo `appointmentId`
3. Passa os dados combinados para `generateRequisitionPdf` (gerador de PDF)
4. Retorna o `Buffer` do PDF gerado

### 4.4 `generateRequisitionPdf(data)` — `external-requests.pdf.ts`

Função assíncrona que usa **PDFKit** para montar o documento:
- Cria um `PDFDocument` em formato A4
- Coleta os chunks via eventos `data` do stream e resolve o `Promise<Buffer>` no evento `end`
- Monta as seções na ordem descrita na seção 3

### 4.5 Route handler

Converte o `Buffer` em `Uint8Array` e retorna via `new Response(...)` com os headers corretos. Elysia não intercepta respostas `Response` nativas — o PDF é enviado diretamente ao cliente.

---

## 5. Arquivos do Módulo

| Arquivo | Responsabilidade |
|---|---|
| `external-requests.repository.ts` | Queries ao banco: dados do atendimento e lista de exames |
| `external-requests.service.ts` | Orquestra as queries e aciona o gerador de PDF |
| `external-requests.pdf.ts` | Geração do documento PDF com PDFKit |
| `external-requests.routes.ts` | Rota GET, autenticação, tratamento de erros, resposta binária |

---

## 6. Dependência

| Pacote | Versão | Uso |
|---|---|---|
| `pdfkit` | `^0.19.1` | Geração programática do PDF |
| `@types/pdfkit` | `^0.17.6` | Tipagens TypeScript |

---

## 7. Relacionamentos com outros módulos

| Módulo | Relação |
|--------|---------|
| **Pedidos Externos** | O PDF lista todos os `external_requests` do atendimento; consulte [regras-negocio-pedidos-externos.md](regras-negocio-pedidos-externos.md) |
| **Atendimentos** | O `appointmentId` é a chave de entrada — o atendimento determina paciente, médico e unidade |
| **Procedimentos** | Os exames listados são `procedures` cadastrados na unidade |
| **Prontuário** | Os mesmos `external_requests` aparecem no prontuário via `GET /medical-records/list-patient-medical-records`; a requisição em PDF é gerada separadamente, sob demanda |
