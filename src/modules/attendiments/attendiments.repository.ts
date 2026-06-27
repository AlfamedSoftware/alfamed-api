import { and, asc, eq, inArray } from "drizzle-orm";
import type { z } from "zod";
import type { db as dbType } from "../../db/client.js";
import { appointments } from "../../db/schema/appointments.js";
import { appointmentLogs } from "../../db/schema/appointment-logs.js";
import { scheduleSlots } from "../../db/schema/schedule-slots.js";
import { schedules } from "../../db/schema/schedules.js";
import { specialties } from "../../db/schema/specialties.js";
import { procedures } from "../../db/schema/procedures.js";
import { patients } from "../../db/schema/patients.js";
import { users } from "../../db/schema/users.js";
import { professionals } from "../../db/schema/professionals.js";
import { professionalUnits } from "../../db/schema/professional-units.js";
import { units } from "../../db/schema/units.js";
import { appointmentsStatus } from "../../db/schema/appointments-status.js";
import { appointmentBySpecialtySchema, appointmentFullDataSchema } from "./attendiments.schemas.js";

export type AppointmentFullData = z.infer<typeof appointmentFullDataSchema>;

type DatabaseClient = typeof dbType;

export type AppointmentBySpecialty = z.infer<typeof appointmentBySpecialtySchema>;

export class AttendimentsRepository {
    constructor(private readonly db: DatabaseClient) {}

