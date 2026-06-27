import { and, eq } from "drizzle-orm";
import type { z } from "zod";
import type { db as dbType } from "../../db/client.js";
import { appointments } from "../../db/schema/appointments.js";
import { appointmentLogs } from "../../db/schema/appointment-logs.js";
import { professionalUnits } from "../../db/schema/professional-units.js";
import { professionals } from "../../db/schema/professionals.js";
import { patients } from "../../db/schema/patients.js";
import { appointmentsStatus } from "../../db/schema/appointments-status.js";
import { scheduleSlots } from "../../db/schema/schedule-slots.js";
import { schedules } from "../../db/schema/schedules.js";
import { specialties } from "../../db/schema/specialties.js";
import { procedures } from "../../db/schema/procedures.js";
import { users } from "../../db/schema/users.js";
import { units } from "../../db/schema/units.js";
import { appointmentSchema } from "./appointments.schemas.js";
import { appointmentFullDataSchema } from "../attendiments/attendiments.schemas.js";

type DatabaseClient = typeof dbType;

export type AppointmentProfile = z.infer<typeof appointmentSchema>;
export type AppointmentFullData = z.infer<typeof appointmentFullDataSchema>;

export class AppointmentsRepository {
    constructor(private readonly db: DatabaseClient) {}

    async getStatusIdByCode(code: number): Promise<string> {
        const [status] = await this.db
            .select({ id: appointmentsStatus.id })
            .from(appointmentsStatus)
            .where(eq(appointmentsStatus.code, code))
            .limit(1);

        if (!status) {
            throw new Error("Invalid status code");
        }

        return status.id;
    }

    async checkSelfBooking(patientId: string, professionalUnitId: string): Promise<boolean> {
        // Get the patient's userId
        const [patient] = await this.db
            .select({ userId: patients.userId })
            .from(patients)
            .where(eq(patients.id, patientId))
            .limit(1);

        if (!patient) {
            throw new Error("Patient not found");
        }

        // Get the professional's userId through professional_unit -> professional
        const [professional] = await this.db
            .select({ userId: professionals.userId })
            .from(professionalUnits)
            .innerJoin(professionals, eq(professionalUnits.professionalId, professionals.id))
            .where(eq(professionalUnits.id, professionalUnitId))
            .limit(1);

        if (!professional) {
            throw new Error("Professional not found");
        }

        // Return true if they are the same user (self-booking)
        return patient.userId === professional.userId;
    }

    async create(data: {
        patientId: string;
        professionalUnitId: string;
        scheduleSlotId: string;
        statusId: string;
    }): Promise<AppointmentProfile> {
        const [inserted] = await this.db
            .insert(appointments)
            .values({
                patientId: data.patientId,
                professionalUnitId: data.professionalUnitId,
                scheduleSlotId: data.scheduleSlotId,
                statusId: data.statusId,
                isActive: true,
            })
            .returning({
                id: appointments.id,
            });

        const [row] = await this.db
            .select({
                id: appointments.id,
                patientId: appointments.patientId,
                professionalUnitId: appointments.professionalUnitId,
                scheduleSlotId: appointments.scheduleSlotId,
                startAt: appointments.startAt,
                endAt: appointments.endAt,
                diagnostics: appointments.diagnostics,
                evolution: appointments.evolution,
                statusId: appointments.statusId,
                isActive: appointments.isActive,
                createdAt: appointments.createdAt,
                updatedAt: appointments.updatedAt,
            })
            .from(appointments)
            .where(eq(appointments.id, inserted.id))
            .limit(1);

        return appointmentSchema.parse({
            ...row,
            startAt: row.startAt?.toISOString() ?? null,
            endAt: row.endAt?.toISOString() ?? null,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
        });
    }

    async updateById(
        appointmentId: string,
        data: {
            patientId?: string;
            professionalUnitId?: string;
            scheduleSlotId?: string;
            startAt?: Date | null;
            endAt?: Date | null;
            diagnostics?: string | null;
            evolution?: string | null;
            statusId?: string;
            isActive?: boolean;
        },
    ): Promise<AppointmentProfile | null> {
        const [updated] = await this.db
            .update(appointments)
            .set({
                ...(typeof data.patientId !== "undefined" ? { patientId: data.patientId } : {}),
                ...(typeof data.professionalUnitId !== "undefined" ? { professionalUnitId: data.professionalUnitId } : {}),
                ...(typeof data.scheduleSlotId !== "undefined" ? { scheduleSlotId: data.scheduleSlotId } : {}),
                ...(typeof data.startAt !== "undefined" ? { startAt: data.startAt } : {}),
                ...(typeof data.endAt !== "undefined" ? { endAt: data.endAt } : {}),
                ...(typeof data.diagnostics !== "undefined" ? { diagnostics: data.diagnostics } : {}),
                ...(typeof data.evolution !== "undefined" ? { evolution: data.evolution } : {}),
                ...(typeof data.statusId !== "undefined" ? { statusId: data.statusId } : {}),
                ...(typeof data.isActive !== "undefined" ? { isActive: data.isActive } : {}),
            })
            .where(and(eq(appointments.id, appointmentId), eq(appointments.isActive, true)))
            .returning({
                id: appointments.id,
            });

        if (!updated) {
            return null;
        }

        const [row] = await this.db
            .select({
                id: appointments.id,
                patientId: appointments.patientId,
                professionalUnitId: appointments.professionalUnitId,
                scheduleSlotId: appointments.scheduleSlotId,
                startAt: appointments.startAt,
                endAt: appointments.endAt,
                diagnostics: appointments.diagnostics,
                evolution: appointments.evolution,
                statusId: appointments.statusId,
                isActive: appointments.isActive,
                createdAt: appointments.createdAt,
                updatedAt: appointments.updatedAt,
            })
            .from(appointments)
            .where(eq(appointments.id, appointmentId))
            .limit(1);

        return appointmentSchema.parse({
            ...row,
            startAt: row.startAt?.toISOString() ?? null,
            endAt: row.endAt?.toISOString() ?? null,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
        });
    }

    async listNextAppointmentsByUserId(userId: string): Promise<AppointmentFullData[]> {
        const [pendingStatus] = await this.db
            .select({ id: appointmentsStatus.id })
            .from(appointmentsStatus)
            .where(eq(appointmentsStatus.code, 1))
            .limit(1);

        if (!pendingStatus) return [];

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
            .where(
                and(
                    eq(patients.userId, userId),
                    eq(appointments.statusId, pendingStatus.id),
                    eq(appointments.isActive, true),
                ),
            );

        return rows.map((row) => ({
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
        }));
    }

    async createAppointmentLog(appointmentId: string, oldStatusId: string | null, newStatusId: string, professionalUnitId: string): Promise<void> {
        // Get the user_id from professional_unit -> professional -> user
        const [professionalUnit] = await this.db
            .select({
                userId: professionals.userId,
            })
            .from(professionalUnits)
            .innerJoin(professionals, eq(professionalUnits.professionalId, professionals.id))
            .where(eq(professionalUnits.id, professionalUnitId))
            .limit(1);

        await this.db.insert(appointmentLogs).values({
            appointmentId,
            oldStatusId,
            newStatusId,
            changedBy: professionalUnit?.userId ?? null,
            observation: null,
        });
    }
}