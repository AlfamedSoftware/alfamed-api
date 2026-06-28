# Regras de Negócio — Prontuário do Paciente

**Sistema:** Alfamed API  
**Módulo:** Medical Records  
**Data:** Junho/2026 — atualizado 27/06/2026  

---

## 1. Visão Geral

O módulo de prontuário expõe o histórico de consultas (appointments) de um paciente, com todos os dados relacionados resolvidos em uma única consulta ao banco.

---

## 2. Rotas

### 2.1 Listar Prontuário do Paciente

**`GET /medical-records/list-patient-medical-records`**

Retorna os dados do paciente e a lista de todos os seus appointments, ordenados por data de início **decrescente** (mais recente primeiro).

**Autenticação:** obrigatória

**Query params:**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `userId` | UUID | Sim | ID do usuário (`users.id`) |

**Estrutura da resposta (200):**

```json
{
  "id": "uuid",
  "name": "string",
  "socialName": "string | null",
  "email": "string",
  "phone": "string",
  "cpf": "string",
  "birthdate": "ISO datetime",
  "sex": "string | null",
  "isActive": true,
  "appointments": [
    {
      "id": "uuid",
      "patientId": "uuid",
      "professionalUnitId": "uuid",
      "scheduleSlotId": "uuid",
      "startAt": "ISO datetime | null",
      "endAt": "ISO datetime | null",
      "diagnostics": "string | null",
      "evolution": "string | null",
      "clinicNotes": "string | null",
      "statusId": "uuid",
      "isActive": true,
      "createdAt": "ISO datetime",
      "updatedAt": "ISO datetime",
      "schedules": {
        "id": "uuid",
        "date": "string",
        "startTime": "string",
        "endTime": "string",
        "durationMinutes": 30,
        "slots": 10,
        "emptySlots": 5,
        "allocatedSlots": 5,
        "isActive": true
      },
      "schedule_slots": {
        "id": "uuid",
        "startTime": "string",
        "endTime": "string",
        "isAvailable": false,
        "isActive": true
      },
      "appointment_status": {
        "id": "uuid",
        "code": 1,
        "description": "string",
        "isActive": true
      },
      "specialties": {
        "id": "uuid",
        "name": "string",
        "isActive": true
      },
      "procedures": {
        "id": "uuid",
        "type": 1,
        "description": "string",
        "observation": "string | null",
        "code": "string",
        "price": "string",
        "isActive": true
      },
      "units": {
        "id": "uuid",
        "name": "string",
        "cnpj": "string | null",
        "address": "string | null",
        "city": "string | null",
        "state": "string | null",
        "phone": "string | null",
        "email": "string | null",
        "isActive": true
      },
      "professionals": {
        "id": "uuid",
        "crm": "string | null",
        "isActive": true
      },
      "professional_user": {
        "id": "uuid",
        "name": "string",
        "socialName": "string | null",
        "email": "string",
        "phone": "string",
        "cpf": "string",
        "sex": "string | null",
        "isActive": true
      },
      "requests": [
        {
          "id": "uuid | null",
          "appointmentId": "uuid | null",
          "procedureId": "uuid | null",
          "professionalUnitId": "uuid | null",
          "complementaryInfo": "string | null",
          "performedAt": "ISO datetime | null",
          "justification": "string | null",
          "statusId": "uuid | null",
          "isActive": "boolean | null",
          "internalProcedures": {
            "id": "uuid | null",
            "type": "number | null",
            "description": "string | null",
            "observation": "string | null",
            "code": "string | null",
            "price": "string | null",
            "isActive": "boolean | null"
          },
          "request_status": {
            "id": "uuid | null",
            "code": "number | null",
            "description": "string | null",
            "isActive": "boolean | null"
          },
          "request_results": {
            "id": "uuid | null",
            "requestId": "uuid | null",
            "professionalUnitId": "uuid | null",
            "complementaryInfo": "string | null",
            "attachmentUrl": "string | null",
            "releasedAt": "ISO datetime | null",
            "isActive": "boolean | null"
          }
        }
      ],
      "external_requests": [
        {
          "id": "uuid | null",
          "appointmentId": "uuid | null",
          "procedureId": "uuid | null",
          "isActive": "boolean | null",
          "externalProcedures": {
            "id": "uuid | null",
            "type": "number | null",
            "description": "string | null",
            "observation": "string | null",
            "code": "string | null",
            "price": "string | null",
            "isActive": "boolean | null"
          }
        }
      ]
    }
  ]
}
```

