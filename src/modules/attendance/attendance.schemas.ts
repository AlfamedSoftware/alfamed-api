import { z } from "zod";

const isoDateTimeSchema = z.string().datetime();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const nullableStringSchema = z.union([z.string(), z.null()]);

export const attendanceErrorSchema = z.object({
    message: z.string().min(1),
});

export const attendanceSchedulesQuerySchema = z.object({
    date: dateSchema,
    specialtyId: z.string().uuid().optional(),
});

export const attendancePatientSummarySchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    birthDate: isoDateTimeSchema,
    gender: nullableStringSchema,
});

export const attendanceScheduleSummarySchema = z.object({
    id: z.string().uuid(),
    startAt: isoDateTimeSchema,
    endAt: isoDateTimeSchema,
    status: z.string(),
    patient: attendancePatientSummarySchema,
});

export const attendanceSpecialtySchedulesSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    schedules: z.array(attendanceScheduleSummarySchema),
});

export const attendanceSchedulesResponseSchema = z.object({
    specialties: z.array(attendanceSpecialtySchedulesSchema),
});

export const attendanceScheduleDetailsSchema = z.object({
    id: z.string().uuid(),
    startAt: isoDateTimeSchema,
    endAt: isoDateTimeSchema,
    status: z.string(),
    specialtyId: z.string().uuid(),
    specialtyName: z.string(),
    patient: z.object({
        id: z.string().uuid(),
        name: z.string(),
        birthDate: isoDateTimeSchema,
        gender: nullableStringSchema,
        phone: nullableStringSchema,
        email: nullableStringSchema,
        complaints: nullableStringSchema,
    }),
});

export const updateAttendanceScheduleStatusSchema = z.object({
    status: z.enum(["in_progress", "done", "cancelled"]),
});

export const updateAttendanceScheduleStatusResponseSchema = z.object({
    id: z.string().uuid(),
    status: z.string(),
});

export type AttendanceSchedulesQuery = z.infer<typeof attendanceSchedulesQuerySchema>;
export type UpdateAttendanceScheduleStatusInput = z.infer<typeof updateAttendanceScheduleStatusSchema>;
