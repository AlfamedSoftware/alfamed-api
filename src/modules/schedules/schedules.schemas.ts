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

export const procedureSchema = z.object({
    id: z.string().uuid(),
    type: z.number(),
    description: z.string(),
    observation: z.string().nullable(),
    code: z.string(),
    price: z.string(),
    isActive: z.boolean(),
}).nullable();

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

export const unitSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    cnpj: z.string().nullable(),
    address: z.string().nullable(),
    city: z.string().nullable(),
    state: z.string().nullable(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    isActive: z.boolean(),
});

export const scheduleSchema = z.object({
    id: z.string().uuid(),
    slots: z.number(),
    emptySlots: z.number(),
    allocatedSlots: z.number(),
    date: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    durationMinutes: z.number(),
    isActive: z.boolean(),
    procedureId: z.string().uuid(),
});

export const fullSlotDetailSchema = z.object({
    id: z.string().uuid(),
    startTime: z.string(),
    endTime: z.string(),
    isAvailable: z.boolean(),
    isActive: z.boolean(),
    schedule: scheduleSchema,
    users: userSchema,
    professional_unit: professionalUnitSchema,
    units: unitSchema,
    specialties: specialtySchema,
    procedures: procedureSchema,
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
    procedureId: z.string().uuid(),
    users: userSchema,
    professional_unit: professionalUnitSchema,
    schedule_slots: z.array(scheduleSlotSchema),
    specialties: specialtySchema,
});

export const listFullAvailableScheduleSlotsSchema = z.array(scheduleFullDataSchema);

export const createScheduleBodySchema = z.object({
    professionalUnitId: z.string().uuid(),
    isActive: z.boolean(),
    startTime: z.string(),
    endTime: z.string(),
    specialtyId: z.string().uuid(),
    slots: z.number().int().positive(),
    date: z.string(),
    durationMinutes: z.number().int().positive(),
    procedureId: z.string().uuid(),
});

export const createScheduleResponseSchema = z.object({
    id: z.string().uuid(),
    professionalUnitId: z.string(),
    specialtyId: z.string(),
    procedureId: z.string().uuid(),
    slots: z.number(),
    emptySlots: z.number(),
    allocatedSlots: z.number(),
    date: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    durationMinutes: z.number(),
    isActive: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});