    async listAppointmentsBySpecialty(filters: {
        date: string;
        professionalUnitId?: string;
    }): Promise<AppointmentBySpecialty[]> {
        // Get status UUIDs for codes 1–4
        const activeStatuses = await this.db
            .select({ id: appointmentsStatus.id })
            .from(appointmentsStatus)
            .where(inArray(appointmentsStatus.code, [1, 2, 3, 4]));

        if (activeStatuses.length === 0) {
            return [];
        }

        // Build where conditions
        const whereConditions = [
            eq(appointments.isActive, true),
            inArray(appointments.statusId, activeStatuses.map((s) => s.id)),
            eq(schedules.date, filters.date),
        ];

        if (filters.professionalUnitId) {
            whereConditions.push(eq(appointments.professionalUnitId, filters.professionalUnitId));
        }

        // Get all appointments with status 1 or 2
        const activeAppointments = await this.db
            .select({
                appointmentId: appointments.id,
                appointmentPatientId: appointments.patientId,
                appointmentProfessionalUnitId: appointments.professionalUnitId,
                appointmentScheduleSlotId: appointments.scheduleSlotId,
                appointmentStartAt: appointments.startAt,
                appointmentEndAt: appointments.endAt,
                appointmentDiagnostics: appointments.diagnostics,
                appointmentEvolution: appointments.evolution,
                appointmentStatusId: appointments.statusId,
                appointmentIsActive: appointments.isActive,
                appointmentCreatedAt: appointments.createdAt,
                appointmentUpdatedAt: appointments.updatedAt,
                scheduleSlotId: scheduleSlots.id,
                scheduleSlotStartTime: scheduleSlots.startTime,
                scheduleSlotEndTime: scheduleSlots.endTime,
                scheduleId: scheduleSlots.scheduleId,
                scheduleDate: schedules.date,
                scheduleStartTime: schedules.startTime,
                scheduleEndTime: schedules.endTime,
                specialtyId: specialties.id,
                specialtyName: specialties.name,
                procedureId: procedures.id,
                procedureName: procedures.description,
                procedureDescription: procedures.observation,
                patientId: patients.id,
                patientUserId: patients.userId,
                userId: users.id,
                userEmail: users.email,
                statusCode: appointmentsStatus.code,
                statusDescription: appointmentsStatus.description,
            })
            .from(appointments)
            .innerJoin(scheduleSlots, eq(appointments.scheduleSlotId, scheduleSlots.id))
            .innerJoin(schedules, eq(scheduleSlots.scheduleId, schedules.id))
            .innerJoin(specialties, eq(schedules.specialtyId, specialties.id))
            .innerJoin(procedures, eq(schedules.procedureId, procedures.id))
            .innerJoin(patients, eq(appointments.patientId, patients.id))
            .innerJoin(users, eq(patients.userId, users.id))
            .innerJoin(appointmentsStatus, eq(appointments.statusId, appointmentsStatus.id))
            .where(and(...whereConditions))
            .orderBy(asc(appointmentsStatus.code), asc(scheduleSlots.startTime)) as unknown as Array<{
                appointmentId: string;
                appointmentPatientId: string;
                appointmentProfessionalUnitId: string;
                appointmentScheduleSlotId: string;
                appointmentStartAt: Date | null;
                appointmentEndAt: Date | null;
                appointmentDiagnostics: string | null;
                appointmentEvolution: string | null;
                appointmentStatusId: string;
                appointmentIsActive: boolean;
                appointmentCreatedAt: Date;
                appointmentUpdatedAt: Date;
                scheduleSlotId: string;
                scheduleSlotStartTime: string;
                scheduleSlotEndTime: string;
                scheduleId: string;
                scheduleDate: string;
                scheduleStartTime: string;
                scheduleEndTime: string;
                specialtyId: string;
                specialtyName: string;
                procedureId: string;
                procedureName: string;
                procedureDescription: string | null;
                patientId: string;
                patientUserId: string;
                userId: string;
                userEmail: string;
                statusCode: number;
                statusDescription: string;
            }>;

        // Group by specialty
        const specialtyMap = new Map<string, AppointmentBySpecialty>();

        for (const row of activeAppointments) {
            const key = row.specialtyId;
            
            if (!specialtyMap.has(key)) {
                specialtyMap.set(key, {
                    specialtyId: row.specialtyId,
                    specialtyName: row.specialtyName,
                    procedureId: row.procedureId,
                    procedureName: row.procedureName,
                    procedureDescription: row.procedureDescription,
                    appointments: [],
                });
            }

            const specialty = specialtyMap.get(key)!;
            specialty.appointments.push({
                id: row.appointmentId,
                patientId: row.appointmentPatientId,
                patientName: row.userEmail.split('@')[0],
                patientUserEmail: row.userEmail,
                professionalUnitId: row.appointmentProfessionalUnitId,
                scheduleSlotId: row.appointmentScheduleSlotId,
                scheduleSlotStartTime: row.scheduleSlotStartTime,
                scheduleSlotEndTime: row.scheduleSlotEndTime,
                scheduleDate: row.scheduleDate,
                scheduleStartTime: row.scheduleStartTime,
                scheduleEndTime: row.scheduleEndTime,
                startAt: row.appointmentStartAt?.toISOString() || null,
                endAt: row.appointmentEndAt?.toISOString() || null,
                diagnostics: row.appointmentDiagnostics || null,
                evolution: row.appointmentEvolution || null,
                statusId: row.appointmentStatusId,
                statusCode: row.statusCode,
                statusDescription: row.statusDescription,
                isActive: row.appointmentIsActive,
                createdAt: row.appointmentCreatedAt.toISOString(),
                updatedAt: row.appointmentUpdatedAt.toISOString(),
            });
        }

        return Array.from(specialtyMap.values());
    }

