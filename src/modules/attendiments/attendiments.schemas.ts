import { z } from "zod";

export const attendimentSchema = z.object({
    id: z.string().uuid(),
    // TODO: Add fields
});

export const createAttendimentSchema = z
    .object({
        // TODO: Add fields
    })
    .strict();

export const updateAttendimentSchema = z
    .object({
        // TODO: Add fields
    })
    .strict()
    .partial();

export const attendimentsErrorSchema = z.object({
    message: z.string(),
});

export const appointmentBySpecialtySchema = z.object({
    specialtyId: z.string().uuid(),
    specialtyName: z.string(),
    procedureId: z.string().uuid(),
    procedureName: z.string(),
    procedureDescription: z.string().nullable(),
    appointments: z.array(
        z.object({
            id: z.string().uuid(),
            patientId: z.string().uuid(),
            patientName: z.string(),
            patientUserEmail: z.string().email(),
            professionalUnitId: z.string().uuid(),
            scheduleSlotId: z.string().uuid(),
            scheduleSlotStartTime: z.string(),
            scheduleSlotEndTime: z.string(),
            scheduleDate: z.string(),
            scheduleStartTime: z.string(),
            scheduleEndTime: z.string(),
            startAt: z.string().datetime().nullable(),
            endAt: z.string().datetime().nullable(),
            diagnostics: z.string().nullable(),
            evolution: z.string().nullable(),
            statusId: z.string().uuid(),
            statusCode: z.number(),
            statusDescription: z.string(),
            isActive: z.boolean(),
            createdAt: z.string().datetime(),
            updatedAt: z.string().datetime(),
        })
    ),
});

export const appointmentsBySpecialtyListSchema = z.array(appointmentBySpecialtySchema);

export const appointmentFullDataSchema = z.object({
    id: z.string().uuid(),
    patientId: z.string().uuid(),
    professionalUnitId: z.string().uuid(),
    scheduleSlotId: z.string().uuid(),
    startAt: z.string().datetime().nullable(),
    endAt: z.string().datetime().nullable(),
    diagnostics: z.string().nullable(),
    evolution: z.string().nullable(),
    clinicNotes: z.string().nullable(),
    statusId: z.string().uuid(),
    statusCode: z.number(),
    statusDescription: z.string(),
    isActive: z.boolean(),
    users: z.object({
        id: z.string().uuid(),
        name: z.string(),
        socialName: z.string().nullable(),
        cpf: z.string(),
        birthdate: z.string(),
        phone: z.string(),
        email: z.string().email(),
        sex: z.string().nullable(),
        image: z.string().nullable(),
        isActive: z.boolean(),
    }),
    schedules: z.object({
        id: z.string().uuid(),
        date: z.string(),
        isActive: z.boolean(),
    }),
    schedules_slots: z.object({
        id: z.string().uuid(),
        startTime: z.string(),
        endTime: z.string(),
        isActive: z.boolean(),
    }),
    specialties: z.object({
        id: z.string().uuid(),
        name: z.string(),
        isActive: z.boolean(),
    }),
    procedures: z.object({
        id: z.string().uuid(),
        type: z.number(),
        description: z.string(),
        observation: z.string().nullable(),
        code: z.string(),
        price: z.string(),
        isActive: z.boolean(),
    }),
    appointment_status: z.object({
        id: z.string().uuid(),
        code: z.number(),
        description: z.string(),
        isActive: z.boolean(),
    }),
    units: z.object({
        id: z.string().uuid(),
        name: z.string(),
        cnpj: z.string().nullable(),
        address: z.string().nullable(),
        city: z.string().nullable(),
        state: z.string().nullable(),
        phone: z.string().nullable(),
        email: z.string().nullable(),
        isActive: z.boolean(),
    }),
});
