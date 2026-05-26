import { z } from "zod";

export const createPatientForUserSchema = z.object({
    userId: z.string().uuid(),
    isActive: z.boolean().optional(),
}).strict();

export const patientProfileSchema = z.object({
    id: z.string(),
    userId: z.string(),
    isActive: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

export const patientListItemSchema = z.object({
    id: z.string(),
    userId: z.string(),
    name: z.string().min(1),
    email: z.string().email(),
    cpf: z.string().optional(),
    phone: z.string().min(1),
    isActive: z.boolean(),
});

export const patientsErrorSchema = z.object({
    message: z.string().min(1),
});
