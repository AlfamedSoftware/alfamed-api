import { z } from "zod";

export const createPatientForUserSchema = z.object({
    userId: z.string().uuid(),
    isActive: z.boolean().optional(),
}).strict();

export const createPatientFullCreateSchema = z.object({
    name: z.string().min(1),
    socialName: z.union([z.string(), z.null()]).optional(),
    email: z.string().email(),
    cpf: z.string().min(1),
    birthdate: z.string().datetime(),
    phone: z.string().min(1),
    sex: z.enum(["M", "F", "O"]),
    password: z.string().min(8),
}).strict();

export const patientFullUpdateSchema = z
    .object({
        userId: z.string().uuid(),
        patientId: z.string().uuid(),
        name: z.string().optional(),
        socialName: z.union([z.string(), z.null()]).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        cpf: z.string().optional(),
        birthdate: z.string().datetime().optional(),
        sex: z.union([z.enum(["M", "F", "O"]), z.null()]).optional(),
        password: z.union([z.literal(""), z.string().min(8)]).optional(),
        patientStatus: z.boolean().optional(),
    })
    .strict();

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
