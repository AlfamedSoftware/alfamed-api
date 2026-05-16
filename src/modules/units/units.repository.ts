import { and, eq } from "drizzle-orm";
import type { z } from "zod";
import type { db as dbType } from "../../db/client.js";
import { units } from "../../db/schema/units.js";
import { professionals } from "../../db/schema/professionals.js";
import { professionalUnits } from "../../db/schema/professional-units.js";
import { users } from "../../db/schema/users.js";
import { DomainError } from "../../http/plugins/domain-error.js";
import {
    createUnitSchema,
    unitProfileSchema,
    updateUnitSchema,
} from "./units.schemas.js";

export type UnitProfile = z.infer<typeof unitProfileSchema>;
export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;

type DatabaseClient = typeof dbType;

export class UnitsRepository {
    readonly create: (data: CreateUnitInput) => Promise<UnitProfile>;
    readonly createForUser: (userId: string, data: CreateUnitInput) => Promise<UnitProfile>;
    readonly findById: (unitId: string) => Promise<UnitProfile | null>;
    readonly listByUserId: (userId: string) => Promise<UnitProfile[]>;
    readonly update: (unitId: string, data: UpdateUnitInput) => Promise<UnitProfile | null>;
    readonly delete: (unitId: string) => Promise<void>;

    constructor(db: DatabaseClient) {
        const toProfile = (result: {
            id: string;
            name: string;
            cnpj: string | null;
            address: string | null;
            city: string | null;
            state: string | null;
            phone: string | null;
            email: string | null;
            ownerUserId: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
        }) =>
            unitProfileSchema.parse({
                id: result.id,
                name: result.name,
                cnpj: result.cnpj,
                address: result.address,
                city: result.city,
                state: result.state,
                phone: result.phone,
                email: result.email,
                ownerUserId: result.ownerUserId,
                isActive: result.isActive,
                createdAt: result.createdAt.toISOString(),
                updatedAt: result.updatedAt.toISOString(),
            });

        this.create = async (data) => {
            const [result] = await db
                .insert(units)
                .values({
                    name: data.name,
                    cnpj: data.cnpj,
                    address: data.address,
                    city: data.city,
                    state: data.state,
                    phone: data.phone,
                    email: data.email,
                    ownerUserId: data.ownerUserId,
                    isActive: data.isActive,
                })
                .returning({
                    id: units.id,
                    name: units.name,
                    cnpj: units.cnpj,
                    address: units.address,
                    city: units.city,
                    state: units.state,
                    phone: units.phone,
                    email: units.email,
                    ownerUserId: units.ownerUserId,
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
                    throw new DomainError("FORBIDDEN", "Forbidden");
                }

                const [createdUnit] = await tx
                    .insert(units)
                    .values({
                        name: data.name,
                        cnpj: data.cnpj,
                        address: data.address,
                        city: data.city,
                        state: data.state,
                        phone: data.phone,
                        email: data.email,
                        ownerUserId: data.ownerUserId,
                        isActive: data.isActive,
                    })
                    .returning({
                        id: units.id,
                        name: units.name,
                        cnpj: units.cnpj,
                        address: units.address,
                        city: units.city,
                        state: units.state,
                        phone: units.phone,
                        email: units.email,
                        ownerUserId: units.ownerUserId,
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
                    cnpj: units.cnpj,
                    address: units.address,
                    city: units.city,
                    state: units.state,
                    phone: units.phone,
                    email: units.email,
                    ownerUserId: units.ownerUserId,
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

        this.listByUserId = async (userId) => {
            const results = await db
                .select({
                    id: units.id,
                    name: units.name,
                    cnpj: units.cnpj,
                    address: units.address,
                    city: units.city,
                    state: units.state,
                    phone: units.phone,
                    email: units.email,
                    ownerUserId: units.ownerUserId,
                    isActive: units.isActive,
                    createdAt: units.createdAt,
                    updatedAt: units.updatedAt,
                })
                .from(professionals)
                .innerJoin(professionalUnits, eq(professionals.id, professionalUnits.professionalId))
                .innerJoin(users, eq(users.id, professionals.userId))
                .innerJoin(units, eq(units.id, professionalUnits.unitId))
                .where(
                    and(
                        eq(users.id, userId),
                        eq(users.isActive, true),
                        eq(professionals.isActive, true),
                        eq(professionalUnits.isActive, true),
                        eq(units.isActive, true),
                    ),
                );

            return results.map((result) =>
                toProfile({
                    id: result.id,
                    name: result.name,
                    cnpj: result.cnpj,
                    address: result.address,
                    city: result.city,
                    state: result.state,
                    phone: result.phone,
                    email: result.email,
                    ownerUserId: result.ownerUserId,
                    isActive: result.isActive,
                    createdAt: result.createdAt,
                    updatedAt: result.updatedAt,
                }),
            );
        };

        this.update = async (unitId, data) => {
            const [result] = await db
                .update(units)
                .set({
                    name: data.name,
                    cnpj: data.cnpj,
                    address: data.address,
                    city: data.city,
                    state: data.state,
                    phone: data.phone,
                    email: data.email,
                    ownerUserId: data.ownerUserId,
                    isActive: data.isActive,
                })
                .where(eq(units.id, unitId))
                .returning({
                    id: units.id,
                    name: units.name,
                    cnpj: units.cnpj,
                    address: units.address,
                    city: units.city,
                    state: units.state,
                    phone: units.phone,
                    email: units.email,
                    ownerUserId: units.ownerUserId,
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
