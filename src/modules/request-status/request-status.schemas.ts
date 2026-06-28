import { z } from "zod";

export const requestStatusSchema = z.object({
    id: z.string().uuid(),
    code: z.number().int(),
    description: z.string(),
    isActive: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

export const requestStatusErrorSchema = z.object({
    message: z.string(),
});
