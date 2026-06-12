import { z } from "zod"

export const professionalUnitSpecialtySchema = z.object({
    id: z.string(),
    professionalUnitId: z.string(),
    specialtyId: z.string(),
    specialty: z.object({
        id: z.string(),
        name: z.string(),
        isActive: z.boolean(),
    }),
    isActive: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
})

export const professionalUnitSpecialtyListSchema = z.array(professionalUnitSpecialtySchema)

export const createProfessionalUnitSpecialtySchema = z.object({
    professionalUnitId: z.string(),
    specialtyId: z.string(),
})

export const updateProfessionalUnitSpecialtySchema = z.object({
    id: z.string(),
    isActive: z.boolean().optional(),
})

export const professionalUnitSpecialtiesErrorSchema = z.object({
    message: z.string(),
})

export type ProfessionalUnitSpecialty = z.infer<typeof professionalUnitSpecialtySchema>
