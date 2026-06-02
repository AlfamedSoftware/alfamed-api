import { and, asc, eq, ne } from "drizzle-orm";
import type { z } from "zod";
import type { db as dbType } from "../../db/client.js";
import { specialties } from "../../db/schema/specialties.js";
import { specialtySchema } from "./specialties.schemas.js";

type DatabaseClient = typeof dbType;

export type SpecialtyProfile = z.infer<typeof specialtySchema>;

export class SpecialtiesRepository {
    constructor(private readonly db: DatabaseClient) {}

    async findByNameAndUnitId(
        name: string,
        unitId: string,
        excludeSpecialtyId?: string,
    ): Promise<SpecialtyProfile | null> {
        const whereClause = excludeSpecialtyId
            ? and(
                eq(specialties.name, name),
                eq(specialties.unitId, unitId),
                ne(specialties.id, excludeSpecialtyId),
            )
            : and(eq(specialties.name, name), eq(specialties.unitId, unitId));

        const [row] = await this.db
            .select({
                id: specialties.id,
                unitId: specialties.unitId,
                name: specialties.name,
                isActive: specialties.isActive,
                createdAt: specialties.createdAt,
                updatedAt: specialties.updatedAt,
            })
            .from(specialties)
            .where(whereClause)
            .limit(1);

        if (!row) {
            return null;
        }

        return specialtySchema.parse({
            ...row,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
        });
    }

    async findByIdAndUnitId(specialtyId: string, unitId: string): Promise<SpecialtyProfile | null> {
        const [row] = await this.db
            .select({
                id: specialties.id,
                unitId: specialties.unitId,
                name: specialties.name,
                isActive: specialties.isActive,
                createdAt: specialties.createdAt,
                updatedAt: specialties.updatedAt,
            })
            .from(specialties)
            .where(eq(specialties.id, specialtyId))
            .limit(1);

        if (!row) {
            return null;
        }

        if (row.unitId !== unitId) {
            return null;
        }

        return specialtySchema.parse({
            ...row,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
        });
    }

    async listByUnitId(unitId: string): Promise<SpecialtyProfile[]> {
        const rows = await this.db
            .select({
                id: specialties.id,
                unitId: specialties.unitId,
                name: specialties.name,
                isActive: specialties.isActive,
                createdAt: specialties.createdAt,
                updatedAt: specialties.updatedAt,
            })
            .from(specialties)
            .where(eq(specialties.unitId, unitId))
            .orderBy(asc(specialties.name));

        return rows.map((row) =>
            specialtySchema.parse({
                ...row,
                createdAt: row.createdAt.toISOString(),
                updatedAt: row.updatedAt.toISOString(),
            }),
        );
    }

    async createForUnit(unitId: string, data: {
        name: string;
        isActive?: boolean;
    }): Promise<SpecialtyProfile> {
        const [row] = await this.db
            .insert(specialties)
            .values({
                unitId,
                name: data.name,
                isActive: data.isActive ?? true,
            })
            .returning({
                id: specialties.id,
                unitId: specialties.unitId,
                name: specialties.name,
                isActive: specialties.isActive,
                createdAt: specialties.createdAt,
                updatedAt: specialties.updatedAt,
            });

        return specialtySchema.parse({
            ...row,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
        });
    }

    async updateByIdAndUnitId(
        specialtyId: string,
        unitId: string,
        data: {
            name?: string;
            isActive?: boolean;
        },
    ): Promise<SpecialtyProfile | null> {
        const [row] = await this.db
            .update(specialties)
            .set({
                ...(typeof data.name !== "undefined" ? { name: data.name } : {}),
                ...(typeof data.isActive !== "undefined" ? { isActive: data.isActive } : {}),
            })
            .where(and(eq(specialties.id, specialtyId), eq(specialties.unitId, unitId)))
            .returning({
                id: specialties.id,
                unitId: specialties.unitId,
                name: specialties.name,
                isActive: specialties.isActive,
                createdAt: specialties.createdAt,
                updatedAt: specialties.updatedAt,
            });

        if (!row) {
            return null;
        }

        return specialtySchema.parse({
            ...row,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
        });
    }
}