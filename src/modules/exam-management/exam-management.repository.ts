import { and, asc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { z } from "zod";
import type { db as dbType } from "../../db/client.js";
import { appointments } from "../../db/schema/appointments.js";
import { scheduleSlots } from "../../db/schema/schedule-slots.js";
import { schedules } from "../../db/schema/schedules.js";
import { patients } from "../../db/schema/patients.js";
import { users } from "../../db/schema/users.js";
import { professionalUnits } from "../../db/schema/professional-units.js";
import { professionals } from "../../db/schema/professionals.js";
import { requests } from "../../db/schema/requests.js";
import { requestLogs } from "../../db/schema/request-logs.js";
import { requestResults } from "../../db/schema/request-results.js";
import { requestsStatus } from "../../db/schema/requests-status.js";
import { procedures } from "../../db/schema/procedures.js";
import { specialties } from "../../db/schema/specialties.js";
import { examManagementItemSchema, examManagementSummaryItemSchema } from "./exam-management.schemas.js";

type DatabaseClient = typeof dbType;

export type ExamManagementItem = z.infer<typeof examManagementItemSchema>;
export type ExamManagementSummaryItem = z.infer<typeof examManagementSummaryItemSchema>;

export type ListExamManagementFilters = {
    date?: string;
    statusCode?: number;
};

const patientUsers = alias(users, "patient_users");
const professionalUsers = alias(users, "professional_users");
const scheduleProcedures = alias(procedures, "schedule_procedures");

export class ExamManagementRepository {
    constructor(private readonly db: DatabaseClient) { }

    async listSummary(filters: { date?: string; statusCode?: number; professionalUnitId?: string } = {}): Promise<ExamManagementSummaryItem[]> {
        const conditions: SQL[] = [
            eq(appointments.isActive, true),
            eq(requests.isActive, true),
        ];

        if (filters.date) {
            conditions.push(eq(schedules.date, filters.date));
        }

        if (filters.professionalUnitId) {
            conditions.push(eq(appointments.professionalUnitId, filters.professionalUnitId));
        }

        if (filters.statusCode) {
            conditions.push(eq(requestsStatus.code, filters.statusCode));
        }

        const rows = await this.db
            .select({
                appointmentId: appointments.id,
                patientName: patientUsers.name,
                patientSocialName: patientUsers.socialName,
                patientCpf: patientUsers.cpf,
                professionalUserName: professionalUsers.name,
                specialtyName: specialties.name,
                procedureDescription: scheduleProcedures.description,
                requestCount: sql<number>`count(${requests.id})::int`,
            })
            .from(appointments)
            .innerJoin(requests, eq(requests.appointmentId, appointments.id))
            .innerJoin(requestsStatus, eq(requests.statusId, requestsStatus.id))
            .innerJoin(scheduleSlots, eq(appointments.scheduleSlotId, scheduleSlots.id))
            .innerJoin(schedules, eq(scheduleSlots.scheduleId, schedules.id))
            .innerJoin(scheduleProcedures, eq(schedules.procedureId, scheduleProcedures.id))
            .innerJoin(specialties, eq(schedules.specialtyId, specialties.id))
            .innerJoin(patients, eq(appointments.patientId, patients.id))
            .innerJoin(patientUsers, eq(patients.userId, patientUsers.id))
            .innerJoin(professionalUnits, eq(appointments.professionalUnitId, professionalUnits.id))
            .innerJoin(professionals, eq(professionalUnits.professionalId, professionals.id))
            .innerJoin(professionalUsers, eq(professionals.userId, professionalUsers.id))
            .where(and(...conditions))
            .groupBy(
                appointments.id,
                patientUsers.name,
                patientUsers.socialName,
                patientUsers.cpf,
                professionalUsers.name,
                specialties.name,
                scheduleProcedures.description,
                schedules.date,
                scheduleSlots.startTime,
            )
            .orderBy(asc(schedules.date), asc(scheduleSlots.startTime));

        return rows.map((row) => ({
            id: row.appointmentId,
            patients: {
                name: row.patientName,
                socialName: row.patientSocialName ?? null,
                cpf: row.patientCpf,
            },
            professional_units: {
                professional: {
                    user: {
                        name: row.professionalUserName,
                    },
                },
            },
            schedules: {
                specialties: {
                    name: row.specialtyName,
                },
                procedures: {
                    description: row.procedureDescription,
                },
            },
            requestCount: row.requestCount,
        }));
    }

    // --- helpers privados ---

    private async getActiveRequests(appointmentId: string) {
        return this.db
            .select({ id: requests.id, statusId: requests.statusId })
            .from(requests)
            .where(and(eq(requests.appointmentId, appointmentId), eq(requests.isActive, true)));
    }

    private async getStatusByCode(code: number) {
        const [status] = await this.db
            .select({ id: requestsStatus.id })
            .from(requestsStatus)
            .where(eq(requestsStatus.code, code))
            .limit(1);
        return status ?? null;
    }

    private async insertLogs(
        items: { id: string; statusId: string }[],
        newStatusId: string,
        changedByUserId: string,
    ) {
        await this.db.insert(requestLogs).values(
            items.map((r) => ({
                requestId: r.id,
                oldStatusId: r.statusId,
                newStatusId,
                changedBy: changedByUserId,
                observation: null,
            })),
        );
    }

    private async insertResults(items: { id: string }[], complementaryInfo?: string | null) {
        await this.db.insert(requestResults).values(
            items.map((r) => ({
                requestId: r.id,
                professionalUnitId: null,
                complementaryInfo: complementaryInfo ?? null,
            })),
        );
    }

    // --- transições de status ---

    async liberarRequestsByAppointment(appointmentId: string, changedByUserId: string): Promise<{ success: boolean }> {
        const activeRequests = await this.getActiveRequests(appointmentId);
        if (activeRequests.length === 0) return { success: false };

        const newStatus = await this.getStatusByCode(2);
        if (!newStatus) throw new Error("Request status code 2 (Aguardando realização) not found");

        await this.db
            .update(requests)
            .set({ statusId: newStatus.id })
            .where(inArray(requests.id, activeRequests.map((r) => r.id)));

        await this.insertLogs(activeRequests, newStatus.id, changedByUserId);

        return { success: true };
    }

    async iniciarRequestsByAppointment(
        appointmentId: string,
        professionalUnitId: string,
        changedByUserId: string,
    ): Promise<{ success: boolean }> {
        const activeRequests = await this.getActiveRequests(appointmentId);
        if (activeRequests.length === 0) return { success: false };

        const newStatus = await this.getStatusByCode(3);
        if (!newStatus) throw new Error("Request status code 3 (Paciente em exame) not found");

        await this.db
            .update(requests)
            .set({ statusId: newStatus.id, professionalUnitId: professionalUnitId })
            .where(inArray(requests.id, activeRequests.map((r) => r.id)));

        await this.insertLogs(activeRequests, newStatus.id, changedByUserId);

        return { success: true };
    }

    async iniciarLaudoByAppointment(
        appointmentId: string,
        professionalUnitId: string,
        changedByUserId: string,
    ): Promise<{ success: boolean }> {
        const activeRequests = await this.getActiveRequests(appointmentId);
        if (activeRequests.length === 0) return { success: false };

        const newStatus = await this.getStatusByCode(5);
        if (!newStatus) throw new Error("Request status code 5 (Laudo em análise) not found");

        const ids = activeRequests.map((r) => r.id);

        await this.db
            .update(requests)
            .set({ statusId: newStatus.id })
            .where(inArray(requests.id, ids));

        await this.db
            .update(requestResults)
            .set({ professionalUnitId })
            .where(inArray(requestResults.requestId, ids));

        await this.insertLogs(activeRequests, newStatus.id, changedByUserId);

        return { success: true };
    }

    async encerrarRequestsByAppointment(
        appointmentId: string,
        statusCode: 7 | 8,
        justification: string,
        changedByUserId: string,
    ): Promise<{ success: boolean }> {
        const activeRequests = await this.getActiveRequests(appointmentId);
        if (activeRequests.length === 0) return { success: false };

        const newStatus = await this.getStatusByCode(statusCode);
        if (!newStatus) throw new Error(`Request status code ${statusCode} not found`);

        await this.db
            .update(requests)
            .set({ statusId: newStatus.id, justification })
            .where(inArray(requests.id, activeRequests.map((r) => r.id)));

        await this.insertLogs(activeRequests, newStatus.id, changedByUserId);

        return { success: true };
    }

    async finalizarLaudoByAppointment(
        appointmentId: string,
        attachmentUrl: string,
        changedByUserId: string,
        complementaryInfo?: string | null,
    ): Promise<{ success: boolean }> {
        const activeRequests = await this.getActiveRequests(appointmentId);
        if (activeRequests.length === 0) return { success: false };

        const newStatus = await this.getStatusByCode(6);
        if (!newStatus) throw new Error("Request status code 6 (Laudo liberado) not found");

        const ids = activeRequests.map((r) => r.id);

        await this.db
            .update(requests)
            .set({ statusId: newStatus.id })
            .where(inArray(requests.id, ids));

        await this.db
            .update(requestResults)
            .set({
                attachmentUrl,
                releasedAt: new Date(),
                ...(complementaryInfo !== undefined ? { complementaryInfo } : {}),
            })
            .where(inArray(requestResults.requestId, ids));

        await this.insertLogs(activeRequests, newStatus.id, changedByUserId);

        return { success: true };
    }

    async finalizarRequestsByAppointment(
        appointmentId: string,
        changedByUserId: string,
        complementaryInfo?: string | null,
    ): Promise<{ success: boolean }> {
        const activeRequests = await this.getActiveRequests(appointmentId);
        if (activeRequests.length === 0) return { success: false };

        const newStatus = await this.getStatusByCode(4);
        if (!newStatus) throw new Error("Request status code 4 (Aguardando análise) not found");

        await this.db
            .update(requests)
            .set({
                statusId: newStatus.id,
                performedAt: new Date(),
                ...(complementaryInfo !== undefined ? { complementaryInfo } : {}),
            })
            .where(inArray(requests.id, activeRequests.map((r) => r.id)));

        await this.insertResults(activeRequests);
        
        await this.insertLogs(activeRequests, newStatus.id, changedByUserId);

        return { success: true };
    }

    async findByAppointmentId(appointmentId: string): Promise<ExamManagementItem | null> {
        const rows = await this.db
            .select({
                scheduleId: schedules.id,
                scheduleDate: schedules.date,
                scheduleStartTime: schedules.startTime,
                scheduleEndTime: schedules.endTime,
                scheduleSlotId: scheduleSlots.id,
                scheduleSlotStartTime: scheduleSlots.startTime,
                scheduleSlotEndTime: scheduleSlots.endTime,
                appointmentId: appointments.id,
                appointmentStatusId: appointments.statusId,
                appointmentIsActive: appointments.isActive,
                appointmentCreatedAt: appointments.createdAt,
                appointmentUpdatedAt: appointments.updatedAt,
                patientId: patients.id,
                patientName: patientUsers.name,
                patientSocialName: patientUsers.socialName,
                patientCpf: patientUsers.cpf,
                patientPhone: patientUsers.phone,
                patientEmail: patientUsers.email,
                patientSex: patientUsers.sex,
                patientBirthdate: patientUsers.birthdate,
                professionalUnitId: professionalUnits.id,
                professionalId: professionals.id,
                professionalCrm: professionals.crm,
                professionalUserId: professionalUsers.id,
                professionalUserName: professionalUsers.name,
                requestId: requests.id,
                requestStatusId: requests.statusId,
                requestStatusCode: requestsStatus.code,
                requestStatusDescription: requestsStatus.description,
                requestPerformedAt: requests.performedAt,
                requestComplementaryInfo: requests.complementaryInfo,
                requestJustification: requests.justification,
                requestCreatedAt: requests.createdAt,
                requestUpdatedAt: requests.updatedAt,
                procedureId: procedures.id,
                procedureDescription: procedures.description,
                procedureCode: procedures.code,
                procedurePrice: procedures.price,
                scheduleProcedureId: scheduleProcedures.id,
                scheduleProcedureDescription: scheduleProcedures.description,
                scheduleProcedureCode: scheduleProcedures.code,
                specialtyId: specialties.id,
                specialtyName: specialties.name,
            })
            .from(appointments)
            .innerJoin(requests, eq(requests.appointmentId, appointments.id))
            .innerJoin(requestsStatus, eq(requests.statusId, requestsStatus.id))
            .innerJoin(procedures, eq(requests.procedureId, procedures.id))
            .innerJoin(scheduleSlots, eq(appointments.scheduleSlotId, scheduleSlots.id))
            .innerJoin(schedules, eq(scheduleSlots.scheduleId, schedules.id))
            .innerJoin(scheduleProcedures, eq(schedules.procedureId, scheduleProcedures.id))
            .innerJoin(specialties, eq(schedules.specialtyId, specialties.id))
            .innerJoin(patients, eq(appointments.patientId, patients.id))
            .innerJoin(patientUsers, eq(patients.userId, patientUsers.id))
            .innerJoin(professionalUnits, eq(appointments.professionalUnitId, professionalUnits.id))
            .innerJoin(professionals, eq(professionalUnits.professionalId, professionals.id))
            .innerJoin(professionalUsers, eq(professionals.userId, professionalUsers.id))
            .where(and(eq(appointments.id, appointmentId), eq(requests.isActive, true)));

        if (rows.length === 0) return null;

        const first = rows[0];

        const item: ExamManagementItem = {
            id: first.appointmentId,
            statusId: first.appointmentStatusId,
            isActive: first.appointmentIsActive,
            createdAt: first.appointmentCreatedAt.toISOString(),
            updatedAt: first.appointmentUpdatedAt.toISOString(),
            schedules: {
                id: first.scheduleId,
                date: first.scheduleDate,
                startTime: first.scheduleStartTime,
                endTime: first.scheduleEndTime,
                procedures: {
                    id: first.scheduleProcedureId,
                    description: first.scheduleProcedureDescription,
                    code: first.scheduleProcedureCode,
                },
                specialties: {
                    id: first.specialtyId,
                    name: first.specialtyName,
                },
            },
            schedules_slots: {
                id: first.scheduleSlotId,
                startTime: first.scheduleSlotStartTime,
                endTime: first.scheduleSlotEndTime,
            },
            patients: {
                id: first.patientId,
                name: first.patientName,
                socialName: first.patientSocialName ?? null,
                cpf: first.patientCpf,
                phone: first.patientPhone,
                email: first.patientEmail,
                sex: first.patientSex ?? null,
                birthdate: first.patientBirthdate instanceof Date
                    ? first.patientBirthdate.toISOString().split("T")[0]
                    : String(first.patientBirthdate),
            },
            professional_units: {
                id: first.professionalUnitId,
                professional: {
                    id: first.professionalId,
                    crm: first.professionalCrm ?? null,
                    user: {
                        id: first.professionalUserId,
                        name: first.professionalUserName,
                    },
                },
            },
            requests: rows.map((row) => ({
                id: row.requestId,
                statusId: row.requestStatusId,
                statusCode: row.requestStatusCode,
                statusDescription: row.requestStatusDescription,
                performedAt: row.requestPerformedAt?.toISOString() ?? null,
                complementaryInfo: row.requestComplementaryInfo ?? null,
                justification: row.requestJustification ?? null,
                procedures: {
                    id: row.procedureId,
                    description: row.procedureDescription,
                    code: row.procedureCode,
                    price: row.procedurePrice,
                },
                createdAt: row.requestCreatedAt.toISOString(),
                updatedAt: row.requestUpdatedAt.toISOString(),
            })),
        };

        return item;
    }
}