**Tabela de respostas:**

| Código | Situação |
|---|---|
| `200 OK` | Retorna objeto com dados do paciente e appointments |
| `401 Unauthorized` | Usuário não autenticado (`"Não autorizado"`) |
| `404 Not Found` | Paciente não encontrado ou inativo |
| `500 Internal Server Error` | Erro inesperado no servidor |

---

## 3. Fluxo Interno

```
Route → Service → Repository (3 queries)
```

### 3.1 `MedicalRecordsRepository.findActivePatientByUserId(userId)`

Busca o patient vinculado ao `userId` com `isActive = true`, fazendo join com `users` para já trazer os dados do paciente. Retorna `null` se não encontrar.

### 3.2 `MedicalRecordsRepository.listMedicalRecordsByPatientId(patientId)`

Executa um único `SELECT` com 11 `INNER JOIN`s para trazer todos os dados dos appointments do paciente. Cadeia de joins:

```
appointments
  → patients               (appointments.patient_id)
  → users                  (patients.user_id)          — dados do paciente
  → schedule_slots         (appointments.schedule_slot_id)
  → schedules              (schedule_slots.schedule_id)
  → appointments_status    (appointments.status_id)
  → specialties            (schedules.specialty_id)
  → procedures             (schedules.procedure_id)
  → professional_units     (appointments.professional_unit_id)
  → units                  (professional_units.unit_id)
  → professionals          (professional_units.professional_id)
  → users AS professional_user (professionals.user_id) — dados do profissional
```

> `users` é joined duas vezes: uma para o paciente e outra (com alias `professional_user`) para o profissional.

### 3.3 `MedicalRecordsRepository.listRequestsByAppointmentIds(appointmentIds)`

Busca todos os pedidos internos (requests) para os appointments fornecidos, com LEFT JOINs para `requests_status`, `request_results` e `procedures` (como `internal_procedures`).

### 3.4 `MedicalRecordsRepository.listExternalRequestsByAppointmentIds(appointmentIds)`

Busca todos os pedidos externos (external_requests) para os appointments fornecidos, com LEFT JOIN para `procedures` (como `external_procedures`).

### 3.5 `MedicalRecordsService.listPatientMedicalRecords(userId)`

1. Chama `findActivePatientByUserId` → lança `PatientNotFoundError` se não encontrar
2. Chama `listMedicalRecordsByPatientId` com o `patient.id` retornado
3. Extrai os `appointmentIds` dos appointments retornados
4. Chama `listRequestsByAppointmentIds` e depois `listExternalRequestsByAppointmentIds` sequencialmente
5. Agrupa os requests e external_requests por `appointmentId` usando Maps
6. Monta a resposta final: dados do usuário vindos de `patient.users` (garante resposta mesmo com `appointments: []`), appointments mapeados com arrays de requests e external_requests
7. Valida e serializa via `listPatientMedicalRecordsResponseSchema`

---

## 4. Arquivos do Módulo

| Arquivo | Responsabilidade |
|---|---|
| `medical-records.routes.ts` | Definição da rota, validação de query param, tratamento de erros HTTP |
| `medical-records.service.ts` | Lógica de negócio, validação de paciente ativo, montagem da resposta |
| `medical-records.repository.ts` | Queries ao banco (Drizzle ORM), joins |
| `medical-records.schemas.ts` | Schemas Zod para validação e tipagem da resposta |
