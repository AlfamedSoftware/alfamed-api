import { z } from "zod";

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, expected YYYY-MM-DD");

const userCreateSchema = z
    .object({
        name: z.string().min(1),
        email: z.email(),
        cpf: z.string().min(11).max(14),
        birthdate: dateStringSchema,
        phone: z.string().min(8),
        password: z.string().min(8),
        status: z.boolean().optional(),
    })
    .strict();

export const adminUpmUserSchema = z.object({
    professionalId: z.string().uuid(),
    userId: z.string().uuid(),
    professionalUnitId: z.string().uuid(),
    unitId: z.string().uuid(),
    unitName: z.string(),
    name: z.string(),
    email: z.email(),
    cpf: z.string(),
    birthdate: z.string().datetime(),
    phone: z.string(),
    status: z.boolean(),
    roleKey: z.string(),
    roleDescription: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

export const createAdminUpmUserSchema = z
    .object({
        unitId: z.string().uuid(),
        user: userCreateSchema,
    })
    .strict();

export const adminUpmErrorSchema = z.object({
    message: z.string(),
});

export type CreateAdminUpmUserInput = z.infer<typeof createAdminUpmUserSchema>;
