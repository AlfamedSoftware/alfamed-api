import { and, eq } from "drizzle-orm";
import type { z } from "zod";
import type { db as dbType } from "../../db/client.js";
import { professionalUnitRoles } from "../../db/schema/professional-unit-roles.js";
import { professionalUnits } from "../../db/schema/professional-units.js";
import { professionals } from "../../db/schema/professionals.js";
import { roles } from "../../db/schema/roles.js";
import { units } from "../../db/schema/units.js";
import { users } from "../../db/schema/users.js";
import {
    createProfessionalSchema,
    linkProfessionalUnitRoleSchema,
    professionalProfileSchema,
    professionalRoleProfileSchema,
    professionalUnitRoleProfileSchema,
    updateProfessionalUnitRoleSchema,
    updateProfessionalSchema,
} from "./professionals.schemas.js";

export type ProfessionalProfile = z.infer<typeof professionalProfileSchema>;
export type ProfessionalRoleProfile = z.infer<typeof professionalRoleProfileSchema>;
export type ProfessionalUnitRoleProfile = z.infer<typeof professionalUnitRoleProfileSchema>;
export type CreateProfessionalInput = z.infer<typeof createProfessionalSchema> & { userId: string };
export type UpdateProfessionalInput = z.infer<typeof updateProfessionalSchema>;
export type LinkProfessionalUnitRoleInput = z.infer<typeof linkProfessionalUnitRoleSchema>;
export type UpdateProfessionalUnitRoleInput = z.infer<typeof updateProfessionalUnitRoleSchema>;

type DatabaseClient = typeof dbType;

export class ProfessionalsRepository {
    readonly create: (data: CreateProfessionalInput) => Promise<ProfessionalProfile>;
    readonly createWithUnit: (data: CreateProfessionalInput, unitId: string) => Promise<{ professional: ProfessionalProfile; professionalUnitId: string }>;
    readonly findById: (professionalId: string) => Promise<ProfessionalProfile | null>;
    readonly findDetailById: (professionalId: string) => Promise<any | null>;
    readonly findByIdAndUnit: (professionalId: string, unitId: string) => Promise<ProfessionalProfile | null>;
    readonly list: () => Promise<ProfessionalProfile[]>;
    readonly listByUnit: (unitId: string) => Promise<ProfessionalProfile[]>;
    readonly update: (professionalId: string, data: UpdateProfessionalInput) => Promise<ProfessionalProfile | null>;
    readonly delete: (professionalId: string) => Promise<void>;
    readonly listUnitIdsByUserId: (userId: string) => Promise<string[]>;
    readonly listActiveRolesByProfessionalUnit: (
        userId: string,
        unitId: string,
        professionalUnitId: string,
    ) => Promise<ProfessionalRoleProfile[]>;
    readonly findProfessionalUnitByIdAndUnit: (
        professionalUnitId: string,
        unitId: string,
    ) => Promise<{ id: string } | null>;
    readonly hasActiveRole: (roleId: string) => Promise<boolean>;
    readonly findProfessionalUnitRoleByIdAndUnit: (
        professionalUnitRoleId: string,
        unitId: string,
    ) => Promise<ProfessionalUnitRoleProfile | null>;
    readonly linkProfessionalUnitRole: (
        data: LinkProfessionalUnitRoleInput,
    ) => Promise<ProfessionalUnitRoleProfile>;
    readonly updateProfessionalUnitRole: (
        professionalUnitRoleId: string,
        data: Omit<UpdateProfessionalUnitRoleInput, "professionalUnitRoleId">,
    ) => Promise<ProfessionalUnitRoleProfile | null>;

