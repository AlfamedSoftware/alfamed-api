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

export const patientFullDataByUserSchema = z.object({
    id: z.string().uuid(),
    isActive: z.boolean(),
    users: z.object({
        id: z.string().uuid(),
        name: z.string().min(1),
        socialName: z.string().nullable(),
        email: z.email(),
        phone: z.string().min(1),
        cpf: z.string().min(1),
        birthdate: z.string().datetime(),
        sex: z.string().nullable(),
        isActive: z.boolean(),
    }),
});

export const patientsErrorSchema = z.object({
    message: z.string().min(1),
});
