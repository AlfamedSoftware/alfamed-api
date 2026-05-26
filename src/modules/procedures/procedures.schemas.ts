import { z } from "zod";

export const procedureSchema = z.object({
    id: z.string().uuid(),
    unitId: z.string().uuid(),
    description: z.string(),
    observation: z.string().nullable(),
    code: z.string(),
    price: z.string(),
    isActive: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

export const proceduresListSchema = z.array(procedureSchema);

export const proceduresErrorSchema = z.object({
    message: z.string().min(1),
});

export const createProcedureSchema = z
    .object({
        description: z.string().min(1),
        observation: z.string().optional(),
        code: z.string().min(1),
        price: z.string().min(1),
        isActive: z.boolean().optional(),
    })
    .strict();