import { z } from "zod";

export const createPatientForUserSchema = z.object({
    userId: z.string().uuid(),
    isActive: z.boolean().optional(),
}).strict();

export const patientProfileSchema = z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    isActive: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

export const patientsErrorSchema = z.object({
    message: z.string().min(1),
});
