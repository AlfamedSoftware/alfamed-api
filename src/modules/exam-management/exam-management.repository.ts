import { and, asc, eq, type SQL } from "drizzle-orm";
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
import { requestsStatus } from "../../db/schema/requests-status.js";
import { procedures } from "../../db/schema/procedures.js";
import { specialties } from "../../db/schema/specialties.js";
import { examManagementItemSchema } from "./exam-management.schemas.js";

type DatabaseClient = typeof dbType;

export type ExamManagementItem = z.infer<typeof examManagementItemSchema>;

export type ListExamManagementFilters = {
    professionalUserId?: string;
    date?: string;
    statusCode?: number;
};

const patientUsers = alias(users, "patient_users");
const professionalUsers = alias(users, "professional_users");
const scheduleProcedures = alias(procedures, "schedule_procedures");

export class ExamManagementRepository {
    constructor(private readonly db: DatabaseClient) { }

    async list(filters: ListExamManagementFilters = {}): Promise<ExamManagementItem[]> {
        const conditions: SQL[] = [
            eq(appointments.isActive, true),
            eq(requests.isActive, true),
        ];

        if (filters.date) {
            conditions.push(eq(schedules.date, filters.date));
        }

        if (filters.statusCode !== undefined) {
            conditions.push(eq(requestsStatus.code, filters.statusCode));
        }

        if (filters.professionalUserId) {
            conditions.push(eq(professionals.userId, filters.professionalUserId));
        }

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
            .where(and(...conditions))
            .orderBy(asc(schedules.date), asc(scheduleSlots.startTime));

        const appointmentMap = new Map<string, ExamManagementItem>();

        for (const row of rows) {
            if (!appointmentMap.has(row.appointmentId)) {
                appointmentMap.set(row.appointmentId, {
                    id: row.appointmentId,
                    statusId: row.appointmentStatusId,
                    isActive: row.appointmentIsActive,
                    createdAt: row.appointmentCreatedAt.toISOString(),
                    updatedAt: row.appointmentUpdatedAt.toISOString(),
                    schedules: {
                        id: row.scheduleId,
                        date: row.scheduleDate,
                        startTime: row.scheduleStartTime,
                        endTime: row.scheduleEndTime,
                        procedures: {
                            id: row.scheduleProcedureId,
                            description: row.scheduleProcedureDescription,
                            code: row.scheduleProcedureCode,
                        },
                        specialties: {
                            id: row.specialtyId,
                            name: row.specialtyName,
                        },
                    },
                    schedules_slots: {
                        id: row.scheduleSlotId,
                        startTime: row.scheduleSlotStartTime,
                        endTime: row.scheduleSlotEndTime,
                    },
                    patients: {
                        id: row.patientId,
                        name: row.patientName,
                        socialName: row.patientSocialName ?? null,
                        cpf: row.patientCpf,
                        phone: row.patientPhone,
                        email: row.patientEmail,
                        sex: row.patientSex ?? null,
                        birthdate: row.patientBirthdate instanceof Date
                            ? row.patientBirthdate.toISOString().split("T")[0]
                            : String(row.patientBirthdate),
                    },
                    professional_units: {
                        id: row.professionalUnitId,
                        professional: {
                            id: row.professionalId,
                            crm: row.professionalCrm ?? null,
                            user: {
                                id: row.professionalUserId,
                                name: row.professionalUserName,
                            },
                        },
                    },
                    requests: [],
                });
            }

            appointmentMap.get(row.appointmentId)!.requests.push({
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
            });
        }

        return Array.from(appointmentMap.values());
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