    constructor(db: DatabaseClient) {
        const toProfile = (result: {
            id: string;
            userId: string;
            name: string | null;
            email: string | null;
            crm: string | null;
            phone: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
        }) =>
            professionalProfileSchema.parse({
                id: result.id,
                userId: result.userId,
                name: result.name ?? undefined,
                email: result.email ?? undefined,
                crm: result.crm ?? undefined,
                phone: result.phone ?? undefined,
                isActive: result.isActive,
                createdAt: result.createdAt.toISOString(),
                updatedAt: result.updatedAt.toISOString(),
            });

        const toRoleProfile = (result: {
            id: string;
            description: string;
            key: string;
        }) =>
            professionalRoleProfileSchema.parse({
                id: result.id,
                description: result.description,
                key: result.key,
            });

        const toProfessionalUnitRoleProfile = (result: {
            id: string;
            professionalUnitId: string;
            roleId: string;
            isActive: boolean;
            roleDescription: string;
            roleKey: string;
            createdAt: Date;
            updatedAt: Date;
        }) =>
            professionalUnitRoleProfileSchema.parse({
                id: result.id,
                professionalUnitId: result.professionalUnitId,
                roleId: result.roleId,
                isActive: result.isActive,
                role: {
                    id: result.roleId,
                    description: result.roleDescription,
                    key: result.roleKey,
                },
                createdAt: result.createdAt.toISOString(),
                updatedAt: result.updatedAt.toISOString(),
            });

        const findProfessionalUnitRoleById = async (professionalUnitRoleId: string) => {
            const [result] = await db
                .select({
                    id: professionalUnitRoles.id,
                    professionalUnitId: professionalUnitRoles.professionalUnitId,
                    roleId: professionalUnitRoles.roleId,
                    isActive: professionalUnitRoles.isActive,
                    roleDescription: roles.description,
                    roleKey: roles.key,
                    createdAt: professionalUnitRoles.createdAt,
                    updatedAt: professionalUnitRoles.updatedAt,
                })
                .from(professionalUnitRoles)
                .innerJoin(roles, eq(professionalUnitRoles.roleId, roles.id))
                .where(eq(professionalUnitRoles.id, professionalUnitRoleId))
                .limit(1);

            if (!result) {
                return null;
            }

            return toProfessionalUnitRoleProfile(result);
        };

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
                    crm: professionals.crm,
                    phone: users.phone,
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
                    crm: professionals.crm,
                    phone: users.phone,
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
                    crm: professionals.crm,
                    phone: users.phone,
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
                    crm: professionals.crm,
                    phone: users.phone,
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

        // Returns professional profile with an array `users` that contains
        // user objects responsible for the professional. For now we include
        // the primary linked user as the responsible user to keep the shape
        // consistent with front-end expectations.
        this.findDetailById = async (professionalId) => {
            const base = await this.findById(professionalId);

            if (!base) return null;

            const [userRow] = await db
                .select({
                    id: users.id,
                    name: users.name,
                    email: users.email,
                    phone: users.phone,
                    cpf: users.cpf,
                    birthdate: users.birthdate,
                })
                .from(users)
                .where(eq(users.id, base.userId))
                .limit(1);

            const [unitRow] = await db
                .select({
                    id: units.id,
                    name: units.name,
                })
                .from(professionalUnits)
                .innerJoin(units, eq(units.id, professionalUnits.unitId))
                .where(eq(professionalUnits.professionalId, professionalId))
                .limit(1);

            const detail = {
                ...base,
                cpf: userRow?.cpf ?? undefined,
                birthdate: userRow?.birthdate ? userRow.birthdate.toISOString() : undefined,
                unit: unitRow ?? null,
                users: userRow
                    ? [
                        {
                            id: userRow.id,
                            name: userRow.name,
                            email: userRow.email,
                            phone: userRow.phone ?? undefined,
                            cpf: userRow.cpf,
                            birthdate: userRow.birthdate.toISOString(),
                        },
                    ]
                    : [],
            };

            return detail;
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

                const [createdProfessionalUnit] = await tx
                    .insert(professionalUnits)
                    .values({
                        professionalId: result.id,
                        unitId,
                    })
                    .returning({ id: professionalUnits.id });

                return {
                    professional: result,
                    professionalUnitId: createdProfessionalUnit?.id,
                };
            });

            const created = await this.findById(createdProfessional.professional.id);

            if (!created) {
                throw new Error("Failed to load created professional");
            }

