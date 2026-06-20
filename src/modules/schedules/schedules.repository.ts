import { and, eq, sql } from "drizzle-orm";
import type { z } from "zod";
import type { db as dbType } from "../../db/client.js";
import { schedules } from "../../db/schema/schedules.js";
import { scheduleSlots } from "../../db/schema/schedule-slots.js";
import { professionalUnits } from "../../db/schema/professional-units.js";
import { professionals } from "../../db/schema/professionals.js";
import { users } from "../../db/schema/users.js";
import { specialties } from "../../db/schema/specialties.js";
import { units } from "../../db/schema/units.js";
import { procedures } from "../../db/schema/procedures.js";
import { scheduleFullDataSchema, fullSlotDetailSchema } from "./schedules.schemas.js";

export type CreateScheduleInput = {
    professionalUnitId: string;
    isActive: boolean;
    startTime: string;
    endTime: string;
    specialtyId: string;
    slots: number;
    date: string;
    durationMinutes: number;
    procedureId: string;
};

type DatabaseClient = typeof dbType;

export type FindConflictingScheduleParams = {
    professionalUnitId: string;
    date: string;
    startTime: string;
    endTime: string;
};

export type ConflictingScheduleResult = {
    professionalName: string;
    unitName: string;
    startTime: string;
    endTime: string;
};

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
                procedureId: schedules.procedureId,
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
                    procedureId: schedule.procedureId,
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

    async findConflictingSchedule(
        params: FindConflictingScheduleParams,
    ): Promise<ConflictingScheduleResult | null> {
        const toMinutes = (time: string) => {
            const [h, m] = time.split(":").map(Number);
            return h * 60 + m;
        };

        const newStart = toMinutes(params.startTime);
        const newEnd = toMinutes(params.endTime);

        // Resolve professionalId from the given professionalUnitId
        const [sourcePU] = await this.db
            .select({
                professionalId: professionalUnits.professionalId,
            })
            .from(professionalUnits)
            .where(eq(professionalUnits.id, params.professionalUnitId))
            .limit(1);

        if (!sourcePU) return null;

        // Get all units for this professional (may be in multiple units)
        const allPUs = await this.db
            .select({
                id: professionalUnits.id,
                unitId: professionalUnits.unitId,
            })
            .from(professionalUnits)
            .where(eq(professionalUnits.professionalId, sourcePU.professionalId));

        for (const pu of allPUs) {
            const existingSchedules = await this.db
                .select({
                    startTime: schedules.startTime,
                    endTime: schedules.endTime,
                })
                .from(schedules)
                .where(and(
                    eq(schedules.professionalUnitId, pu.id),
                    eq(schedules.date, params.date),
                    eq(schedules.isActive, true),
                ));

            for (const existing of existingSchedules) {
                const existingStart = toMinutes(existing.startTime);
                const existingEnd = toMinutes(existing.endTime);

                // Half-open interval [start, end): overlaps if newStart < existingEnd AND existingStart < newEnd
                // This naturally handles boundary sharing (e.g. one ends at 14:00, next starts at 14:00 = no conflict)
                if (newStart < existingEnd && existingStart < newEnd) {
                    const [professional] = await this.db
                        .select({ userId: professionals.userId })
                        .from(professionals)
                        .where(eq(professionals.id, sourcePU.professionalId))
                        .limit(1);

                    const [user] = await this.db
                        .select({ name: users.name })
                        .from(users)
                        .where(eq(users.id, professional.userId))
                        .limit(1);

                    const [unit] = await this.db
                        .select({ name: units.name })
                        .from(units)
                        .where(eq(units.id, pu.unitId))
                        .limit(1);

                    return {
                        professionalName: user?.name ?? "Profissional",
                        unitName: unit?.name ?? "Unidade",
                        startTime: existing.startTime,
                        endTime: existing.endTime,
                    };
                }
            }
        }

        return null;
    }

    async createSchedule(input: CreateScheduleInput) {
        return this.db.transaction(async (tx) => {
            const [created] = await tx
                .insert(schedules)
                .values({
                    professionalUnitId: input.professionalUnitId,
                    specialtyId: input.specialtyId,
                    procedureId: input.procedureId,
                    slots: input.slots,
                    emptySlots: input.slots,
                    allocatedSlots: 0,
                    date: input.date,
                    startTime: input.startTime,
                    endTime: input.endTime,
                    durationMinutes: input.durationMinutes,
                    isActive: input.isActive,
                })
                .returning();

            const [startHours, startMins] = input.startTime.split(":").map(Number);
            const startMinutes = startHours * 60 + startMins;

            const formatTime = (totalMinutes: number) => {
                const h = Math.floor(totalMinutes / 60) % 24;
                const m = totalMinutes % 60;
                return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
            };

            const slotRows = Array.from({ length: input.slots }, (_, i) => ({
                scheduleId: created.id,
                startTime: formatTime(startMinutes + i * input.durationMinutes),
                endTime: formatTime(startMinutes + (i + 1) * input.durationMinutes),
                isAvailable: true,
                isActive: true,
            }));

            await tx.insert(scheduleSlots).values(slotRows);

            return created;
        });
    }

    async checkSlotAvailability(slotId: string): Promise<boolean> {
        const [slot] = await this.db
            .select({
                isAvailable: scheduleSlots.isAvailable,
            })
            .from(scheduleSlots)
            .where(and(
                eq(scheduleSlots.id, slotId),
                eq(scheduleSlots.isActive, true)
            ))
            .limit(1);

        return slot?.isAvailable ?? false;
    }

    async setSlotAvailability(slotId: string, isAvailableBoolean: boolean): Promise<void> {
        await this.db
            .update(scheduleSlots)
            .set({ isAvailable: isAvailableBoolean })
            .where(eq(scheduleSlots.id, slotId));
    }

    async decrementEmptySlotsAndIncrementAllocatedSlots(scheduleSlotId: string, value: number): Promise<void> {
        // Get the scheduleId from the scheduleSlot
        const [slot] = await this.db
            .select({ scheduleId: scheduleSlots.scheduleId })
            .from(scheduleSlots)
            .where(eq(scheduleSlots.id, scheduleSlotId))
            .limit(1);

        if (!slot) {
            throw new Error("Schedule slot not found");
        }

        // Update the schedule: decrement emptySlots and increment allocatedSlots
        await this.db
            .update(schedules)
            .set({
                emptySlots: sql`${schedules.emptySlots} - ${value}`,
                allocatedSlots: sql`${schedules.allocatedSlots} + ${value}`,
            })
            .where(eq(schedules.id, slot.scheduleId));
    }

    async incrementEmptySlotsAndDecrementAllocatedSlots(scheduleSlotId: string, value: number): Promise<void> {
        // Get the scheduleId from the scheduleSlot
        const [slot] = await this.db
            .select({ scheduleId: scheduleSlots.scheduleId })
            .from(scheduleSlots)
            .where(eq(scheduleSlots.id, scheduleSlotId))
            .limit(1);

        if (!slot) {
            throw new Error("Schedule slot not found");
        }

        // Update the schedule: increment emptySlots and decrement allocatedSlots
        await this.db
            .update(schedules)
            .set({
                emptySlots: sql`${schedules.emptySlots} + ${value}`,
                allocatedSlots: sql`${schedules.allocatedSlots} - ${value}`,
            })
            .where(eq(schedules.id, slot.scheduleId));
    }

    async getFullSlotDetailById(slotId: string) {
        // Get the schedule slot
        const [slot] = await this.db
            .select({
                id: scheduleSlots.id,
                startTime: scheduleSlots.startTime,
                endTime: scheduleSlots.endTime,
                isAvailable: scheduleSlots.isAvailable,
                isActive: scheduleSlots.isActive,
                scheduleId: scheduleSlots.scheduleId,
            })
            .from(scheduleSlots)
            .where(eq(scheduleSlots.id, slotId))
            .limit(1);

        if (!slot) {
            return null;
        }

        // Get the schedule
        const [schedule] = await this.db
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
                procedureId: schedules.procedureId,
            })
            .from(schedules)
            .where(eq(schedules.id, slot.scheduleId))
            .limit(1);

        if (!schedule) {
            return null;
        }

        // Get professional unit data
        const [professionalUnit] = await this.db
            .select({
                id: professionalUnits.id,
                professionalId: professionalUnits.professionalId,
                unitId: professionalUnits.unitId,
                isActive: professionalUnits.isActive,
            })
            .from(professionalUnits)
            .where(eq(professionalUnits.id, schedule.professionalUnitId))
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
            .where(eq(professionals.id, professionalUnit.professionalId))
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
            .where(eq(users.id, professional.userId))
            .limit(1);

        if (!user) {
            return null;
        }

        // Get unit data
        const [unit] = await this.db
            .select({
                id: units.id,
                name: units.name,
                cnpj: units.cnpj,
                address: units.address,
                city: units.city,
                state: units.state,
                phone: units.phone,
                email: units.email,
                isActive: units.isActive,
            })
            .from(units)
            .where(eq(units.id, professionalUnit.unitId))
            .limit(1);

        if (!unit) {
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
            .where(eq(specialties.id, schedule.specialtyId))
            .limit(1);

        if (!specialty) {
            return null;
        }

        // Get procedure data
        let procedure = null;
        if (schedule.procedureId) {
            const [procedureRow] = await this.db
                .select({
                    id: procedures.id,
                    type: procedures.type,
                    description: procedures.description,
                    observation: procedures.observation,
                    code: procedures.code,
                    price: procedures.price,
                    isActive: procedures.isActive,
                })
                .from(procedures)
                .where(eq(procedures.id, schedule.procedureId))
                .limit(1);

            if (procedureRow) {
                procedure = procedureRow;
            }
        }

        return fullSlotDetailSchema.parse({
            id: slot.id,
            startTime: slot.startTime,
            endTime: slot.endTime,
            isAvailable: slot.isAvailable,
            isActive: slot.isActive,
            schedule: {
                id: schedule.id,
                slots: schedule.slots,
                emptySlots: schedule.emptySlots,
                allocatedSlots: schedule.allocatedSlots,
                date: schedule.date,
                startTime: schedule.startTime,
                endTime: schedule.endTime,
                durationMinutes: schedule.durationMinutes,
                isActive: schedule.isActive,
                procedureId: schedule.procedureId,
            },
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
            units: {
                id: unit.id,
                name: unit.name,
                cnpj: unit.cnpj,
                address: unit.address,
                city: unit.city,
                state: unit.state,
                phone: unit.phone,
                email: unit.email,
                isActive: unit.isActive,
            },
            specialties: {
                id: specialty.id,
                name: specialty.name,
                isActive: specialty.isActive,
            },
            procedures: procedure,
        });
    }
}
