import type { db as dbType } from "../../db/client.js";
import { schedules } from "../../db/schema/schedules.js";
import { professionalUnits } from "../../db/schema/professional-units.js";
import { eq } from "drizzle-orm";

type DatabaseClient = typeof dbType;

export type ScheduleRow = {
    id?: string;
    dayOfWeek: number;
    startTime: string; // HH:MM:SS
    endTime: string; // HH:MM:SS
    appointmentDurationMinutes: number;
    isActive?: boolean;
}

export class SchedulesRepository {
    constructor(private db: DatabaseClient) {}

    private async findProfessionalUnitId(professionalId: string, unitId: string) {
        const [row] = await this.db
            .select({ id: professionalUnits.id })
            .from(professionalUnits)
            .where(eq(professionalUnits.professionalId, professionalId))
            .where(eq(professionalUnits.unitId, unitId))
            .limit(1);

        return row?.id ?? null;
    }

    async listByProfessionalAndUnit(professionalId: string, unitId: string) {
        const professionalUnitId = await this.findProfessionalUnitId(professionalId, unitId);
        if (!professionalUnitId) return [];

        const rows = await this.db
            .select({
                id: schedules.id,
                dayOfWeek: schedules.dayOfWeek,
                startTime: schedules.startTime,
                endTime: schedules.endTime,
                appointmentDurationMinutes: schedules.appointmentDurationMinutes,
                isActive: schedules.isActive,
            })
            .from(schedules)
            .where(eq(schedules.professionalUnitId, professionalUnitId));

        return rows.map((r) => ({
            id: r.id,
            dayOfWeek: r.dayOfWeek,
            startTime: r.startTime,
            endTime: r.endTime,
            appointmentDurationMinutes: r.appointmentDurationMinutes,
            isActive: r.isActive,
        }));
    }

    async replaceForProfessionalAndUnit(professionalId: string, unitId: string, items: ScheduleRow[]) {
        const professionalUnitId = await this.findProfessionalUnitId(professionalId, unitId);
        if (!professionalUnitId) throw new Error("PROFESSIONAL_UNIT_NOT_FOUND");

        return this.db.transaction(async (tx) => {
            await tx.delete(schedules).where(eq(schedules.professionalUnitId, professionalUnitId));

            if (items.length === 0) return [];

            const toInsert = items.map((it) => ({
                professionalUnitId,
                dayOfWeek: it.dayOfWeek,
                startTime: it.startTime,
                endTime: it.endTime,
                appointmentDurationMinutes: it.appointmentDurationMinutes,
                isActive: it.isActive ?? true,
            }));

            const inserted = await tx.insert(schedules).values(...toInsert).returning({
                id: schedules.id,
                dayOfWeek: schedules.dayOfWeek,
                startTime: schedules.startTime,
                endTime: schedules.endTime,
                appointmentDurationMinutes: schedules.appointmentDurationMinutes,
                isActive: schedules.isActive,
            });

            return inserted.map((r) => ({
                id: r.id,
                dayOfWeek: r.dayOfWeek,
                startTime: r.startTime,
                endTime: r.endTime,
                appointmentDurationMinutes: r.appointmentDurationMinutes,
                isActive: r.isActive,
            }));
        });
    }

    async deleteById(professionalId: string, unitId: string, scheduleId: string) {
        const professionalUnitId = await this.findProfessionalUnitId(professionalId, unitId);
        if (!professionalUnitId) throw new Error("PROFESSIONAL_UNIT_NOT_FOUND");

        await this.db.delete(schedules).where(eq(schedules.professionalUnitId, professionalUnitId)).where(eq(schedules.id, scheduleId));
    }
}
