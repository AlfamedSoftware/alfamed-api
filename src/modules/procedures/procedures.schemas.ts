import { z } from "zod";

export const procedureSchema = z.object({
    id: z.string().uuid(),
    unitId: z.string().uuid(),
    specialtyId: z.string().uuid().nullable(),
    type: z.number(),
    description: z.string(),
    observation: z.string().nullable(),
    code: z.string(),
    price: z.string(),
    isActive: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    specialty: z.object({
        id: z.string().uuid(),
        name: z.string(),
        isActive: z.boolean(),
    }).nullable(),
});

export const proceduresListSchema = z.array(procedureSchema);

export const proceduresErrorSchema = z.object({
    message: z.string().min(1),
});

export const createProcedureSchema = z
    .object({
        specialtyId: z.string().uuid().optional(),
        type: z.number(),
        description: z.string().min(1),
        observation: z.string().optional(),
        code: z.string().min(1),
        price: z.string().min(1),
        isActive: z.boolean().optional(),
    })
    .strict();

export const updateProcedureSchema = z
    .object({
        procedureId: z.string().uuid(),
        specialtyId: z.union([z.string().uuid(), z.null()]).optional(),
        type: z.number().optional(),
        description: z.string().min(1).optional(),
        observation: z.union([z.string(), z.null()]).optional(),
        code: z.string().min(1).optional(),
        price: z.string().min(1).optional(),
        isActive: z.boolean().optional(),
    })
    .strict();