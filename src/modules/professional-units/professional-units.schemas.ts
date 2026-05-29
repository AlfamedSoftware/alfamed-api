import { z } from "zod";

export const createProfessionalUnitSchema = z
    .object({
        professionalId: z.string().uuid(),
        unitId: z.string().uuid(),
        isActive: z.boolean().optional(),
    })
    .strict();

export const createProfessionalUnitFullCreateSchema = z
    .object({
        name: z.string().min(1),
        socialName: z.union([z.string(), z.null()]).optional(),
        email: z.string().email(),
        cpf: z.string().min(1),
        birthdate: z.string().datetime(),
        phone: z.string().min(1),
        sex: z.enum(["M", "F", "O"]),
        crm: z.string().min(1),
        password: z.string().min(8),
        roleId: z.string().uuid(),
        professionalUnitStatus: z.boolean().optional(),
        patientStatus: z.boolean().optional(),
    })
    .strict();

export const professionalUnitProfileUpdateSchema = z
    .object({
        userId: z.string().uuid(),
        professionalId: z.string().uuid(),
        name: z.string().optional(),
        socialName: z.union([z.string(), z.null()]).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        cpf: z.string().optional(),
        birthdate: z.string().datetime().optional(),
        sex: z.union([z.enum(["M", "F", "O"]), z.null()]).optional(),
        crmNumber: z.union([z.string(), z.null()]).optional(),
        crmState: z.union([z.string(), z.null()]).optional(),
        password: z.string().min(8).optional(),
    })
    .strict();

export const professionalUnitFullUpdateSchema = z
    .object({
        userId: z.string().uuid(),
        professionalId: z.string().uuid(),
        professionalUnitId: z.string().uuid(),
        professionalUnitRoleId: z.string().uuid(),
        roleId: z.string().uuid(),
        patientId: z.string().uuid().optional(),
        name: z.string().optional(),
        socialName: z.union([z.string(), z.null()]).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        cpf: z.string().optional(),
        birthdate: z.string().datetime().optional(),
        sex: z.union([z.enum(["M", "F", "O"]), z.null()]).optional(),
        crmNumber: z.union([z.string(), z.null()]).optional(),
        crmState: z.union([z.string(), z.null()]).optional(),
        password: z.union([z.literal(""), z.string().min(8)]).optional(),
        professionalUnitStatus: z.boolean().optional(),
        patientStatus: z.boolean().optional(),
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
    professionalUnitRoles: z
        .object({
            id: z.string().uuid(),
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
