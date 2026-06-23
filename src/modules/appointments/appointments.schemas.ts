import { z } from "zod";

export const appointmentSchema = z.object({
    id: z.string().uuid(),
    patientId: z.string().uuid(),
    professionalUnitId: z.string().uuid(),
    scheduleSlotId: z.string().uuid(),
    startAt: z.string().datetime().nullable(),
    endAt: z.string().datetime().nullable(),
    diagnostics: z.string().nullable(),
    evolution: z.string().nullable(),
    statusId: z.string().uuid(),
    isActive: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

export const appointmentsListSchema = z.array(appointmentSchema);

export const appointmentsErrorSchema = z.object({
    message: z.string().min(1),
});

export const createAppointmentSchema = z
    .object({
        patientId: z.string().uuid(),
        professionalUnitId: z.string().uuid(),
        scheduleSlotId: z.string().uuid(),
        statusCode: z.number().int(),
    })
    .strict();

export const updateAppointmentSchema = z
    .object({
        appointmentId: z.string().uuid(),
        patientId: z.string().uuid().optional(),
        professionalUnitId: z.string().uuid().optional(),
        scheduleSlotId: z.string().uuid().optional(),
        startAt: z.date().nullable().optional(),
        endAt: z.date().nullable().optional(),
        diagnostics: z.string().nullable().optional(),
        evolution: z.string().nullable().optional(),
        statusCode: z.number().int(),
        isActive: z.boolean().optional(),
    })
    .strict();
