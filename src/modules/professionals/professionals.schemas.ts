import { z } from "zod";

const cpfPattern = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
const phonePattern = /^\(\d{2}\) \d{4,5}-\d{4}$/;
const crmPattern = /^[A-Z]{2}\d{4,6}$/;

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
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().regex(phonePattern, "Telefone deve estar no formato (11) 99999-9999").optional(),
    cpf: z.string().regex(cpfPattern, "CPF deve estar no formato 000.000.000-00").optional(),
    birthdate: z.string().datetime().optional(),
    crm: z.union([z.string().regex(crmPattern, "CRM deve estar no formato SC123456"), z.null()]).optional(),
}).strict();

export const professionalProfileSchema = z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    crm: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    isActive: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

export const professionalRoleProfileSchema = z.object({
    id: z.string().uuid(),
    description: z.string(),
    key: z.string(),
    isActive: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

export const professionalsErrorSchema = z.object({
    message: z.string(),
});

export const professionalDetailSchema = professionalProfileSchema.extend({
    cpf: z.string().nullable().optional(),
    birthdate: z.string().nullable().optional(),
    unit: z
        .object({
            id: z.string().uuid(),
            name: z.string(),
        })
        .nullable()
        .optional(),
    users: z
        .array(
            z.object({
                id: z.string().uuid(),
                name: z.string(),
                email: z.string().email(),
                phone: z.string().nullable().optional(),
                cpf: z.string().nullable().optional(),
                birthdate: z.string().nullable().optional(),
            }),
        )
        .optional(),
});
