import { and, eq, gt, lt, or } from "drizzle-orm";
import type { db as dbType } from "../../db/client.js";
import { appointments } from "../../db/schema/appointments.js";
import { appointmentsStatus } from "../../db/schema/appointments-status.js";
import { professionalAvailabilityBlocks } from "../../db/schema/professional-availability-blocks.js";
import { professionalUnits } from "../../db/schema/professional-units.js";
import { professionals } from "../../db/schema/professionals.js";
import { patients } from "../../db/schema/patients.js";
import { schedules } from "../../db/schema/schedules.js";
import { units } from "../../db/schema/units.js";
import { DomainError } from "../../http/plugins/domain-error.js";

type DatabaseClient = typeof dbType;

export type ScheduleRow = {
    specialtyId: string | null;
    startTime: string;
    endTime: string;
    appointmentDurationMinutes: number;
};

export type TimeRange = {
    startAt: Date;
    endAt: Date;
};

export type CreatedAppointment = {
    id: string;
    patientId: string;
    professionalUnitId: string;
    startAt: Date;
    endAt: Date;
    reason: string | null;
};

export type CreateAppointmentData = {
    patientId: string;
    professionalUnitId: string;
    startAt: Date;
    endAt: Date;
    reason?: string | null;
    statusId: string;
    specialtyId?: string | null;
};

export interface IPatientAppointmentsRepository {
    findPatientIdByUserId(userId: string): Promise<string | null>;
    findActiveProfessionalUnit(professionalId: string, unitId: string): Promise<{ professionalUnitId: string } | null>;
    getSchedulesForDay(professionalUnitId: string, dayOfWeek: number): Promise<ScheduleRow[]>;
    getAppointmentsForDay(professionalUnitId: string, dayStart: Date, dayEnd: Date): Promise<TimeRange[]>;
    getBlocksForDay(professionalUnitId: string, dayStart: Date, dayEnd: Date): Promise<TimeRange[]>;
    createAppointment(input: CreateAppointmentData): Promise<CreatedAppointment>;
    findOrCreateScheduledStatus(): Promise<string>;
}

export class PatientAppointmentsRepository implements IPatientAppointmentsRepository {
    constructor(private readonly db: DatabaseClient) {}

    async findPatientIdByUserId(userId: string): Promise<string | null> {
        const [row] = await this.db
            .select({ id: patients.id })
            .from(patients)
            .where(eq(patients.userId, userId))
            .limit(1);

        return row?.id ?? null;
    }

    async findActiveProfessionalUnit(professionalId: string, unitId: string): Promise<{ professionalUnitId: string } | null> {
        const [row] = await this.db
            .select({ professionalUnitId: professionalUnits.id })
            .from(professionalUnits)
            .innerJoin(professionals, eq(professionals.id, professionalUnits.professionalId))
            .innerJoin(units, eq(units.id, professionalUnits.unitId))
            .where(
                and(
                    eq(professionals.id, professionalId),
                    eq(professionalUnits.unitId, unitId),
                    eq(professionals.isActive, true),
                    eq(professionalUnits.isActive, true),
                    eq(units.isActive, true),
                ),
            )
            .limit(1);

        return row ?? null;
    }

    async getSchedulesForDay(professionalUnitId: string, dayOfWeek: number): Promise<ScheduleRow[]> {
        return this.db
            .select({
                specialtyId: schedules.specialtyId,
                startTime: schedules.startTime,
                endTime: schedules.endTime,
                appointmentDurationMinutes: schedules.appointmentDurationMinutes,
            })
            .from(schedules)
            .where(
                and(
                    eq(schedules.professionalUnitId, professionalUnitId),
                    eq(schedules.dayOfWeek, dayOfWeek),
                    eq(schedules.isActive, true),
                ),
            );
    }

    async getAppointmentsForDay(professionalUnitId: string, dayStart: Date, dayEnd: Date): Promise<TimeRange[]> {
        const rows = await this.db
            .select({
                startAt: appointments.startAt,
                endAt: appointments.endAt,
            })
            .from(appointments)
            .where(
                and(
                    eq(appointments.professionalUnitId, professionalUnitId),
                    eq(appointments.isActive, true),
                    lt(appointments.startAt, dayEnd),
                    gt(appointments.endAt, dayStart),
                ),
            );

        return rows.map((r) => ({ startAt: new Date(r.startAt), endAt: new Date(r.endAt) }));
    }

    async getBlocksForDay(professionalUnitId: string, dayStart: Date, dayEnd: Date): Promise<TimeRange[]> {
        const rows = await this.db
            .select({
                startAt: professionalAvailabilityBlocks.startAt,
                endAt: professionalAvailabilityBlocks.endAt,
            })
            .from(professionalAvailabilityBlocks)
            .where(
                and(
                    eq(professionalAvailabilityBlocks.professionalUnitId, professionalUnitId),
                    eq(professionalAvailabilityBlocks.isActive, true),
                    lt(professionalAvailabilityBlocks.startAt, dayEnd),
                    gt(professionalAvailabilityBlocks.endAt, dayStart),
                ),
            );

        return rows.map((r) => ({ startAt: new Date(r.startAt), endAt: new Date(r.endAt) }));
    }

    async createAppointment(input: CreateAppointmentData): Promise<CreatedAppointment> {
        try {
            const [created] = await this.db
                .insert(appointments)
                .values({
                    patientId: input.patientId,
                    professionalUnitId: input.professionalUnitId,
                    specialtyId: input.specialtyId ?? null,
                    startAt: input.startAt,
                    endAt: input.endAt,
                    statusId: input.statusId,
                    reason: input.reason ?? null,
                })
                .returning({
                    id: appointments.id,
                    patientId: appointments.patientId,
                    professionalUnitId: appointments.professionalUnitId,
                    startAt: appointments.startAt,
                    endAt: appointments.endAt,
                    reason: appointments.reason,
                });

            return created;
        } catch (error: any) {
            // PostgreSQL unique violation error code
            if (error?.code === "23505") {
                throw new DomainError("NO_SLOTS_AVAILABLE", "Horário não disponível");
            }
            throw error;
        }
    }

    async findOrCreateScheduledStatus(): Promise<string> {
        const [existing] = await this.db
            .select({ id: appointmentsStatus.id })
            .from(appointmentsStatus)
            .where(or(eq(appointmentsStatus.name, "scheduled"), eq(appointmentsStatus.name, "agendado")))
            .limit(1);

        if (existing) return existing.id;

        return this.db.transaction(async (tx) => {
            const [created] = await tx
                .insert(appointmentsStatus)
                .values({ name: "scheduled", description: "Consulta agendada" })
                .returning({ id: appointmentsStatus.id });

            return created.id;
        });
    }
}
