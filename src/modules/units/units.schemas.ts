import { z } from "zod";

export const unitProfileSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    isActive: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

export const createUnitSchema = z
    .object({
        name: z.string().min(1),
        isActive: z.boolean().optional(),
    })
    .strict();

export const updateUnitSchema = z
    .object({
        name: z.string().min(1).optional(),
        isActive: z.boolean().optional(),
    })
    .strict();

export const unitsErrorSchema = z.object({
    message: z.string(),
});
