import { z } from "zod";

export const roleSchema = z.object({
    id: z.string().uuid(),
    description: z.string(),
    key: z.string(),
    isActive: z.boolean(),
    internal: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

export const rolesErrorSchema = z.object({
    message: z.string(),
});
