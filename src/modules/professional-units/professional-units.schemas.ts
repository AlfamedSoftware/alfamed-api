import { z } from "zod";

export const createProfessionalUnitSchema = z
    .object({
        professionalId: z.string().uuid(),
        unitId: z.string().uuid(),
        isActive: z.boolean().optional(),
    })
    .strict();

export const professionalUnitProfileSchema = z.object({
    id: z.string().uuid(),
    professionalId: z.string().uuid(),
    unitId: z.string().uuid(),
    isActive: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

export const professionalUnitFullDataSchema = z.object({
    id: z.string().uuid(),
    isActive: z.boolean().optional(),
    users: z
        .object({
            id: z.string().uuid(),
            name: z.string(),
            socialName: z.string(),
            email: z.string().email(),
            phone: z.string(),
            cpf: z.string(),
            birthdate: z.string().optional(),
            sex: z.string(),
            isActive: z.boolean().optional(),
        })
        .optional(),
    professionals: z
        .object({
            id: z.string().uuid(),
            crm: z.string(),
            isActive: z.boolean().optional(),
        })
        .optional(),
    roles: z
        .object({
            id: z.string().uuid(),
            name: z.string(),
            isActive: z.boolean().optional(),
        })
        .optional(),
    patients: z
        .object({
            id: z.string().uuid(),
            isActive: z.boolean().optional(),
        })
        .optional(),
});

export const professionalUnitFullDataByUnitSchema = professionalUnitFullDataSchema.omit({
    patients: true,
});

export const professionalUnitFullDataByUnitListSchema = z.array(professionalUnitFullDataByUnitSchema);

export const professionalUnitsErrorSchema = z.object({
    message: z.string(),
});
