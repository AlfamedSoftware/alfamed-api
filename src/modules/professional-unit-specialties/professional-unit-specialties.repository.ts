import { eq, and } from "drizzle-orm"
import type { db as dbType } from "../../db/client.js"
import { professionalUnitSpecialties } from "../../db/schema/professional-unit-specialties.js"
import { specialties } from "../../db/schema/specialties.js"
import { DomainError } from "../../http/plugins/domain-error.js"
import type { ProfessionalUnitSpecialty } from "./professional-unit-specialties.schemas.js"

export class ProfessionalUnitSpecialtiesRepository {
    constructor(private db: typeof dbType) {}

    async listByProfessionalUnit(professionalUnitId: string): Promise<ProfessionalUnitSpecialty[]> {
        const results = await this.db
            .select({
                id: professionalUnitSpecialties.id,
                professionalUnitId: professionalUnitSpecialties.professionalUnitId,
                specialtyId: professionalUnitSpecialties.specialtyId,
                specialty: {
                    id: specialties.id,
                    name: specialties.name,
                    isActive: specialties.isActive,
                },
                isActive: professionalUnitSpecialties.isActive,
                createdAt: professionalUnitSpecialties.createdAt,
                updatedAt: professionalUnitSpecialties.updatedAt,
            })
            .from(professionalUnitSpecialties)
            .innerJoin(specialties, eq(professionalUnitSpecialties.specialtyId, specialties.id))
            .where(eq(professionalUnitSpecialties.professionalUnitId, professionalUnitId))

        return results.map((result) => ({
            ...result,
            createdAt: result.createdAt.toISOString(),
            updatedAt: result.updatedAt.toISOString(),
        }))
    }

    async create(data: { professionalUnitId: string; specialtyId: string }): Promise<ProfessionalUnitSpecialty> {
        const existing = await this.db
            .select()
            .from(professionalUnitSpecialties)
            .where(
                and(
                    eq(professionalUnitSpecialties.professionalUnitId, data.professionalUnitId),
                    eq(professionalUnitSpecialties.specialtyId, data.specialtyId),
                ),
            )
            .limit(1)

        if (existing.length > 0) {
            const existingRecord = existing[0]
            if (existingRecord.isActive) {
                throw new DomainError("PROFESSIONAL_UNIT_SPECIALTY_ALREADY_EXISTS", "Especialidade já cadastrada para essa unidade profissional")
            }
            // Reativar o registro existente
            return this.update({ id: existingRecord.id, isActive: true })
        }

        const [result] = await this.db
            .insert(professionalUnitSpecialties)
            .values({
                professionalUnitId: data.professionalUnitId,
                specialtyId: data.specialtyId,
                isActive: true,
            })
            .returning()

        return this.listByProfessionalUnit(data.professionalUnitId).then(
            specialties => specialties.find(s => s.id === result.id)!
        )
    }

    async update(data: { id: string; isActive?: boolean }): Promise<ProfessionalUnitSpecialty> {
        await this.db
            .update(professionalUnitSpecialties)
            .set({
                ...(data.isActive !== undefined && { isActive: data.isActive }),
                updatedAt: new Date(),
            })
            .where(eq(professionalUnitSpecialties.id, data.id))

        const [result] = await this.db
            .select()
            .from(professionalUnitSpecialties)
            .where(eq(professionalUnitSpecialties.id, data.id))

        return this.listByProfessionalUnit(result.professionalUnitId).then(
            specialties => specialties.find(s => s.id === data.id)!
        )
    }
}
