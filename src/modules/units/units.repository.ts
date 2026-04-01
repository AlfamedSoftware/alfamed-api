import { eq } from "drizzle-orm";
import type { z } from "zod";
import type { db as dbType } from "@/db/client";
import { units } from "@/db/schema/units";
import { professionals } from "@/db/schema/professionals";
import { professionalUnits } from "@/db/schema/professional-units";
import {
    createUnitSchema,
    unitProfileSchema,
    updateUnitSchema,
} from "./units.schemas";

export type UnitProfile = z.infer<typeof unitProfileSchema>;
export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;

type DatabaseClient = typeof dbType;

export class UnitsRepository {
    readonly create: (data: CreateUnitInput) => Promise<UnitProfile>;
    readonly createForUser: (userId: string, data: CreateUnitInput) => Promise<UnitProfile>;
    readonly findById: (unitId: string) => Promise<UnitProfile | null>;
    readonly update: (unitId: string, data: UpdateUnitInput) => Promise<UnitProfile | null>;
    readonly delete: (unitId: string) => Promise<void>;

    constructor(db: DatabaseClient) {
        const toProfile = (result: {
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
        }) =>
            unitProfileSchema.parse({
                id: result.id,
                name: result.name,
                isActive: result.isActive,
                createdAt: result.createdAt.toISOString(),
                updatedAt: result.updatedAt.toISOString(),
            });

        this.create = async (data) => {
            const [result] = await db
                .insert(units)
                .values({
                    name: data.name,
                    isActive: data.isActive,
                })
                .returning({
                    id: units.id,
                    name: units.name,
                    isActive: units.isActive,
                    createdAt: units.createdAt,
                    updatedAt: units.updatedAt,
                });

            return toProfile(result);
        };

        this.createForUser = async (userId, data) => {
            const unit = await db.transaction(async (tx) => {
                const [professional] = await tx
                    .select({ id: professionals.id })
                    .from(professionals)
                    .where(eq(professionals.userId, userId))
                    .limit(1);

                if (!professional) {
                    throw new Error("Forbidden");
                }

                const [createdUnit] = await tx
                    .insert(units)
                    .values({
                        name: data.name,
                        isActive: data.isActive,
                    })
                    .returning({
                        id: units.id,
                        name: units.name,
                        isActive: units.isActive,
                        createdAt: units.createdAt,
                        updatedAt: units.updatedAt,
                    });

                await tx.insert(professionalUnits).values({
                    professionalId: professional.id,
                    unitId: createdUnit.id,
                });

                return createdUnit;
            });

            return toProfile(unit);
        };

        this.findById = async (unitId) => {
            const [result] = await db
                .select({
                    id: units.id,
                    name: units.name,
                    isActive: units.isActive,
                    createdAt: units.createdAt,
                    updatedAt: units.updatedAt,
                })
                .from(units)
                .where(eq(units.id, unitId))
                .limit(1);

            if (!result) {
                return null;
            }

            return toProfile(result);
        };

        this.update = async (unitId, data) => {
            const [result] = await db
                .update(units)
                .set({
                    name: data.name,
                    isActive: data.isActive,
                })
                .where(eq(units.id, unitId))
                .returning({
                    id: units.id,
                    name: units.name,
                    isActive: units.isActive,
                    createdAt: units.createdAt,
                    updatedAt: units.updatedAt,
                });

            if (!result) {
                return null;
            }

            return toProfile(result);
        };

        this.delete = async (unitId) => {
            await db.delete(units).where(eq(units.id, unitId));
        };
    }
}
