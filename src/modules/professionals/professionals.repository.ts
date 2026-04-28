import { and, eq } from "drizzle-orm";
import type { z } from "zod";
import type { db as dbType } from "../../db/client.js";
import { professionalUnits } from "../../db/schema/professional-units.js";
import { professionals } from "../../db/schema/professionals.js";
import { users } from "../../db/schema/users.js";
import {
    createProfessionalSchema,
    professionalProfileSchema,
    updateProfessionalSchema,
} from "./professionals.schemas.js";

export type ProfessionalProfile = z.infer<typeof professionalProfileSchema>;
export type CreateProfessionalInput = z.infer<typeof createProfessionalSchema> & { userId: string };
export type UpdateProfessionalInput = z.infer<typeof updateProfessionalSchema>;

type DatabaseClient = typeof dbType;

export class ProfessionalsRepository {
    readonly create: (data: CreateProfessionalInput) => Promise<ProfessionalProfile>;
    readonly createWithUnit: (data: CreateProfessionalInput, unitId: string) => Promise<ProfessionalProfile>;
    readonly findById: (professionalId: string) => Promise<ProfessionalProfile | null>;
    readonly findByIdAndUnit: (professionalId: string, unitId: string) => Promise<ProfessionalProfile | null>;
    readonly list: () => Promise<ProfessionalProfile[]>;
    readonly listByUnit: (unitId: string) => Promise<ProfessionalProfile[]>;
    readonly update: (professionalId: string, data: UpdateProfessionalInput) => Promise<ProfessionalProfile | null>;
    readonly delete: (professionalId: string) => Promise<void>;
    readonly listUnitIdsByUserId: (userId: string) => Promise<string[]>;

    constructor(db: DatabaseClient) {
        const toProfile = (result: {
            id: string;
            userId: string;
            name: string | null;
            email: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
        }) =>
            professionalProfileSchema.parse({
                id: result.id,
                userId: result.userId,
                name: result.name ?? undefined,
                email: result.email ?? undefined,
                isActive: result.isActive,
                createdAt: result.createdAt.toISOString(),
                updatedAt: result.updatedAt.toISOString(),
            });

        this.create = async (data) => {
            const [result] = await db
                .insert(professionals)
                .values({
                    userId: data.userId,
                    isActive: data.isActive,
                })
                .returning({
                    id: professionals.id,
                });

            const created = await this.findById(result.id);

            if (!created) {
                throw new Error("Failed to load created professional");
            }

            return created;
        };

        this.findById = async (professionalId) => {
            const [result] = await db
                .select({
                    id: professionals.id,
                    userId: professionals.userId,
                    name: users.name,
                    email: users.email,
                    isActive: professionals.isActive,
                    createdAt: professionals.createdAt,
                    updatedAt: professionals.updatedAt,
                })
                .from(professionals)
                .innerJoin(users, eq(users.id, professionals.userId))
                .where(eq(professionals.id, professionalId))
                .limit(1);

            if (!result) {
                return null;
            }

            return toProfile(result);
        };

        this.list = async () => {
            const rows = await db
                .select({
                    id: professionals.id,
                    userId: professionals.userId,
                    name: users.name,
                    email: users.email,
                    isActive: professionals.isActive,
                    createdAt: professionals.createdAt,
                    updatedAt: professionals.updatedAt,
                })
                .from(professionals)
                .innerJoin(users, eq(users.id, professionals.userId));

            return rows.map(toProfile);
        };

        this.findByIdAndUnit = async (professionalId, unitId) => {
            const [result] = await db
                .select({
                    id: professionals.id,
                    userId: professionals.userId,
                    name: users.name,
                    email: users.email,
                    isActive: professionals.isActive,
                    createdAt: professionals.createdAt,
                    updatedAt: professionals.updatedAt,
                })
                .from(professionals)
                .innerJoin(users, eq(users.id, professionals.userId))
                .innerJoin(professionalUnits, eq(professionals.id, professionalUnits.professionalId))
                .where(and(eq(professionals.id, professionalId), eq(professionalUnits.unitId, unitId)))
                .limit(1);

            if (!result) {
                return null;
            }

            return toProfile(result);
        };

        this.listByUnit = async (unitId) => {
            const results = await db
                .select({
                    id: professionals.id,
                    userId: professionals.userId,
                    name: users.name,
                    email: users.email,
                    isActive: professionals.isActive,
                    createdAt: professionals.createdAt,
                    updatedAt: professionals.updatedAt,
                })
                .from(professionals)
                .innerJoin(users, eq(users.id, professionals.userId))
                .innerJoin(professionalUnits, eq(professionals.id, professionalUnits.professionalId))
                .where(eq(professionalUnits.unitId, unitId));

            return results.map(toProfile);
        };

        this.createWithUnit = async (data, unitId) => {
            const createdProfessional = await db.transaction(async (tx) => {
                const [result] = await tx
                    .insert(professionals)
                    .values({
                        userId: data.userId,
                        isActive: data.isActive,
                    })
                    .returning({
                        id: professionals.id,
                        userId: professionals.userId,
                        isActive: professionals.isActive,
                        createdAt: professionals.createdAt,
                        updatedAt: professionals.updatedAt,
                    });

                await tx.insert(professionalUnits).values({
                    professionalId: result.id,
                    unitId,
                });

                return result;
            });

            const created = await this.findById(createdProfessional.id);

            if (!created) {
                throw new Error("Failed to load created professional");
            }

            return created;
        };

        this.update = async (professionalId, data) => {
            const [result] = await db
                .update(professionals)
                .set({
                    userId: data.userId,
                    isActive: data.isActive,
                })
                .where(eq(professionals.id, professionalId))
                .returning({
                    id: professionals.id,
                });

            if (!result) {
                return null;
            }

            return this.findById(result.id);
        };

        this.delete = async (professionalId) => {
            await db.delete(professionals).where(eq(professionals.id, professionalId));
        };

        this.listUnitIdsByUserId = async (userId) => {
            const results = await db
                .select({ unitId: professionalUnits.unitId })
                .from(professionals)
                .innerJoin(professionalUnits, eq(professionals.id, professionalUnits.professionalId))
                .where(eq(professionals.userId, userId));

            return [...new Set(results.map((row) => row.unitId))];
        };
    }
}
