import { z } from "zod";

export const specialtyProfileSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    isActive: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

export const createSpecialtySchema = z
    .object({
        name: z.string().min(1),
        isActive: z.boolean().optional(),
    })
    .strict();

export const updateSpecialtySchema = z
    .object({
        name: z.string().min(1).optional(),
        isActive: z.boolean().optional(),
    })
    .strict();

export const specialtyLinkSchema = z
    .object({
        specialtyId: z.string().uuid(),
        professionalId: z.string().uuid(),
    })
    .strict();

export const specialtiesErrorSchema = z.object({
    message: z.string().min(1),
});
