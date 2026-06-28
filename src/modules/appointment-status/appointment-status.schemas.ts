import { z } from "zod";

export const appointmentStatusSchema = z.object({
    id: z.string().uuid(),
    code: z.number().int(),
    description: z.string(),
    isActive: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

export const appointmentStatusErrorSchema = z.object({
    message: z.string(),
});
