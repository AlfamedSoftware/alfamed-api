import { z } from "zod";

const requestItemSchema = z.object({
    id: z.string().uuid(),
    statusId: z.string().uuid(),
    statusCode: z.number().int(),
    statusDescription: z.string(),
    performedAt: z.string().datetime().nullable(),
    complementaryInfo: z.string().nullable(),
    justification: z.string().nullable(),
    procedures: z.object({
        id: z.string().uuid(),
        description: z.string(),
        code: z.string(),
        price: z.string(),
    }),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

export const examManagementItemSchema = z.object({
    id: z.string().uuid(),
    statusId: z.string().uuid(),
    isActive: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    schedules: z.object({
        id: z.string().uuid(),
        date: z.string(),
        startTime: z.string(),
        endTime: z.string(),
        procedures: z.object({
            id: z.string().uuid(),
            description: z.string(),
            code: z.string(),
        }),
        specialties: z.object({
            id: z.string().uuid(),
            name: z.string(),
        }),
    }),
    schedules_slots: z.object({
        id: z.string().uuid(),
        startTime: z.string(),
        endTime: z.string(),
    }),
    patients: z.object({
        id: z.string().uuid(),
        name: z.string(),
        socialName: z.string().nullable(),
        cpf: z.string(),
        phone: z.string(),
        email: z.string().email(),
        sex: z.string().nullable(),
        birthdate: z.string(),
    }),
    professional_units: z.object({
        id: z.string().uuid(),
        professional: z.object({
            id: z.string().uuid(),
            crm: z.string().nullable(),
            user: z.object({
                id: z.string().uuid(),
                name: z.string(),
            }),
        }),
    }),
    requests: z.array(requestItemSchema),
});

export const examManagementListSchema = z.array(examManagementItemSchema);

export const examManagementSummaryItemSchema = z.object({
    id: z.string().uuid(),
    patients: z.object({
        name: z.string(),
        socialName: z.string().nullable(),
        cpf: z.string(),
    }),
    professional_units: z.object({
        professional: z.object({
            user: z.object({
                name: z.string(),
            }),
        }),
    }),
    schedules: z.object({
        specialties: z.object({
            name: z.string(),
        }),
        procedures: z.object({
            description: z.string(),
        }),
    }),
    requestCount: z.number().int(),
});

export const examManagementSummaryListSchema = z.array(examManagementSummaryItemSchema);

export const examManagementErrorSchema = z.object({
    message: z.string(),
});
