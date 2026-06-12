import { z } from "zod";

const isoDateTimeSchema = z.string().datetime();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const createAppointmentSchema = z
    .object({
        patientId: z.string().uuid(),
        professionalId: z.string().uuid().optional(),
        startAt: isoDateTimeSchema,
        endAt: isoDateTimeSchema,
        reason: z.string().min(1).optional(),
    })
    .refine((value) => new Date(value.endAt).getTime() > new Date(value.startAt).getTime(), {
        message: "endAt must be greater than startAt",
        path: ["endAt"],
    });

export const appointmentEventSchema = z.object({
    id: z.string().uuid(),
    kind: z.enum(["appointment", "block"]),
    title: z.string().min(1),
    start: isoDateTimeSchema,
    end: isoDateTimeSchema,
    color: z.string().min(1),
    backgroundColor: z.string().min(1),
    description: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    professionalId: z.string().uuid().nullable().optional(),
});

export const availabilityWindowSchema = z.object({
    start: isoDateTimeSchema,
    end: isoDateTimeSchema,
});

export const availabilityQuerySchema = z.object({
    professionalId: z.string().uuid(),
    date: dateSchema,
    durationMinutes: z.coerce.number().int().positive().optional(),
    startAt: isoDateTimeSchema.optional(),
    endAt: isoDateTimeSchema.optional(),
});

export const calendarEventsQuerySchema = z.object({
    professionalIds: z.union([
        z.string().optional(),
        z.array(z.string()).optional(),
    ]),
    from: isoDateTimeSchema,
    to: isoDateTimeSchema,
});

export const appointmentsErrorSchema = z.object({
    message: z.string().min(1),
});

export const appointmentAvailabilityResponseSchema = z.object({
    available: z.boolean(),
    windows: z.array(availabilityWindowSchema),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type AppointmentEvent = z.infer<typeof appointmentEventSchema>;
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
export type CalendarEventsQuery = z.infer<typeof calendarEventsQuerySchema>;