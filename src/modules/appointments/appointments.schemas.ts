import { z } from "zod";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, expected YYYY-MM-DD");
const timeSchema = z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Invalid time format, expected HH:mm or HH:mm:ss");

export const scheduleProfileSchema = z.object({
    id: z.string().uuid(),
    professionalSpecialtyId: z.string().uuid(),
    professionalUnitId: z.string().uuid(),
    unitId: z.string().uuid(),
    professionalId: z.string().uuid(),
    date: dateSchema,
    time: timeSchema,
    slots: z.number().int().min(1),
    slotsUsed: z.number().int().min(0),
    isActive: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

export const createScheduleSchema = z
    .object({
        professionalSpecialtyId: z.string().uuid(),
        professionalUnitId: z.string().uuid(),
        date: dateSchema,
        time: timeSchema,
        slots: z.number().int().min(1),
        isActive: z.boolean().optional(),
    })
    .strict();

export const updateScheduleSchema = z
    .object({
        professionalSpecialtyId: z.string().uuid().optional(),
        professionalUnitId: z.string().uuid().optional(),
        date: dateSchema.optional(),
        time: timeSchema.optional(),
        slots: z.number().int().min(1).optional(),
        isActive: z.boolean().optional(),
    })
    .strict();

export const availabilityQuerySchema = z.object({
    unitId: z.string().uuid(),
    date: dateSchema.optional(),
    professionalSpecialtyId: z.string().uuid().optional(),
});

export const appointmentRequestProfileSchema = z.object({
    id: z.string().uuid(),
    appointmentId: z.string().uuid(),
    scheduleId: z.string().uuid(),
    patientId: z.string().uuid(),
    unitId: z.string().uuid(),
    professionalId: z.string().uuid(),
    type: z.string().min(1),
    status: z.string().min(1),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

export const createAppointmentRequestSchema = z
    .object({
        scheduleId: z.string().uuid(),
    })
    .strict();

export const counterProposalSchema = z
    .object({
        proposedScheduleId: z.string().uuid(),
        observation: z.string().min(1).optional(),
    })
    .strict();

export const appointmentsErrorSchema = z.object({
    message: z.string().min(1),
});
