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

export const adminUnitOwnerSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.email(),
    cpf: z.string(),
    birthdate: z.string().datetime(),
    phone: z.string(),
    isActive: z.boolean(),
});

export const adminUnitSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    cnpj: z.string().nullable(),
    address: z.string().nullable(),
    city: z.string().nullable(),
    state: z.string().nullable(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    ownerUserId: z.string().uuid().nullable(),
    owner: adminUnitOwnerSchema.nullable(),
    professionalsCount: z.number().int(),
    isActive: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

export const createAdminUnitSchema = z
    .object({
        name: z.string().min(1),
        cnpj: z.string().min(1),
        address: z.string().min(1),
        city: z.string().min(1),
        state: z.string().length(2),
        phone: z.string().min(8),
        email: z.email(),
        isActive: z.boolean().optional(),
        owner: userCreateSchema,
    })
    .strict();

export const updateAdminUnitSchema = z
    .object({
        name: z.string().min(1).optional(),
        cnpj: z.string().min(1).optional(),
        address: z.string().min(1).optional(),
        city: z.string().min(1).optional(),
        state: z.string().length(2).optional(),
        phone: z.string().min(8).optional(),
        email: z.email().optional(),
        isActive: z.boolean().optional(),
        ownerUserId: z.string().uuid().nullable().optional(),
    })
    .strict();

export const adminProfessionalSchema = z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    unitId: z.string().uuid(),
    name: z.string(),
    email: z.email(),
    cpf: z.string(),
    birthdate: z.string().datetime(),
    phone: z.string(),
    crm: z.string().nullable(),
    specialtyIds: z.array(z.string().uuid()),
    status: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

export const createAdminProfessionalSchema = z
    .object({
        user: userCreateSchema,
        crm: z.string().min(1),
        specialtyIds: z.array(z.string().uuid()).optional(),
    })
    .strict();

export const adminErrorSchema = z.object({
    message: z.string(),
});

export type CreateAdminUnitInput = z.infer<typeof createAdminUnitSchema>;
export type UpdateAdminUnitInput = z.infer<typeof updateAdminUnitSchema>;
export type CreateAdminProfessionalInput = z.infer<typeof createAdminProfessionalSchema>;
