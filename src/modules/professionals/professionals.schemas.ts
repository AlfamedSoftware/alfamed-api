import { z } from "zod";

export const createProfessionalSchema = z.object({
    userId: z.string().uuid(),
    isActive: z.boolean().optional(),
});

export const updateProfessionalSchema = z.object({
    userId: z.string().uuid().optional(),
    isActive: z.boolean().optional(),
});

export const professionalProfileSchema = z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    isActive: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

export const professionalsErrorSchema = z.object({
    message: z.string(),
});