            return { professional: created, professionalUnitId: createdProfessional.professionalUnitId };
        };

        this.update = async (professionalId, data) => {
            const updated = await db.transaction(async (tx) => {
                const [current] = await tx
                    .select({ userId: professionals.userId })
                    .from(professionals)
                    .where(eq(professionals.id, professionalId))
                    .limit(1);

                const targetUserId = data.userId ?? current?.userId;

                if (
                    targetUserId &&
                    (data.name !== undefined || data.email !== undefined || data.phone !== undefined || data.cpf !== undefined || data.birthdate !== undefined)
                ) {
                    const userUpdate: any = {};
                    if (data.name !== undefined) userUpdate.name = data.name;
                    if (data.email !== undefined) userUpdate.email = data.email;
                    if (data.phone !== undefined) userUpdate.phone = data.phone;
                    if (data.cpf !== undefined) userUpdate.cpf = data.cpf;
                    if (data.birthdate !== undefined) userUpdate.birthdate = new Date(data.birthdate);

                    await tx.update(users).set(userUpdate).where(eq(users.id, targetUserId));
                }

                const [res] = await tx
                    .update(professionals)
                    .set({
                        userId: data.userId,
                        isActive: data.isActive,
                        crm: data.crm,
                    })
                    .where(eq(professionals.id, professionalId))
                    .returning({ id: professionals.id });

                return res;
            });

            if (!updated) return null;

            return this.findById(updated.id);
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

        this.listActiveRolesByProfessionalUnit = async (userId, unitId, professionalUnitId) => {
            const rows = await db
                .select({
                    id: roles.id,
                    description: roles.description,
                    key: roles.key,
                })
                .from(professionalUnitRoles)
                .innerJoin(roles, eq(professionalUnitRoles.roleId, roles.id))
                .innerJoin(professionalUnits, eq(professionalUnitRoles.professionalUnitId, professionalUnits.id))
                .innerJoin(professionals, eq(professionalUnits.professionalId, professionals.id))
                .innerJoin(units, eq(professionalUnits.unitId, units.id))
                .where(
                    and(
                        eq(professionals.userId, userId),
                        eq(professionalUnits.unitId, unitId),
                        eq(professionalUnits.id, professionalUnitId),
                        eq(professionals.isActive, true),
                        eq(units.isActive, true),
                        eq(professionalUnitRoles.isActive, true),
                        eq(roles.isActive, true),
                    ),
                );

            return rows.map(toRoleProfile);
        };

        this.findProfessionalUnitByIdAndUnit = async (professionalUnitId, unitId) => {
            const [result] = await db
                .select({ id: professionalUnits.id })
                .from(professionalUnits)
                .where(and(eq(professionalUnits.id, professionalUnitId), eq(professionalUnits.unitId, unitId)))
                .limit(1);

            return result ?? null;
        };

        this.hasActiveRole = async (roleId) => {
            const [result] = await db
                .select({ id: roles.id })
                .from(roles)
                .where(and(eq(roles.id, roleId), eq(roles.isActive, true)))
                .limit(1);

            return !!result;
        };

        this.findProfessionalUnitRoleByIdAndUnit = async (professionalUnitRoleId, unitId) => {
            const [result] = await db
                .select({
                    id: professionalUnitRoles.id,
                    professionalUnitId: professionalUnitRoles.professionalUnitId,
                    roleId: professionalUnitRoles.roleId,
                    isActive: professionalUnitRoles.isActive,
                    roleDescription: roles.description,
                    roleKey: roles.key,
                    createdAt: professionalUnitRoles.createdAt,
                    updatedAt: professionalUnitRoles.updatedAt,
                })
                .from(professionalUnitRoles)
                .innerJoin(roles, eq(professionalUnitRoles.roleId, roles.id))
                .innerJoin(professionalUnits, eq(professionalUnitRoles.professionalUnitId, professionalUnits.id))
                .where(
                    and(
                        eq(professionalUnitRoles.id, professionalUnitRoleId),
                        eq(professionalUnits.unitId, unitId),
                    ),
                )
                .limit(1);

            if (!result) {
                return null;
            }

            return toProfessionalUnitRoleProfile(result);
        };

        this.linkProfessionalUnitRole = async (data) => {
            const [linked] = await db
                .insert(professionalUnitRoles)
                .values({
                    professionalUnitId: data.professionalUnitId,
                    roleId: data.roleId,
                    isActive: data.isActive ?? true,
                })
                .onConflictDoUpdate({
                    target: [professionalUnitRoles.professionalUnitId, professionalUnitRoles.roleId],
                    set: {
                        isActive: data.isActive ?? true,
                    },
                })
                .returning({ id: professionalUnitRoles.id });

            const result = await findProfessionalUnitRoleById(linked.id);

            if (!result) {
                throw new Error("Failed to load linked professional unit role");
            }

            return result;
        };

        this.updateProfessionalUnitRole = async (professionalUnitRoleId, data) => {
            const [updated] = await db
                .update(professionalUnitRoles)
                .set({
                    roleId: data.roleId,
                    isActive: data.isActive,
                })
                .where(eq(professionalUnitRoles.id, professionalUnitRoleId))
                .returning({ id: professionalUnitRoles.id });

            if (!updated) {
                return null;
            }

            return findProfessionalUnitRoleById(updated.id);
        };
    }
}
