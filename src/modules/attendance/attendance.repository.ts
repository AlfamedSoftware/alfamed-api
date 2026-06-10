import { and, eq, gte, lt, or } from "drizzle-orm";
import type { db as dbType } from "../../db/client.js";
import { appointments } from "../../db/schema/appointments.js";
import { appointmentsStatus } from "../../db/schema/appointments-status.js";
import { patients } from "../../db/schema/patients.js";
import { professionalUnits } from "../../db/schema/professional-units.js";
import { professionalUnitSpecialties } from "../../db/schema/professional-unit-specialties.js";
import { specialties } from "../../db/schema/specialties.js";
import { users } from "../../db/schema/users.js";
import type { AttendanceSchedulesQuery } from "./attendance.schemas.js";

type DatabaseClient = typeof dbType;

const CLINIC_TZ = "-03:00";

function toIso(value: Date | string) {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function dayRange(date: string) {
    const start = new Date(`${date}T00:00:00${CLINIC_TZ}`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return { start, end };
}

function normalizeStatus(status: string | null | undefined) {
    const value = status?.trim();
    if (!value) return "scheduled";

    const lower = value.toLowerCase();
    if (lower === "agendado") return "scheduled";
    if (lower === "em andamento") return "in_progress";
    if (lower === "concluido" || lower === "concluído") return "done";
    if (lower === "cancelado") return "cancelled";

    return lower;
}

export class AttendanceRepository {
    constructor(private readonly db: DatabaseClient) {}

    async findProfessionalUnitById(professionalUnitId: string, unitId: string) {
        const [row] = await this.db
            .select({
                id: professionalUnits.id,
                professionalId: professionalUnits.professionalId,
                unitId: professionalUnits.unitId,
            })
            .from(professionalUnits)
            .where(
                and(
                    eq(professionalUnits.id, professionalUnitId),
                    eq(professionalUnits.unitId, unitId),
                    eq(professionalUnits.isActive, true),
                ),
            )
            .limit(1);

        return row ?? null;
    }

    async listSchedules(query: AttendanceSchedulesQuery, unitId: string, professionalUnitId: string) {
        const professionalUnit = await this.findProfessionalUnitById(professionalUnitId, unitId);

        if (!professionalUnit) {
            return null;
        }

        const specialtyRows = await this.db
            .select({
                id: specialties.id,
                name: specialties.name,
            })
            .from(professionalUnitSpecialties)
            .innerJoin(specialties, eq(specialties.id, professionalUnitSpecialties.specialtyId))
            .where(
                and(
                    eq(professionalUnitSpecialties.professionalUnitId, professionalUnitId),
                    eq(professionalUnitSpecialties.isActive, true),
                    eq(specialties.isActive, true),
                    query.specialtyId ? eq(specialties.id, query.specialtyId) : undefined,
                ),
            )
            .orderBy(specialties.name);

        const { start, end } = dayRange(query.date);
        const scheduleRows = await this.db
            .select({
                id: appointments.id,
                startAt: appointments.startAt,
                endAt: appointments.endAt,
                status: appointmentsStatus.name,
                patientId: patients.id,
                patientName: users.name,
                birthDate: users.birthdate,
                gender: users.sex,
            })
            .from(appointments)
            .innerJoin(appointmentsStatus, eq(appointmentsStatus.id, appointments.statusId))
            .innerJoin(patients, eq(patients.id, appointments.patientId))
            .innerJoin(users, eq(users.id, patients.userId))
            .where(
                and(
                    eq(appointments.professionalUnitId, professionalUnitId),
                    eq(appointments.isActive, true),
                    eq(patients.isActive, true),
                    gte(appointments.startAt, start),
                    lt(appointments.startAt, end),
                ),
            )
            .orderBy(appointments.startAt);

        const schedules = scheduleRows.map((row) => ({
            id: row.id,
            startAt: toIso(row.startAt),
            endAt: toIso(row.endAt),
            status: normalizeStatus(row.status),
            patient: {
                id: row.patientId,
                name: row.patientName,
                birthDate: toIso(row.birthDate),
                gender: row.gender ?? null,
            },
        }));

        return {
            specialties: specialtyRows.map((specialty) => ({
                id: specialty.id,
                name: specialty.name,
                schedules,
            })),
        };
    }

    async getScheduleDetails(scheduleId: string, unitId: string, professionalUnitId: string) {
        const [specialtyRow] = await this.db
            .select({
                id: specialties.id,
                name: specialties.name,
            })
            .from(professionalUnitSpecialties)
            .innerJoin(specialties, eq(specialties.id, professionalUnitSpecialties.specialtyId))
            .where(
                and(
                    eq(professionalUnitSpecialties.professionalUnitId, professionalUnitId),
                    eq(professionalUnitSpecialties.isActive, true),
                    eq(specialties.isActive, true),
                ),
            )
            .orderBy(specialties.name)
            .limit(1);

        const [row] = await this.db
            .select({
                id: appointments.id,
                startAt: appointments.startAt,
                endAt: appointments.endAt,
                status: appointmentsStatus.name,
                patientId: patients.id,
                patientName: users.name,
                birthDate: users.birthdate,
                gender: users.sex,
                phone: users.phone,
                email: users.email,
                complaints: appointments.reason,
            })
            .from(appointments)
            .innerJoin(professionalUnits, eq(professionalUnits.id, appointments.professionalUnitId))
            .innerJoin(appointmentsStatus, eq(appointmentsStatus.id, appointments.statusId))
            .innerJoin(patients, eq(patients.id, appointments.patientId))
            .innerJoin(users, eq(users.id, patients.userId))
            .where(
                and(
                    eq(appointments.id, scheduleId),
                    eq(appointments.professionalUnitId, professionalUnitId),
                    eq(professionalUnits.unitId, unitId),
                    eq(appointments.isActive, true),
                    eq(patients.isActive, true),
                ),
            )
            .limit(1);

        if (!row || !specialtyRow) {
            return null;
        }

        return {
            id: row.id,
            startAt: toIso(row.startAt),
            endAt: toIso(row.endAt),
            status: normalizeStatus(row.status),
            specialtyId: specialtyRow.id,
            specialtyName: specialtyRow.name,
            patient: {
                id: row.patientId,
                name: row.patientName,
                birthDate: toIso(row.birthDate),
                gender: row.gender ?? null,
                phone: row.phone ?? null,
                email: row.email ?? null,
                complaints: row.complaints ?? null,
            },
        };
    }

    async updateScheduleStatus(scheduleId: string, statusName: "in_progress" | "done" | "cancelled", unitId: string, professionalUnitId: string) {
        const [existing] = await this.db
            .select({ id: appointments.id })
            .from(appointments)
            .innerJoin(professionalUnits, eq(professionalUnits.id, appointments.professionalUnitId))
            .where(
                and(
                    eq(appointments.id, scheduleId),
                    eq(appointments.professionalUnitId, professionalUnitId),
                    eq(professionalUnits.unitId, unitId),
                    eq(appointments.isActive, true),
                ),
            )
            .limit(1);

        if (!existing) {
            return null;
        }

        const [statusRow] = await this.db
            .select({ id: appointmentsStatus.id, name: appointmentsStatus.name })
            .from(appointmentsStatus)
            .where(
                and(
                    eq(appointmentsStatus.isActive, true),
                    or(eq(appointmentsStatus.name, statusName), eq(appointmentsStatus.name, statusName.replace("_", " "))),
                ),
            )
            .limit(1);

        const statusId = statusRow?.id ?? (await this.db.transaction(async (tx) => {
            const [created] = await tx
                .insert(appointmentsStatus)
                .values({
                    name: statusName,
                    description: statusName,
                })
                .returning({ id: appointmentsStatus.id });

            return created.id;
        }));

        const [updated] = await this.db
            .update(appointments)
            .set({
                statusId,
                updatedAt: new Date(),
            })
            .where(eq(appointments.id, scheduleId))
            .returning({
                id: appointments.id,
            });

        return updated ? { id: updated.id, status: statusName } : null;
    }
}
