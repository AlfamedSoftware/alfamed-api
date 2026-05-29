import type { db as dbType } from "../../db/client.js";
import { schedules } from "../../db/schema/schedules.js";
import { professionalUnits } from "../../db/schema/professional-units.js";
import { and, eq, inArray } from "drizzle-orm";

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
    constructor(private db: DatabaseClient) { }

    private async findProfessionalUnitId(professionalId: string, unitId: string) {
        const [row] = await this.db
            .select({ id: professionalUnits.id })
            .from(professionalUnits)
            .where(and(eq(professionalUnits.professionalId, professionalId), eq(professionalUnits.unitId, unitId)))
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
            const existingRows = await tx
                .select({ id: schedules.id })
                .from(schedules)
                .where(eq(schedules.professionalUnitId, professionalUnitId));

            const existingIds = new Set(existingRows.map((row) => row.id));
            const inputIds = new Set(items.map((item) => item.id).filter((id): id is string => Boolean(id)));

            for (const item of items) {
                if (!item.id) continue;

                if (!existingIds.has(item.id)) {
                    throw new Error("SCHEDULE_NOT_FOUND");
                }

                await tx
                    .update(schedules)
                    .set({
                        dayOfWeek: item.dayOfWeek,
                        startTime: item.startTime,
                        endTime: item.endTime,
                        appointmentDurationMinutes: item.appointmentDurationMinutes,
                        isActive: item.isActive ?? true,
                    })
                    .where(and(eq(schedules.professionalUnitId, professionalUnitId), eq(schedules.id, item.id)));
            }

            const newItems = items.filter((item) => !item.id);

            if (newItems.length > 0) {
                await tx.insert(schedules).values(
                    newItems.map((item) => ({
                        professionalUnitId,
                        dayOfWeek: item.dayOfWeek,
                        startTime: item.startTime,
                        endTime: item.endTime,
                        appointmentDurationMinutes: item.appointmentDurationMinutes,
                        isActive: item.isActive ?? true,
                    })),
                );
            }

            const removedIds = [...existingIds].filter((id) => !inputIds.has(id));

            if (removedIds.length > 0) {
                await tx
                    .delete(schedules)
                    .where(and(eq(schedules.professionalUnitId, professionalUnitId), inArray(schedules.id, removedIds)));
            }

            const rows = await tx
                .select({
                    id: schedules.id,
                    dayOfWeek: schedules.dayOfWeek,
                    startTime: schedules.startTime,
                    endTime: schedules.endTime,
                    appointmentDurationMinutes: schedules.appointmentDurationMinutes,
                    isActive: schedules.isActive,
                })
                .from(schedules)
                .where(eq(schedules.professionalUnitId, professionalUnitId))
                .orderBy(schedules.dayOfWeek, schedules.startTime, schedules.endTime, schedules.id);

            return rows.map((r) => ({
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
