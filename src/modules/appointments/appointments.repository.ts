import { and, eq, gt, gte, inArray, lt, or } from "drizzle-orm";
import type { db as dbType } from "../../db/client.js";
import { appointments } from "../../db/schema/appointments.js";
import { appointmentsStatus } from "../../db/schema/appointments-status.js";
import { professionalAvailabilityBlocks } from "../../db/schema/professional-availability-blocks.js";
import { professionalUnits } from "../../db/schema/professional-units.js";
import { professionals } from "../../db/schema/professionals.js";
import { patients } from "../../db/schema/patients.js";
import { schedules } from "../../db/schema/schedules.js";
import { users } from "../../db/schema/users.js";
import type { AppointmentEvent, AvailabilityQuery, CalendarEventsQuery, CreateAppointmentInput } from "./appointments.schemas.js";

type DatabaseClient = typeof dbType;

type Interval = {
    start: Date;
    end: Date;
};

const CLINIC_TZ = "-03:00";

function normalizeIso(value: Date | string) {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function createLocalDateTime(date: string, time: string) {
    return new Date(`${date}T${time}${CLINIC_TZ}`);
}

function overlaps(left: Interval, right: Interval) {
    return left.start < right.end && right.start < left.end;
}

function mergeIntervals(intervals: Interval[]) {
    const sorted = [...intervals].sort((left, right) => left.start.getTime() - right.start.getTime());
    const merged: Interval[] = [];

    for (const interval of sorted) {
        const last = merged[merged.length - 1];

        if (!last || interval.start > last.end) {
            merged.push({ start: new Date(interval.start), end: new Date(interval.end) });
            continue;
        }

        if (interval.end > last.end) {
            last.end = new Date(interval.end);
        }
    }

    return merged;
}

function subtractIntervals(base: Interval, blocks: Interval[]) {
    const sorted = [...blocks]
        .filter((block) => overlaps(base, block))
        .sort((left, right) => left.start.getTime() - right.start.getTime());

    const free: Interval[] = [];
    let cursor = new Date(base.start);

    for (const block of sorted) {
        if (block.start > cursor) {
            free.push({ start: new Date(cursor), end: new Date(Math.min(block.start.getTime(), base.end.getTime())) });
        }

        if (block.end > cursor) {
            cursor = new Date(Math.max(cursor.getTime(), block.end.getTime()));
        }

        if (cursor >= base.end) {
            break;
        }
    }

    if (cursor < base.end) {
        free.push({ start: new Date(cursor), end: new Date(base.end) });
    }

    return free.filter((interval) => interval.end > interval.start);
}

export class AppointmentsRepository {
    constructor(private readonly db: DatabaseClient) {}

    async findProfessionalUnitByProfessionalIdAndUnitId(professionalId: string, unitId: string) {
        const [row] = await this.db
            .select({
                professionalUnitId: professionalUnits.id,
                professionalId: professionals.id,
                unitId: professionalUnits.unitId,
            })
            .from(professionalUnits)
            .innerJoin(professionals, eq(professionals.id, professionalUnits.professionalId))
            .where(and(eq(professionals.id, professionalId), eq(professionalUnits.unitId, unitId)))
            .limit(1);

        return row ?? null;
    }

    async findProfessionalUnitById(professionalUnitId: string) {
        const [row] = await this.db
            .select({
                professionalUnitId: professionalUnits.id,
                professionalId: professionals.id,
                unitId: professionalUnits.unitId,
            })
            .from(professionalUnits)
            .innerJoin(professionals, eq(professionals.id, professionalUnits.professionalId))
            .where(eq(professionalUnits.id, professionalUnitId))
            .limit(1);

        return row ?? null;
    }

    async listAgendaEvents(query: CalendarEventsQuery, unitId: string): Promise<AppointmentEvent[]> {
        // Handle professionalIds as string or array
        let professionalIds: string[] = [];
        if (query.professionalIds) {
            if (Array.isArray(query.professionalIds)) {
                professionalIds = query.professionalIds.filter(Boolean);
            } else if (typeof query.professionalIds === "string") {
                professionalIds = query.professionalIds
                    .split(",")
                    .map((id) => id.trim())
                    .filter(Boolean);
            }
        }

        const from = new Date(query.from);
        const to = new Date(query.to);

        const appointmentRows = await this.db
            .select({
                id: appointments.id,
                professionalId: professionals.id,
                professionalName: users.name,
                patientId: appointments.patientId,
                startAt: appointments.startAt,
                endAt: appointments.endAt,
            })
            .from(appointments)
            .innerJoin(professionalUnits, eq(professionalUnits.id, appointments.professionalUnitId))
            .innerJoin(professionals, eq(professionals.id, professionalUnits.professionalId))
            .innerJoin(users, eq(users.id, professionals.userId))
            .where(
                and(
                    eq(professionalUnits.unitId, unitId),
                    professionalIds.length > 0 ? inArray(professionals.id, professionalIds) : or(eq(professionalUnits.unitId, unitId), eq(professionalUnits.unitId, unitId)),
                    lt(appointments.startAt, to),
                    gt(appointments.endAt, from),
                ),
            );

        const patientIds = Array.from(new Set(appointmentRows.map((row) => row.patientId)));
        const patientRows = patientIds.length > 0
            ? await this.db
                .select({
                    id: patients.id,
                    name: users.name,
                })
                .from(patients)
                .innerJoin(users, eq(users.id, patients.userId))
                .where(inArray(patients.id, patientIds))
            : [];

        const patientNameById = new Map(patientRows.map((row) => [row.id, row.name]));

        const blockRows = await this.db
            .select({
                id: professionalAvailabilityBlocks.id,
                professionalId: professionals.id,
                professionalName: users.name,
                startAt: professionalAvailabilityBlocks.startAt,
                endAt: professionalAvailabilityBlocks.endAt,
                reason: professionalAvailabilityBlocks.reason,
            })
            .from(professionalAvailabilityBlocks)
            .innerJoin(professionalUnits, eq(professionalUnits.id, professionalAvailabilityBlocks.professionalUnitId))
            .innerJoin(professionals, eq(professionals.id, professionalUnits.professionalId))
            .innerJoin(users, eq(users.id, professionals.userId))
            .where(
                and(
                    eq(professionalUnits.unitId, unitId),
                    professionalIds.length > 0 ? inArray(professionals.id, professionalIds) : or(eq(professionalUnits.unitId, unitId), eq(professionalUnits.unitId, unitId)),
                    lt(professionalAvailabilityBlocks.startAt, to),
                    gt(professionalAvailabilityBlocks.endAt, from),
                    eq(professionalAvailabilityBlocks.isActive, true),
                ),
            );

        const appointmentEvents: AppointmentEvent[] = appointmentRows.map((row) => ({
            id: row.id,
            kind: "appointment",
            title: `Consulta - ${row.professionalName}`,
            start: normalizeIso(row.startAt),
            end: normalizeIso(row.endAt),
            color: "#2563eb",
            backgroundColor: "#dbeafe",
            description: patientNameById.get(row.patientId) ?? null,
            location: null,
            professionalId: row.professionalId,
        }));

        const blockEvents: AppointmentEvent[] = blockRows.map((row) => ({
            id: row.id,
            kind: "block",
            title: row.reason?.trim() ? row.reason : `Bloqueio - ${row.professionalName}`,
            start: normalizeIso(row.startAt),
            end: normalizeIso(row.endAt),
            color: "#b45309",
            backgroundColor: "#fef3c7",
            description: row.reason ?? null,
            location: null,
            professionalId: row.professionalId,
        }));

        return [...appointmentEvents, ...blockEvents].sort((left, right) => left.start.localeCompare(right.start));
    }

    async checkAvailability(query: AvailabilityQuery, unitId: string) {
        const [professionalUnit] = await this.db
            .select({
                professionalUnitId: professionalUnits.id,
                professionalId: professionals.id,
            })
            .from(professionalUnits)
            .innerJoin(professionals, eq(professionals.id, professionalUnits.professionalId))
            .where(and(eq(professionalUnits.unitId, unitId), eq(professionals.id, query.professionalId)))
            .limit(1);

        if (!professionalUnit) {
            return { available: false, windows: [] as Interval[] };
        }

        const dayOfWeek = new Date(`${query.date}T00:00:00${CLINIC_TZ}`).getDay();
        console.log(`[checkAvailability] Query date: ${query.date}, dayOfWeek: ${dayOfWeek}`);
        console.log(`[checkAvailability] Professional unit ID: ${professionalUnit.professionalUnitId}`);

        const rules = await this.db
            .select({
                startTime: schedules.startTime,
                endTime: schedules.endTime,
            })
            .from(schedules)
            .where(
                and(
                    eq(schedules.professionalUnitId, professionalUnit.professionalUnitId),
                    eq(schedules.dayOfWeek, dayOfWeek),
                    eq(schedules.isActive, true),
                ),
            );

        console.log(`[checkAvailability] Found ${rules.length} schedule rules for dayOfWeek ${dayOfWeek}`);
        console.log(`[checkAvailability] Rules:`, rules);

        const requestedStart = query.startAt ? new Date(query.startAt) : null;
        const requestedEnd = query.endAt ? new Date(query.endAt) : null;
        const dayStart = new Date(`${query.date}T00:00:00${CLINIC_TZ}`);
        const dayEnd = new Date(`${query.date}T23:59:59${CLINIC_TZ}`);

        console.log(`[checkAvailability] Requested: ${requestedStart?.toISOString()} to ${requestedEnd?.toISOString()}`);

        const baseIntervals = mergeIntervals(
            rules.map((rule) => ({
                start: createLocalDateTime(query.date, rule.startTime),
                end: createLocalDateTime(query.date, rule.endTime),
            })),
        );

        console.log(`[checkAvailability] Base intervals:`, baseIntervals.map((i) => ({ start: i.start.toISOString(), end: i.end.toISOString() })));

        const busyRows = [
            ...(await this.db
                .select({
                    startAt: professionalAvailabilityBlocks.startAt,
                    endAt: professionalAvailabilityBlocks.endAt,
                })
                .from(professionalAvailabilityBlocks)
                .where(
                    and(
                        eq(professionalAvailabilityBlocks.professionalUnitId, professionalUnit.professionalUnitId),
                        eq(professionalAvailabilityBlocks.isActive, true),
                        lt(professionalAvailabilityBlocks.startAt, requestedEnd ?? dayEnd),
                        gt(professionalAvailabilityBlocks.endAt, requestedStart ?? dayStart),
                    ),
                )),
            ...(await this.db
                .select({
                    startAt: appointments.startAt,
                    endAt: appointments.endAt,
                })
                .from(appointments)
                .where(
                    and(
                        eq(appointments.professionalUnitId, professionalUnit.professionalUnitId),
                        eq(appointments.isActive, true),
                        lt(appointments.startAt, requestedEnd ?? dayEnd),
                        gt(appointments.endAt, requestedStart ?? dayStart),
                    ),
                )),
        ];

        const busyIntervals = mergeIntervals(busyRows.map((row) => ({ start: new Date(row.startAt), end: new Date(row.endAt) })));
        console.log(`[checkAvailability] Busy intervals (${busyRows.length} blocks):`, busyIntervals.map((i) => ({ start: i.start.toISOString(), end: i.end.toISOString() })));

        const windows = mergeIntervals(baseIntervals.flatMap((base) => subtractIntervals(base, busyIntervals)));
        console.log(`[checkAvailability] Available windows:`, windows.map((i) => ({ start: i.start.toISOString(), end: i.end.toISOString() })));

        const available = requestedStart && requestedEnd
            ? windows.some((window) => window.start <= requestedStart && window.end >= requestedEnd)
            : windows.length > 0;

        console.log(`[checkAvailability] Available: ${available}`);

        return { available, windows };
    }

    async createAppointment(input: CreateAppointmentInput, unitId: string) {
        const professionalUnit = await this.findProfessionalUnitByProfessionalIdAndUnitId(input.professionalId, unitId);

        if (!professionalUnit) {
            throw new Error("Professional not found for selected unit");
        }

        const availability = await this.checkAvailability(
            {
                professionalId: input.professionalId,
                date: input.startAt.slice(0, 10),
                startAt: input.startAt,
                endAt: input.endAt,
            },
            unitId,
        );

        if (!availability.available) {
            throw new Error("Selected interval is not available");
        }

        const [status] = await this.db
            .select({ id: appointmentsStatus.id })
            .from(appointmentsStatus)
            .where(or(eq(appointmentsStatus.name, "scheduled"), eq(appointmentsStatus.name, "agendado")))
            .limit(1);

        const statusId = status?.id ?? (await this.db.transaction(async (tx) => {
            const [createdStatus] = await tx
                .insert(appointmentsStatus)
                .values({ name: "scheduled", description: "Consulta agendada" })
                .returning({ id: appointmentsStatus.id });

            return createdStatus.id;
        }));

        const [created] = await this.db
            .insert(appointments)
            .values({
                patientId: input.patientId,
                professionalUnitId: professionalUnit.professionalUnitId,
                startAt: new Date(input.startAt),
                endAt: new Date(input.endAt),
                statusId,
            })
            .returning({
                id: appointments.id,
                patientId: appointments.patientId,
                professionalUnitId: appointments.professionalUnitId,
                startAt: appointments.startAt,
                endAt: appointments.endAt,
            });

        return created;
    }

    async getAppointmentById(appointmentId: string, unitId: string) {
        const [appointment] = await this.db
            .select({
                id: appointments.id,
                patientId: appointments.patientId,
                professionalUnitId: appointments.professionalUnitId,
                startAt: appointments.startAt,
                endAt: appointments.endAt,
                reason: appointments.reason,
                professionalId: professionals.id,
            })
            .from(appointments)
            .innerJoin(professionalUnits, eq(professionalUnits.id, appointments.professionalUnitId))
            .innerJoin(professionals, eq(professionals.id, professionalUnits.professionalId))
            .where(and(eq(appointments.id, appointmentId), eq(professionalUnits.unitId, unitId)))
            .limit(1);

        return appointment ?? null;
    }

    async updateAppointment(
        appointmentId: string,
        input: {
            patientId?: string;
            startAt?: Date;
            endAt?: Date;
            reason?: string | null;
        },
        unitId: string,
    ) {
        const existing = await this.getAppointmentById(appointmentId, unitId);

        if (!existing) {
            throw new Error("Appointment not found");
        }

        // If times are being changed, verify availability
        if (input.startAt || input.endAt) {
            const startAt = input.startAt ?? existing.startAt;
            const endAt = input.endAt ?? existing.endAt;

            const availability = await this.checkAvailability(
                {
                    professionalId: existing.professionalId,
                    date: startAt.toISOString().slice(0, 10),
                    startAt: startAt.toISOString(),
                    endAt: endAt.toISOString(),
                },
                unitId,
            );

            if (!availability.available) {
                throw new Error("Selected interval is not available");
            }
        }

        const [updated] = await this.db
            .update(appointments)
            .set({
                ...(input.patientId && { patientId: input.patientId }),
                ...(input.startAt && { startAt: input.startAt }),
                ...(input.endAt && { endAt: input.endAt }),
                ...("reason" in input && { reason: input.reason }),
                updatedAt: new Date(),
            })
            .where(eq(appointments.id, appointmentId))
            .returning({
                id: appointments.id,
                patientId: appointments.patientId,
                professionalUnitId: appointments.professionalUnitId,
                startAt: appointments.startAt,
                endAt: appointments.endAt,
            });

        return updated;
    }

    async deleteAppointment(appointmentId: string) {
        // Soft delete by setting isActive to false
        await this.db
            .update(appointments)
            .set({
                isActive: false,
                updatedAt: new Date(),
            })
            .where(eq(appointments.id, appointmentId));
    }
}