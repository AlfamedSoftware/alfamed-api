import { z } from "zod";

export const anamnesisSchema = z.object({
    id: z.string().uuid(),
    appointmentId: z.string().uuid(),
    mainComplaint: z.string().nullable(),
    painLevel: z.number().int().min(0).max(3).nullable(),
    takingMedication: z.string().nullable(),
    knownAllergy: z.string().nullable(),
    hadSurgery: z.boolean().nullable(),
    surgeryDetails: z.string().nullable(),
    familyHistory: z.boolean().nullable(),
    familyHistoryDetails: z.string().nullable(),
    isActive: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

export const anamnesisListSchema = z.array(anamnesisSchema);

export const anamnesisErrorSchema = z.object({
    message: z.string(),
});

export const createAnamnesisSchema = z
    .object({
        appointmentId: z.string().uuid(),
        mainComplaint: z.string().nullable().optional(),
        painLevel: z.number().int().min(0).max(3).nullable().optional(),
        takingMedication: z.string().nullable().optional(),
        knownAllergy: z.string().nullable().optional(),
        hadSurgery: z.boolean().nullable().optional(),
        surgeryDetails: z.string().nullable().optional(),
        familyHistory: z.boolean().nullable().optional(),
        familyHistoryDetails: z.string().nullable().optional(),
    })
    .strict();