    async transitionAppointmentStatus(
        appointmentId: string,
        newStatusCode: number,
        extraFields?: {
            startAt?: Date | null;
            endAt?: Date | null;
            isActive?: boolean;
            diagnostics?: string | null;
            clinicNotes?: string | null;
        },
    ): Promise<{ success: boolean; scheduleSlotId?: string }> {
        const [current] = await this.db
            .select({
                statusId: appointments.statusId,
                professionalUnitId: appointments.professionalUnitId,
                scheduleSlotId: appointments.scheduleSlotId,
            })
            .from(appointments)
            .where(eq(appointments.id, appointmentId))
            .limit(1);

        if (!current) return { success: false };

        const [newStatus] = await this.db
            .select({ id: appointmentsStatus.id })
            .from(appointmentsStatus)
            .where(eq(appointmentsStatus.code, newStatusCode))
            .limit(1);

        if (!newStatus) throw new Error("Invalid status code");

        await this.db
            .update(appointments)
            .set({
                statusId: newStatus.id,
                ...(extraFields?.startAt !== undefined ? { startAt: extraFields.startAt } : {}),
                ...(extraFields?.endAt !== undefined ? { endAt: extraFields.endAt } : {}),
                ...(extraFields?.isActive !== undefined ? { isActive: extraFields.isActive } : {}),
                ...(extraFields?.diagnostics !== undefined ? { diagnostics: extraFields.diagnostics } : {}),
                ...(extraFields?.clinicNotes !== undefined ? { clinicNotes: extraFields.clinicNotes } : {}),
            })
            .where(eq(appointments.id, appointmentId));

        const [professionalUnit] = await this.db
            .select({ userId: professionals.userId })
            .from(professionalUnits)
            .innerJoin(professionals, eq(professionalUnits.professionalId, professionals.id))
            .where(eq(professionalUnits.id, current.professionalUnitId))
            .limit(1);

        await this.db.insert(appointmentLogs).values({
            appointmentId,
            oldStatusId: current.statusId,
            newStatusId: newStatus.id,
            changedBy: professionalUnit?.userId ?? null,
            observation: null,
        });

        //precisa verificar o campo se o procedimento executa internamnete
        //criar função no repository do procedures para verificar via ids que veio

        //criar pasta "requests" criar o schema e o repository com as duas funções de post
        //envia a lista de procedimentos selecionados para essa função do repository junto com o appointmentId
        //verifica campos do procedures se ele é realizado internamento
            //se for interno, grava eles no schema request
        //se for externo
            //gravar externo grava na schema external_request
            //externas (ver oq vai ser  feito com exames externo para o paciente)

        // interno (reagendar de algum jeito o exame interno, para o paciente)
        return { success: true, scheduleSlotId: current.scheduleSlotId };
    }

