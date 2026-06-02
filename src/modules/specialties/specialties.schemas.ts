import { z } from "zod";

export const specialtySchema = z.object({
    id: z.string().uuid(),
    unitId: z.string().uuid(),
    name: z.string(),
    isActive: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

export const specialtiesListSchema = z.array(specialtySchema);

export const specialtiesErrorSchema = z.object({
    message: z.string().min(1),
});

export const createSpecialtySchema = z
    .object({
        name: z.string().min(1),
        isActive: z.boolean().optional(),
    })
    .strict();

export const updateSpecialtySchema = z
    .object({
        specialtyId: z.string().uuid(),
        name: z.string().min(1).optional(),
        isActive: z.boolean().optional(),
    })
    .strict();