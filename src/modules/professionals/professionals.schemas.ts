import { z } from "zod";

export const createProfessionalSchema = z.object({
    isActive: z.boolean().optional(),
}).strict();

export const createProfessionalForUserSchema = z.object({
    userId: z.string().uuid(),
    isActive: z.boolean().optional(),
}).strict();

export const updateProfessionalSchema = z.object({
    userId: z.string().uuid().optional(),
    isActive: z.boolean().optional(),
}).strict();

export const professionalProfileSchema = z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    name: z.string().optional(),
    email: z.string().email().optional(),
    isActive: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

export const professionalsErrorSchema = z.object({
    message: z.string(),
});