    async getAppointmentFullData(appointmentId: string): Promise<AppointmentFullData | null> {
        const rows = await this.db
            .select({
                appointmentId: appointments.id,
                appointmentPatientId: appointments.patientId,
                appointmentProfessionalUnitId: appointments.professionalUnitId,
                appointmentScheduleSlotId: appointments.scheduleSlotId,
                appointmentStartAt: appointments.startAt,
                appointmentEndAt: appointments.endAt,
                appointmentDiagnostics: appointments.diagnostics,
                appointmentEvolution: appointments.evolution,
                appointmentClinicNotes: appointments.clinicNotes,
                appointmentStatusId: appointments.statusId,
                appointmentIsActive: appointments.isActive,
                statusId: appointmentsStatus.id,
                statusCode: appointmentsStatus.code,
                statusDescription: appointmentsStatus.description,
                statusIsActive: appointmentsStatus.isActive,
                userId: users.id,
                userName: users.name,
                userSocialName: users.socialName,
                userCpf: users.cpf,
                userBirthdate: users.birthdate,
                userPhone: users.phone,
                userEmail: users.email,
                userSex: users.sex,
                userImage: users.image,
                userIsActive: users.isActive,
                scheduleId: schedules.id,
                scheduleDate: schedules.date,
                scheduleIsActive: schedules.isActive,
                scheduleSlotId: scheduleSlots.id,
                scheduleSlotStartTime: scheduleSlots.startTime,
                scheduleSlotEndTime: scheduleSlots.endTime,
                scheduleSlotIsActive: scheduleSlots.isActive,
                specialtyId: specialties.id,
                specialtyName: specialties.name,
                specialtyIsActive: specialties.isActive,
                procedureId: procedures.id,
                procedureType: procedures.type,
                procedureDescription: procedures.description,
                procedureObservation: procedures.observation,
                procedureCode: procedures.code,
                procedurePrice: procedures.price,
                procedureIsActive: procedures.isActive,
                unitId: units.id,
                unitName: units.name,
                unitCnpj: units.cnpj,
                unitAddress: units.address,
                unitCity: units.city,
                unitState: units.state,
                unitPhone: units.phone,
                unitEmail: units.email,
                unitIsActive: units.isActive,
            })
            .from(appointments)
            .innerJoin(scheduleSlots, eq(appointments.scheduleSlotId, scheduleSlots.id))
            .innerJoin(schedules, eq(scheduleSlots.scheduleId, schedules.id))
            .innerJoin(specialties, eq(schedules.specialtyId, specialties.id))
            .innerJoin(procedures, eq(schedules.procedureId, procedures.id))
            .innerJoin(patients, eq(appointments.patientId, patients.id))
            .innerJoin(users, eq(patients.userId, users.id))
            .innerJoin(appointmentsStatus, eq(appointments.statusId, appointmentsStatus.id))
            .innerJoin(professionalUnits, eq(appointments.professionalUnitId, professionalUnits.id))
            .innerJoin(units, eq(professionalUnits.unitId, units.id))
            .where(eq(appointments.id, appointmentId));

        if (rows.length === 0) return null;

        const row = rows[0];

        return {
            id: row.appointmentId,
            patientId: row.appointmentPatientId,
            professionalUnitId: row.appointmentProfessionalUnitId,
            scheduleSlotId: row.appointmentScheduleSlotId,
            startAt: row.appointmentStartAt?.toISOString() ?? null,
            endAt: row.appointmentEndAt?.toISOString() ?? null,
            diagnostics: row.appointmentDiagnostics ?? null,
            evolution: row.appointmentEvolution ?? null,
            clinicNotes: row.appointmentClinicNotes ?? null,
            statusId: row.appointmentStatusId,
            statusCode: row.statusCode,
            statusDescription: row.statusDescription,
            isActive: row.appointmentIsActive,
            users: {
                id: row.userId,
                name: row.userName,
                socialName: row.userSocialName ?? null,
                cpf: row.userCpf,
                birthdate: row.userBirthdate instanceof Date
                    ? row.userBirthdate.toISOString().split("T")[0]
                    : String(row.userBirthdate),
                phone: row.userPhone,
                email: row.userEmail,
                sex: row.userSex ?? null,
                image: row.userImage ?? null,
                isActive: row.userIsActive,
            },
            schedules: {
                id: row.scheduleId,
                date: row.scheduleDate,
                isActive: row.scheduleIsActive,
            },
            schedules_slots: {
                id: row.scheduleSlotId,
                startTime: row.scheduleSlotStartTime,
                endTime: row.scheduleSlotEndTime,
                isActive: row.scheduleSlotIsActive,
            },
            specialties: {
                id: row.specialtyId,
                name: row.specialtyName,
                isActive: row.specialtyIsActive,
            },
            procedures: {
                id: row.procedureId,
                type: row.procedureType,
                description: row.procedureDescription,
                observation: row.procedureObservation ?? null,
                code: row.procedureCode,
                price: row.procedurePrice,
                isActive: row.procedureIsActive,
            },
            appointment_status: {
                id: row.statusId,
                code: row.statusCode,
                description: row.statusDescription,
                isActive: row.statusIsActive,
            },
            units: {
                id: row.unitId,
                name: row.unitName,
                cnpj: row.unitCnpj ?? null,
                address: row.unitAddress ?? null,
                city: row.unitCity ?? null,
                state: row.unitState ?? null,
                phone: row.unitPhone ?? null,
                email: row.unitEmail ?? null,
                isActive: row.unitIsActive,
            },
        };
    }
}
