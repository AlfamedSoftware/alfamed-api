import { and, eq } from "drizzle-orm";
import type { z } from "zod";
import type { db as dbType } from "../../db/client.js";
import { professionalSpecialties } from "../../db/schema/professional-specialties.js";
import { professionalUnits } from "../../db/schema/professional-units.js";
import { professionals } from "../../db/schema/professionals.js";
import { specialties } from "../../db/schema/specialties.js";
import {
    createSpecialtySchema,
    specialtyProfileSchema,
    updateSpecialtySchema,
} from "./specialties.schemas.js";

type DatabaseClient = typeof dbType;

export type SpecialtyProfile = z.infer<typeof specialtyProfileSchema>;
export type CreateSpecialtyInput = z.infer<typeof createSpecialtySchema>;
export type UpdateSpecialtyInput = z.infer<typeof updateSpecialtySchema>;

export class SpecialtiesRepository {
    readonly create: (data: CreateSpecialtyInput) => Promise<SpecialtyProfile>;
    readonly findById: (specialtyId: string) => Promise<SpecialtyProfile | null>;
    readonly list: () => Promise<SpecialtyProfile[]>;
    readonly update: (specialtyId: string, data: UpdateSpecialtyInput) => Promise<SpecialtyProfile | null>;
    readonly delete: (specialtyId: string) => Promise<void>;
    readonly findProfessionalByIdAndUnit: (professionalId: string, unitId: string) => Promise<{ id: string } | null>;
    readonly linkProfessionalSpecialty: (professionalId: string, specialtyId: string) => Promise<void>;
    readonly unlinkProfessionalSpecialty: (professionalId: string, specialtyId: string) => Promise<boolean>;
    readonly listByProfessionalAndUnit: (professionalId: string, unitId: string) => Promise<SpecialtyProfile[]>;

    constructor(db: DatabaseClient) {
        const toProfile = (row: {
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
        }) =>
            specialtyProfileSchema.parse({
                id: row.id,
                name: row.name,
                isActive: row.isActive,
                createdAt: row.createdAt.toISOString(),
                updatedAt: row.updatedAt.toISOString(),
            });

        this.create = async (data) => {
            const [row] = await db
                .insert(specialties)
                .values({
                    name: data.name,
                    isActive: data.isActive,
                })
                .returning({
                    id: specialties.id,
                    name: specialties.name,
                    isActive: specialties.isActive,
                    createdAt: specialties.createdAt,
                    updatedAt: specialties.updatedAt,
                });

            return toProfile(row);
        };

        this.findById = async (specialtyId) => {
            const [row] = await db
                .select({
                    id: specialties.id,
                    name: specialties.name,
                    isActive: specialties.isActive,
                    createdAt: specialties.createdAt,
                    updatedAt: specialties.updatedAt,
                })
                .from(specialties)
                .where(eq(specialties.id, specialtyId))
                .limit(1);

            return row ? toProfile(row) : null;
        };

        this.list = async () => {
            const rows = await db
                .select({
                    id: specialties.id,
                    name: specialties.name,
                    isActive: specialties.isActive,
                    createdAt: specialties.createdAt,
                    updatedAt: specialties.updatedAt,
                })
                .from(specialties);

            return rows.map(toProfile);
        };

        this.update = async (specialtyId, data) => {
            const [row] = await db
                .update(specialties)
                .set({
                    name: data.name,
                    isActive: data.isActive,
                })
                .where(eq(specialties.id, specialtyId))
                .returning({
                    id: specialties.id,
                    name: specialties.name,
                    isActive: specialties.isActive,
                    createdAt: specialties.createdAt,
                    updatedAt: specialties.updatedAt,
                });

            return row ? toProfile(row) : null;
        };

        this.delete = async (specialtyId) => {
            await db.delete(specialties).where(eq(specialties.id, specialtyId));
        };

        this.findProfessionalByIdAndUnit = async (professionalId, unitId) => {
            const [row] = await db
                .select({ id: professionals.id })
                .from(professionals)
                .innerJoin(professionalUnits, eq(professionals.id, professionalUnits.professionalId))
                .where(and(eq(professionals.id, professionalId), eq(professionalUnits.unitId, unitId)))
                .limit(1);

            return row ?? null;
        };

        this.linkProfessionalSpecialty = async (professionalId, specialtyId) => {
            await db.insert(professionalSpecialties).values({
                professionalId,
                specialtyId,
            });
        };

        this.unlinkProfessionalSpecialty = async (professionalId, specialtyId) => {
            const deleted = await db
                .delete(professionalSpecialties)
                .where(
                    and(
                        eq(professionalSpecialties.professionalId, professionalId),
                        eq(professionalSpecialties.specialtyId, specialtyId),
                    ),
                )
                .returning({ id: professionalSpecialties.id });

            return deleted.length > 0;
        };

        this.listByProfessionalAndUnit = async (professionalId, unitId) => {
            const rows = await db
                .select({
                    id: specialties.id,
                    name: specialties.name,
                    isActive: specialties.isActive,
                    createdAt: specialties.createdAt,
                    updatedAt: specialties.updatedAt,
                })
                .from(specialties)
                .innerJoin(professionalSpecialties, eq(specialties.id, professionalSpecialties.specialtyId))
                .innerJoin(professionals, eq(professionalSpecialties.professionalId, professionals.id))
                .innerJoin(professionalUnits, eq(professionals.id, professionalUnits.professionalId))
                .where(and(eq(professionals.id, professionalId), eq(professionalUnits.unitId, unitId)));

            return rows.map(toProfile);
        };
    }
}
