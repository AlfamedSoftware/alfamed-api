import { desc, eq, and, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { db as dbType } from "../../db/client.js";
import { appointments } from "../../db/schema/appointments.js";
import { patients } from "../../db/schema/patients.js";
import { users } from "../../db/schema/users.js";
import { scheduleSlots } from "../../db/schema/schedule-slots.js";
import { schedules } from "../../db/schema/schedules.js";
import { appointmentsStatus } from "../../db/schema/appointments-status.js";
import { specialties } from "../../db/schema/specialties.js";
import { procedures } from "../../db/schema/procedures.js";
import { professionalUnits } from "../../db/schema/professional-units.js";
import { professionals } from "../../db/schema/professionals.js";
import { units } from "../../db/schema/units.js";
import { requests } from "../../db/schema/requests.js";
import { externalRequests } from "../../db/schema/external-requests.js";
import { requestsStatus } from "../../db/schema/requests-status.js";
import { requestResults } from "../../db/schema/request-results.js";

type DatabaseClient = typeof dbType;

export class MedicalRecordsRepository {
    constructor(private readonly db: DatabaseClient) { }

    async findActivePatientByUserId(userId: string) {
        const [row] = await this.db
            .select({
                id: patients.id,
                users: {
                    id: users.id,
                    name: users.name,
                    socialName: users.socialName,
                    email: users.email,
                    phone: users.phone,
                    cpf: users.cpf,
                    birthdate: users.birthdate,
                    sex: users.sex,
                    isActive: users.isActive,
                },
            })
            .from(patients)
            .innerJoin(users, eq(patients.userId, users.id))
            .where(and(
                eq(patients.userId, userId),
                eq(patients.isActive, true),
            ))
            .limit(1);

        return row ?? null;
    }

    async listMedicalRecordsByPatientId(patientId: string) {
        const professionalUser = alias(users, "professional_user");
        const internalProcedures = alias(procedures, "internal_procedures");
        const externalProcedures = alias(procedures, "external_procedures");

        const rows = await this.db
            .select({
                id: appointments.id,
                patientId: appointments.patientId,
                professionalUnitId: appointments.professionalUnitId,
                scheduleSlotId: appointments.scheduleSlotId,
                startAt: appointments.startAt,
                endAt: appointments.endAt,
                diagnostics: appointments.diagnostics,
                evolution: appointments.evolution,
                clinicNotes: appointments.clinicNotes,
                statusId: appointments.statusId,
                isActive: appointments.isActive,
                createdAt: appointments.createdAt,
                updatedAt: appointments.updatedAt,
                users: {
                    id: users.id,
                    name: users.name,
                    socialName: users.socialName,
                    email: users.email,
                    phone: users.phone,
                    cpf: users.cpf,
                    birthdate: users.birthdate,
                    sex: users.sex,
                    isActive: users.isActive,
                },
                schedules: {
                    id: schedules.id,
                    date: schedules.date,
                    startTime: schedules.startTime,
                    endTime: schedules.endTime,
                    durationMinutes: schedules.durationMinutes,
                    slots: schedules.slots,
                    emptySlots: schedules.emptySlots,
                    allocatedSlots: schedules.allocatedSlots,
                    isActive: schedules.isActive,
                },
                schedule_slots: {
                    id: scheduleSlots.id,
                    startTime: scheduleSlots.startTime,
                    endTime: scheduleSlots.endTime,
                    isAvailable: scheduleSlots.isAvailable,
                    isActive: scheduleSlots.isActive,
                },
                appointment_status: {
                    id: appointmentsStatus.id,
                    code: appointmentsStatus.code,
                    description: appointmentsStatus.description,
                    isActive: appointmentsStatus.isActive,
                },
                specialties: {
                    id: specialties.id,
                    name: specialties.name,
                    isActive: specialties.isActive,
                },
                procedures: {
                    id: procedures.id,
                    type: procedures.type,
                    description: procedures.description,
                    observation: procedures.observation,
                    code: procedures.code,
                    price: procedures.price,
                    isActive: procedures.isActive,
                },
                units: {
                    id: units.id,
                    name: units.name,
                    cnpj: units.cnpj,
                    address: units.address,
                    city: units.city,
                    state: units.state,
                    phone: units.phone,
                    email: units.email,
                    isActive: units.isActive,
                },
                professionals: {
                    id: professionals.id,
                    crm: professionals.crm,
                    isActive: professionals.isActive,
                },
                professional_user: {
                    id: professionalUser.id,
                    name: professionalUser.name,
                    socialName: professionalUser.socialName,
                    email: professionalUser.email,
                    phone: professionalUser.phone,
                    cpf: professionalUser.cpf,
                    sex: professionalUser.sex,
                    isActive: professionalUser.isActive,
                },
            })
            .from(appointments)
            .innerJoin(patients, eq(appointments.patientId, patients.id))
            .innerJoin(users, eq(patients.userId, users.id))
            .innerJoin(scheduleSlots, eq(appointments.scheduleSlotId, scheduleSlots.id))
            .innerJoin(schedules, eq(scheduleSlots.scheduleId, schedules.id))
            .innerJoin(appointmentsStatus, eq(appointments.statusId, appointmentsStatus.id))
            .innerJoin(specialties, eq(schedules.specialtyId, specialties.id))
            .innerJoin(procedures, eq(schedules.procedureId, procedures.id))
            .innerJoin(professionalUnits, eq(appointments.professionalUnitId, professionalUnits.id))
            .innerJoin(units, eq(professionalUnits.unitId, units.id))
            .innerJoin(professionals, eq(professionalUnits.professionalId, professionals.id))
            .innerJoin(professionalUser, eq(professionals.userId, professionalUser.id))
            .where(eq(appointments.patientId, patientId))
            .orderBy(desc(schedules.date), desc(scheduleSlots.startTime));

        return rows;
    }

    async listRequestsByAppointmentIds(appointmentIds: string[]) {
        if (appointmentIds.length === 0) return [];

        const internalProcedures = alias(procedures, "internal_procedures");
        const internalProceduresCols = {
            id: internalProcedures.id as any,
            type: internalProcedures.type as any,
            description: internalProcedures.description as any,
            observation: internalProcedures.observation as any,
            code: internalProcedures.code as any,
            price: internalProcedures.price as any,
            isActive: internalProcedures.isActive as any,
        };

        const rows = await this.db
            .select({
                id: requests.id,
                appointmentId: requests.appointmentId,
                procedureId: requests.procedureId,
                professionalUnitId: requests.professionalUnitId,
                complementaryInfo: requests.complementaryInfo,
                performedAt: requests.performedAt,
                justification: requests.justification,
                statusId: requests.statusId,
                isActive: requests.isActive,
                internalProcedures: internalProceduresCols,
                request_status: {
                    id: requestsStatus.id,
                    code: requestsStatus.code,
                    description: requestsStatus.description,
                    isActive: requestsStatus.isActive,
                } as any,
                request_results: {
                    id: requestResults.id,
                    requestId: requestResults.requestId,
                    professionalUnitId: requestResults.professionalUnitId,
                    complementaryInfo: requestResults.complementaryInfo,
                    attachmentUrl: requestResults.attachmentUrl,
                    releasedAt: requestResults.releasedAt,
                    isActive: requestResults.isActive,
                } as any,
            })
            .from(requests)
            .leftJoin(requestsStatus, eq(requests.statusId, requestsStatus.id))
            .leftJoin(requestResults, eq(requests.id, requestResults.requestId))
            .leftJoin(internalProcedures, eq(requests.procedureId, internalProcedures.id))
            .where(inArray(requests.appointmentId, appointmentIds));

        return rows;
    }

    async listExternalRequestsByAppointmentIds(appointmentIds: string[]) {
        if (appointmentIds.length === 0) return [];

        const externalProcedures = alias(procedures, "external_procedures");
        const externalProceduresCols = {
            id: externalProcedures.id as any,
            type: externalProcedures.type as any,
            description: externalProcedures.description as any,
            observation: externalProcedures.observation as any,
            code: externalProcedures.code as any,
            price: externalProcedures.price as any,
            isActive: externalProcedures.isActive as any,
        };

        const rows = await this.db
            .select({
                id: externalRequests.id,
                appointmentId: externalRequests.appointmentId,
                procedureId: externalRequests.procedureId,
                isActive: externalRequests.isActive,
                externalProcedures: externalProceduresCols,
            })
            .from(externalRequests)
            .leftJoin(externalProcedures, eq(externalRequests.procedureId, externalProcedures.id))
            .where(inArray(externalRequests.appointmentId, appointmentIds));

        return rows;
    }
}
