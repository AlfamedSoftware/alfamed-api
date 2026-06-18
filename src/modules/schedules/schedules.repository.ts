import { and, eq } from "drizzle-orm";
import type { z } from "zod";
import type { db as dbType } from "../../db/client.js";
import { schedules } from "../../db/schema/schedules.js";
import { scheduleSlots } from "../../db/schema/schedule-slots.js";
import { professionalUnits } from "../../db/schema/professional-units.js";
import { professionals } from "../../db/schema/professionals.js";
import { users } from "../../db/schema/users.js";
import { specialties } from "../../db/schema/specialties.js";
import { scheduleFullDataSchema } from "./schedules.schemas.js";

type DatabaseClient = typeof dbType;

export type ListFullAvailableScheduleSlotsFilters = {
    date: string;
    professionalUnitId?: string;
    specialtyId?: string;
    isActive?: boolean;
    isAvailable?: boolean;
};

export class SchedulesRepository {
    constructor(private readonly db: DatabaseClient) { }

    async listFullAvailableScheduleSlots(filters: ListFullAvailableScheduleSlotsFilters) {
        const whereConditions = [eq(schedules.date, filters.date)];

        if (filters.professionalUnitId) {
            whereConditions.push(eq(schedules.professionalUnitId, filters.professionalUnitId));
        }

        if (filters.specialtyId) {
            whereConditions.push(eq(schedules.specialtyId, filters.specialtyId));
        }

        if (typeof filters.isActive === 'boolean') {
            whereConditions.push(eq(schedules.isActive, filters.isActive));
        } else {
            whereConditions.push(eq(schedules.isActive, true));
        }

        const scheduleRows = await this.db
            .select({
                id: schedules.id,
                slots: schedules.slots,
                emptySlots: schedules.emptySlots,
                allocatedSlots: schedules.allocatedSlots,
                date: schedules.date,
                startTime: schedules.startTime,
                endTime: schedules.endTime,
                durationMinutes: schedules.durationMinutes,
                isActive: schedules.isActive,
                professionalUnitId: schedules.professionalUnitId,
                specialtyId: schedules.specialtyId,
            })
            .from(schedules)
            .where(and(...whereConditions));

        if (scheduleRows.length === 0) {
            return [];
        }

        const results = await Promise.all(
            scheduleRows.map(async (schedule) => {
                // Get professional unit data
                const [professionalUnit] = await this.db
                    .select({
                        id: professionalUnits.id,
                        professionalId: professionalUnits.professionalId,
                        isActive: professionalUnits.isActive,
                    })
                    .from(professionalUnits)
                    .where(and(
                        eq(professionalUnits.id, schedule.professionalUnitId),
                        eq(professionalUnits.isActive, true)
                    ))
                    .limit(1);

                if (!professionalUnit) {
                    return null;
                }

                // Get professional data
                const [professional] = await this.db
                    .select({
                        userId: professionals.userId,
                    })
                    .from(professionals)
                    .where(and(
                        eq(professionals.id, professionalUnit.professionalId),
                        eq(professionals.isActive, true)
                    ))
                    .limit(1);

                if (!professional) {
                    return null;
                }

                // Get user data
                const [user] = await this.db
                    .select({
                        id: users.id,
                        name: users.name,
                        socialName: users.socialName,
                        email: users.email,
                        phone: users.phone,
                        cpf: users.cpf,
                        birthdate: users.birthdate,
                        sex: users.sex,
                        isActive: users.isActive,
                    })
                    .from(users)
                    .where(and(
                        eq(users.id, professional.userId),
                        eq(users.isActive, true)
                    ))
                    .limit(1);

                if (!user) {
                    return null;
                }

                // Get specialty data
                const [specialty] = await this.db
                    .select({
                        id: specialties.id,
                        name: specialties.name,
                        isActive: specialties.isActive,
                    })
                    .from(specialties)
                    .where(and(
                        eq(specialties.id, schedule.specialtyId),
                        eq(specialties.isActive, true)
                    ))
                    .limit(1);

                if (!specialty) {
                    return null;
                }

                // Get schedule slots with filters
                const slotConditions = [eq(scheduleSlots.scheduleId, schedule.id)];
                if (typeof filters.isAvailable === 'boolean') {
                    slotConditions.push(eq(scheduleSlots.isAvailable, filters.isAvailable));
                }
                if (typeof filters.isActive === 'boolean') {
                    slotConditions.push(eq(scheduleSlots.isActive, filters.isActive));
                } else {
                    slotConditions.push(eq(scheduleSlots.isActive, true));
                }

                const slots = await this.db
                    .select({
                        id: scheduleSlots.id,
                        startTime: scheduleSlots.startTime,
                        endTime: scheduleSlots.endTime,
                        isAvailable: scheduleSlots.isAvailable,
                        isActive: scheduleSlots.isActive,
                    })
                    .from(scheduleSlots)
                    .where(and(...slotConditions));

                return scheduleFullDataSchema.parse({
                    id: schedule.id,
                    slots: schedule.slots,
                    emptySlots: schedule.emptySlots,
                    allocatedSlots: schedule.allocatedSlots,
                    date: schedule.date,
                    startTime: schedule.startTime,
                    endTime: schedule.endTime,
                    durationMinutes: schedule.durationMinutes,
                    isActive: schedule.isActive,
                    users: {
                        id: user.id,
                        name: user.name,
                        socialName: user.socialName ?? "",
                        email: user.email,
                        phone: user.phone ?? "",
                        cpf: user.cpf ?? "",
                        birthdate: user.birthdate.toISOString(),
                        sex: user.sex ?? "",
                        isActive: user.isActive,
                    },
                    professional_unit: {
                        id: professionalUnit.id,
                        isActive: professionalUnit.isActive,
                    },
                    schedule_slots: slots,
                    specialties: {
                        id: specialty.id,
                        name: specialty.name,
                        isActive: specialty.isActive,
                    },
                });
            })
        );

        return results.filter((r): r is z.infer<typeof scheduleFullDataSchema> => r !== null);
    }
}
