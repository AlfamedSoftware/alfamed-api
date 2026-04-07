import { and, eq, lt, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { z } from "zod";
import type { db as dbType } from "../../db/client.js";
import { appointments } from "../../db/schema/appointments.js";
import { appointmentStatusLogs } from "../../db/schema/appointment-status-logs.js";
import { appointmentsStatus } from "../../db/schema/appointments-status.js";
import { patients } from "../../db/schema/patients.js";
import { professionalUnits } from "../../db/schema/professional-units.js";
import { professionals } from "../../db/schema/professionals.js";
import { requests } from "../../db/schema/requests.js";
import { requestsStatus } from "../../db/schema/requests-status.js";
import { requestStatusLogs } from "../../db/schema/request-status-logs.js";
import { schedules } from "../../db/schema/schedules.js";
import { users } from "../../db/schema/users.js";
import {
    appointmentRequestProfileSchema,
    availabilityQuerySchema,
    createScheduleSchema,
    scheduleProfileSchema,
    updateScheduleSchema,
} from "./appointments.schemas.js";
import { DomainError } from "../../http/plugins/domain-error.js";

type DatabaseClient = typeof dbType;

export type ScheduleProfile = z.infer<typeof scheduleProfileSchema>;
export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
export type AppointmentRequestProfile = z.infer<typeof appointmentRequestProfileSchema>;

type ScheduleContext = {
    id: string;
    professionalUnitId: string;
    unitId: string;
    professionalId: string;
    slots: number;
    slotsUsed: number;
    isActive: boolean;
};

type RequestContext = {
    id: string;
    appointmentId: string;
    status: string;
    type: string;
    patientUserId: string;
    unitId: string;
    professionalId: string;
    scheduleId: string;
};

export class AppointmentsRepository {
    readonly findProfessionalIdByUserId: (userId: string) => Promise<string | null>;
    readonly findPatientIdByUserId: (userId: string) => Promise<string | null>;
    readonly findProfessionalUnit: (professionalUnitId: string) => Promise<{ professionalId: string; unitId: string } | null>;
    readonly findScheduleContextById: (scheduleId: string) => Promise<ScheduleContext | null>;
    readonly createSchedule: (data: CreateScheduleInput) => Promise<ScheduleProfile>;
    readonly updateSchedule: (scheduleId: string, data: UpdateScheduleInput) => Promise<ScheduleProfile | null>;
    readonly listAvailability: (query: AvailabilityQuery) => Promise<ScheduleProfile[]>;
    readonly createAppointmentRequest: (args: {
        patientId: string;
        scheduleId: string;
        type: string;
        requestStatus: string;
        appointmentStatus: string;
    }) => Promise<AppointmentRequestProfile>;
    readonly findRequestById: (requestId: string) => Promise<RequestContext | null>;
    readonly updateRequestStatus: (args: {
        requestId: string;
        newStatus: string;
        changedBy: string;
        observation?: string;
    }) => Promise<void>;
    readonly setCounterProposal: (args: {
        requestId: string;
        newStatus: string;
        proposedScheduleId: string;
        changedBy: string;
        observation?: string;
    }) => Promise<void>;
    readonly updateAppointmentStatus: (args: {
        appointmentId: string;
        newStatusId: string;
        changedBy: string;
        observation?: string;
    }) => Promise<void>;
    readonly moveAppointmentToSchedule: (args: {
        appointmentId: string;
        fromScheduleId: string;
        toScheduleId: string;
    }) => Promise<void>;

    constructor(db: DatabaseClient) {
        const toScheduleProfile = (row: {
            id: string;
            professionalSpecialtyId: string;
            professionalUnitId: string;
            unitId: string;
            professionalId: string;
            date: string;
            time: string;
            slots: number;
            slotsUsed: number;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
        }) =>
            scheduleProfileSchema.parse({
                ...row,
                createdAt: row.createdAt.toISOString(),
                updatedAt: row.updatedAt.toISOString(),
            });

        const toRequestProfile = (row: {
            id: string;
            appointmentId: string;
            scheduleId: string;
            patientId: string;
            unitId: string;
            professionalId: string;
            type: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
        }) =>
            appointmentRequestProfileSchema.parse({
                ...row,
                createdAt: row.createdAt.toISOString(),
                updatedAt: row.updatedAt.toISOString(),
            });

        const resolveRequestStatusId = async (statusKey: string) => {
            const [status] = await db
                .select({ id: requestsStatus.id })
                .from(requestsStatus)
                .where(or(eq(requestsStatus.id, statusKey), eq(requestsStatus.name, statusKey)))
                .limit(1);

            if (!status) {
                throw new DomainError("STATUS_NOT_FOUND", "Request status not found");
            }

            return status.id;
        };

        const resolveAppointmentStatusId = async (statusKey: string) => {
            const [status] = await db
                .select({ id: appointmentsStatus.id })
                .from(appointmentsStatus)
                .where(or(eq(appointmentsStatus.id, statusKey), eq(appointmentsStatus.name, statusKey)))
                .limit(1);

            if (!status) {
                throw new DomainError("STATUS_NOT_FOUND", "Appointment status not found");
            }

            return status.id;
        };

        this.findProfessionalIdByUserId = async (userId) => {
            const [row] = await db
                .select({ id: professionals.id })
                .from(professionals)
                .where(eq(professionals.userId, userId))
                .limit(1);

            return row?.id ?? null;
        };

        this.findPatientIdByUserId = async (userId) => {
            const [row] = await db
                .select({ id: patients.id })
                .from(patients)
                .where(eq(patients.userId, userId))
                .limit(1);

            return row?.id ?? null;
        };

        this.findProfessionalUnit = async (professionalUnitId) => {
            const [row] = await db
                .select({
                    professionalId: professionalUnits.professionalId,
                    unitId: professionalUnits.unitId,
                })
                .from(professionalUnits)
                .where(eq(professionalUnits.id, professionalUnitId))
                .limit(1);

            return row ?? null;
        };

        this.findScheduleContextById = async (scheduleId) => {
            const [row] = await db
                .select({
                    id: schedules.id,
                    professionalUnitId: schedules.professionalUnitId,
                    unitId: professionalUnits.unitId,
                    professionalId: professionalUnits.professionalId,
                    slots: schedules.slots,
                    slotsUsed: schedules.slotsUsed,
                    isActive: schedules.isActive,
                })
                .from(schedules)
                .innerJoin(professionalUnits, eq(schedules.professionalUnitId, professionalUnits.id))
                .where(eq(schedules.id, scheduleId))
                .limit(1);

            return row ?? null;
        };

        this.createSchedule = async (data) => {
            const [row] = await db
                .insert(schedules)
                .values({
                    professionalSpecialtyId: data.professionalSpecialtyId,
                    professionalUnitId: data.professionalUnitId,
                    date: data.date,
                    time: data.time,
                    slots: data.slots,
                    isActive: data.isActive,
                })
                .returning({
                    id: schedules.id,
                    professionalSpecialtyId: schedules.professionalSpecialtyId,
                    professionalUnitId: schedules.professionalUnitId,
                    date: schedules.date,
                    time: schedules.time,
                    slots: schedules.slots,
                    slotsUsed: schedules.slotsUsed,
                    isActive: schedules.isActive,
                    createdAt: schedules.createdAt,
                    updatedAt: schedules.updatedAt,
                });

            const professionalUnit = await this.findProfessionalUnit(row.professionalUnitId);
            if (!professionalUnit) {
                throw new DomainError("FORBIDDEN", "Forbidden");
            }

            return toScheduleProfile({
                ...row,
                unitId: professionalUnit.unitId,
                professionalId: professionalUnit.professionalId,
            });
        };

        this.updateSchedule = async (scheduleId, data) => {
            const [row] = await db
                .update(schedules)
                .set({
                    professionalSpecialtyId: data.professionalSpecialtyId,
                    professionalUnitId: data.professionalUnitId,
                    date: data.date,
                    time: data.time,
                    slots: data.slots,
                    isActive: data.isActive,
                })
                .where(eq(schedules.id, scheduleId))
                .returning({
                    id: schedules.id,
                    professionalSpecialtyId: schedules.professionalSpecialtyId,
                    professionalUnitId: schedules.professionalUnitId,
                    date: schedules.date,
                    time: schedules.time,
                    slots: schedules.slots,
                    slotsUsed: schedules.slotsUsed,
                    isActive: schedules.isActive,
                    createdAt: schedules.createdAt,
                    updatedAt: schedules.updatedAt,
                });

            if (!row) {
                return null;
            }

            const professionalUnit = await this.findProfessionalUnit(row.professionalUnitId);
            if (!professionalUnit) {
                throw new DomainError("FORBIDDEN", "Forbidden");
            }

            return toScheduleProfile({
                ...row,
                unitId: professionalUnit.unitId,
                professionalId: professionalUnit.professionalId,
            });
        };

        this.listAvailability = async (query) => {
            const rows = await db
                .select({
                    id: schedules.id,
                    professionalSpecialtyId: schedules.professionalSpecialtyId,
                    professionalUnitId: schedules.professionalUnitId,
                    unitId: professionalUnits.unitId,
                    professionalId: professionalUnits.professionalId,
                    date: schedules.date,
                    time: schedules.time,
                    slots: schedules.slots,
                    slotsUsed: schedules.slotsUsed,
                    isActive: schedules.isActive,
                    createdAt: schedules.createdAt,
                    updatedAt: schedules.updatedAt,
                })
                .from(schedules)
                .innerJoin(professionalUnits, eq(schedules.professionalUnitId, professionalUnits.id))
                .where(eq(professionalUnits.unitId, query.unitId));

            return rows
                .filter((row) => row.isActive && row.slotsUsed < row.slots)
                .filter((row) => (query.date ? row.date === query.date : true))
                .filter((row) =>
                    query.professionalSpecialtyId
                        ? row.professionalSpecialtyId === query.professionalSpecialtyId
                        : true,
                )
                .map(toScheduleProfile);
        };

        this.createAppointmentRequest = async ({
            patientId,
            scheduleId,
            type,
            requestStatus,
            appointmentStatus,
        }) => {
            const requestStatusId = await resolveRequestStatusId(requestStatus);
            const appointmentStatusId = await resolveAppointmentStatusId(appointmentStatus);

            const profile = await db.transaction(async (tx) => {
                const [schedule] = await tx
                    .select({
                        id: schedules.id,
                        professionalUnitId: schedules.professionalUnitId,
                        unitId: professionalUnits.unitId,
                        professionalId: professionalUnits.professionalId,
                        slots: schedules.slots,
                        slotsUsed: schedules.slotsUsed,
                        isActive: schedules.isActive,
                    })
                    .from(schedules)
                    .innerJoin(professionalUnits, eq(schedules.professionalUnitId, professionalUnits.id))
                    .where(eq(schedules.id, scheduleId))
                    .limit(1);

                if (!schedule) {
                    throw new DomainError("SCHEDULE_NOT_FOUND", "Schedule not found");
                }
                if (!schedule.isActive || schedule.slotsUsed >= schedule.slots) {
                    throw new DomainError("NO_SLOTS_AVAILABLE", "No slots available");
                }

                const [updatedSchedule] = await tx
                    .update(schedules)
                    .set({ slotsUsed: sql`${schedules.slotsUsed} + 1` })
                    .where(
                        and(
                            eq(schedules.id, schedule.id),
                            eq(schedules.isActive, true),
                            lt(schedules.slotsUsed, schedules.slots),
                        ),
                    )
                    .returning({ id: schedules.id });

                if (!updatedSchedule) {
                    throw new DomainError("NO_SLOTS_AVAILABLE", "No slots available");
                }

                const [appointment] = await tx
                    .insert(appointments)
                    .values({
                        patientId,
                        scheduleId,
                        statusId: appointmentStatusId,
                    })
                    .returning({
                        id: appointments.id,
                        statusId: appointments.statusId,
                    });

                const requestId = randomUUID();
                const [request] = await tx
                    .insert(requests)
                    .values({
                        id: requestId,
                        appointmentId: appointment.id,
                        type,
                        status: requestStatusId,
                    })
                    .returning({
                        id: requests.id,
                        appointmentId: requests.appointmentId,
                        type: requests.type,
                        status: requests.status,
                        createdAt: requests.createdAt,
                        updatedAt: requests.updatedAt,
                    });

                await tx.insert(appointmentStatusLogs).values({
                    id: randomUUID(),
                    appointmentId: appointment.id,
                    oldStatusId: null,
                    newStatusId: appointment.statusId,
                });

                await tx.insert(requestStatusLogs).values({
                    id: randomUUID(),
                    requestId: request.id,
                    oldStatus: null,
                    newStatus: request.status,
                });

                return {
                    ...request,
                    scheduleId: schedule.id,
                    patientId,
                    unitId: schedule.unitId,
                    professionalId: schedule.professionalId,
                };
            });

            return toRequestProfile(profile);
        };

        this.findRequestById = async (requestId) => {
            const [row] = await db
                .select({
                    id: requests.id,
                    appointmentId: requests.appointmentId,
                    status: requests.status,
                    type: requests.type,
                    patientUserId: users.id,
                    unitId: professionalUnits.unitId,
                    professionalId: professionalUnits.professionalId,
                    scheduleId: appointments.scheduleId,
                })
                .from(requests)
                .innerJoin(appointments, eq(requests.appointmentId, appointments.id))
                .innerJoin(patients, eq(appointments.patientId, patients.id))
                .innerJoin(users, eq(patients.userId, users.id))
                .innerJoin(schedules, eq(appointments.scheduleId, schedules.id))
                .innerJoin(professionalUnits, eq(schedules.professionalUnitId, professionalUnits.id))
                .where(eq(requests.id, requestId))
                .limit(1);

            return row ?? null;
        };

        this.updateRequestStatus = async ({ requestId, newStatus, changedBy, observation }) => {
            const newStatusId = await resolveRequestStatusId(newStatus);
            const [current] = await db
                .select({ status: requests.status })
                .from(requests)
                .where(eq(requests.id, requestId))
                .limit(1);

            if (!current) {
                throw new DomainError("REQUEST_NOT_FOUND", "Request not found");
            }

            await db
                .update(requests)
                .set({ status: newStatusId })
                .where(eq(requests.id, requestId));

            await db.insert(requestStatusLogs).values({
                id: randomUUID(),
                requestId,
                oldStatus: current.status,
                newStatus: newStatusId,
                changedBy,
                observation,
            });
        };

        this.setCounterProposal = async ({
            requestId,
            newStatus,
            proposedScheduleId,
            changedBy,
            observation,
        }) => {
            const newStatusId = await resolveRequestStatusId(newStatus);
            const [current] = await db
                .select({ status: requests.status })
                .from(requests)
                .where(eq(requests.id, requestId))
                .limit(1);

            if (!current) {
                throw new DomainError("REQUEST_NOT_FOUND", "Request not found");
            }

            const type = `counter_proposal:${proposedScheduleId}`;

            await db
                .update(requests)
                .set({ status: newStatusId, type })
                .where(eq(requests.id, requestId));

            await db.insert(requestStatusLogs).values({
                id: randomUUID(),
                requestId,
                oldStatus: current.status,
                newStatus: newStatusId,
                changedBy,
                observation,
            });
        };

        this.updateAppointmentStatus = async ({ appointmentId, newStatusId, changedBy, observation }) => {
            const resolvedStatusId = await resolveAppointmentStatusId(newStatusId);
            const [current] = await db
                .select({ statusId: appointments.statusId })
                .from(appointments)
                .where(eq(appointments.id, appointmentId))
                .limit(1);

            if (!current) {
                throw new DomainError("REQUEST_NOT_FOUND", "Request not found");
            }

            await db
                .update(appointments)
                .set({ statusId: resolvedStatusId })
                .where(eq(appointments.id, appointmentId));

            await db.insert(appointmentStatusLogs).values({
                id: randomUUID(),
                appointmentId,
                oldStatusId: current.statusId,
                newStatusId: resolvedStatusId,
                changedBy,
                observation,
            });
        };

        this.moveAppointmentToSchedule = async ({ appointmentId, fromScheduleId, toScheduleId }) => {
            await db.transaction(async (tx) => {
                const [target] = await tx
                    .select({
                        id: schedules.id,
                        slots: schedules.slots,
                        slotsUsed: schedules.slotsUsed,
                        isActive: schedules.isActive,
                    })
                    .from(schedules)
                    .where(eq(schedules.id, toScheduleId))
                    .limit(1);

                if (!target) {
                    throw new DomainError("SCHEDULE_NOT_FOUND", "Schedule not found");
                }

                if (!target.isActive || target.slotsUsed >= target.slots) {
                    throw new DomainError("NO_SLOTS_AVAILABLE", "No slots available");
                }

                const [source] = await tx
                    .select({ id: schedules.id, slotsUsed: schedules.slotsUsed })
                    .from(schedules)
                    .where(eq(schedules.id, fromScheduleId))
                    .limit(1);

                if (!source) {
                    throw new DomainError("SCHEDULE_NOT_FOUND", "Schedule not found");
                }

                await tx
                    .update(schedules)
                    .set({ slotsUsed: Math.max(0, source.slotsUsed - 1) })
                    .where(eq(schedules.id, source.id));

                const [targetUpdated] = await tx
                    .update(schedules)
                    .set({ slotsUsed: sql`${schedules.slotsUsed} + 1` })
                    .where(
                        and(
                            eq(schedules.id, target.id),
                            eq(schedules.isActive, true),
                            lt(schedules.slotsUsed, schedules.slots),
                        ),
                    )
                    .returning({ id: schedules.id });

                if (!targetUpdated) {
                    throw new DomainError("NO_SLOTS_AVAILABLE", "No slots available");
                }

                await tx
                    .update(schedules)
                    .set({ slotsUsed: sql`GREATEST(${schedules.slotsUsed} - 1, 0)` })
                    .where(eq(schedules.id, source.id));
                const [appointmentUpdated] = await tx
                    .update(appointments)
                    .set({ scheduleId: toScheduleId })
                    .where(eq(appointments.id, appointmentId))
                    .returning({ id: appointments.id });

                if (!appointmentUpdated) {
                    throw new DomainError("REQUEST_NOT_FOUND", "Request not found");
                }
            });
        };
    }
}
