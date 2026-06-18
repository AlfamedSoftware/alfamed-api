import { t } from "elysia";
import { z } from "zod";

export const patientSlotsQuerySchema = z.object({
    professionalId: z.string().uuid(),
    unitId: z.string().uuid(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
});

export const patientCreateAppointmentSchema = z.object({
    professionalId: z.string().uuid(),
    unitId: z.string().uuid(),
    startAt: z.string().datetime(),
    reason: z.string().min(1).optional(),
});

export type PatientSlotsQuery = z.infer<typeof patientSlotsQuerySchema>;
export type PatientCreateAppointmentInput = z.infer<typeof patientCreateAppointmentSchema>;

export type Slot = {
    startAt: string;
    endAt: string;
    available: boolean;
};

// Elysia t schemas for OpenAPI
export const slotResponseSchema = t.Object({
    startAt: t.String({ format: "date-time" }),
    endAt: t.String({ format: "date-time" }),
    available: t.Boolean(),
});

export const patientAppointmentResponseSchema = t.Object({
    id: t.String(),
    patientId: t.String(),
    professionalUnitId: t.String(),
    startAt: t.String({ format: "date-time" }),
    endAt: t.String({ format: "date-time" }),
    reason: t.Union([t.String(), t.Null()]),
});

export const patientAppointmentsErrorSchema = t.Object({ message: t.String() });
