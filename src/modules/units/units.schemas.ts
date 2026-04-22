import { z } from "zod";

export const unitProfileSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    cnpj: z.string().nullable(),
    address: z.string().nullable(),
    city: z.string().nullable(),
    state: z.string().nullable(),
    phone: z.string().nullable(),
    email: z.email().nullable(),
    ownerUserId: z.string().uuid().nullable(),
    isActive: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

export const createUnitSchema = z
    .object({
        name: z.string().min(1),
        cnpj: z.string().min(1).optional(),
        address: z.string().min(1).optional(),
        city: z.string().min(1).optional(),
        state: z.string().length(2).optional(),
        phone: z.string().min(8).optional(),
        email: z.email().optional(),
        ownerUserId: z.string().uuid().nullable().optional(),
        isActive: z.boolean().optional(),
    })
    .strict();

export const updateUnitSchema = z
    .object({
        name: z.string().min(1).optional(),
        cnpj: z.string().min(1).optional(),
        address: z.string().min(1).optional(),
        city: z.string().min(1).optional(),
        state: z.string().length(2).optional(),
        phone: z.string().min(8).optional(),
        email: z.email().optional(),
        ownerUserId: z.string().uuid().nullable().optional(),
        isActive: z.boolean().optional(),
    })
    .strict();

export const unitsErrorSchema = z.object({
    message: z.string(),
});
