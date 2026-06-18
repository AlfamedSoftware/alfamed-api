import { z } from "zod";

export const schedulesErrorSchema = z.object({
    message: z.string(),
});

export const scheduleSlotSchema = z.object({
    id: z.string().uuid(),
    startTime: z.string(),
    endTime: z.string(),
    isAvailable: z.boolean(),
    isActive: z.boolean(),
});

export const specialtySchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    isActive: z.boolean(),
});

export const userSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    socialName: z.string(),
    email: z.string(),
    phone: z.string(),
    cpf: z.string(),
    birthdate: z.string().datetime(),
    sex: z.string(),
    isActive: z.boolean(),
});

export const professionalUnitSchema = z.object({
    id: z.string().uuid(),
    isActive: z.boolean(),
});

export const scheduleFullDataSchema = z.object({
    id: z.string().uuid(),
    slots: z.number(),
    emptySlots: z.number(),
    allocatedSlots: z.number(),
    date: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    durationMinutes: z.number(),
    isActive: z.boolean(),
    users: userSchema,
    professional_unit: professionalUnitSchema,
    schedule_slots: z.array(scheduleSlotSchema),
    specialties: specialtySchema,
});

export const listFullAvailableScheduleSlotsSchema = z.array(scheduleFullDataSchema);
