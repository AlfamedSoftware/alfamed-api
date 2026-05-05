import { hash } from "bcryptjs";
import { and, eq } from "drizzle-orm";
import type { db as dbType } from "../../db/client.js";
import { accounts } from "../../db/schema/accounts.js";
import { professionalUnitRoles } from "../../db/schema/professional-unit-roles.js";
import { professionalUnits } from "../../db/schema/professional-units.js";
import { professionals } from "../../db/schema/professionals.js";
import { roles } from "../../db/schema/roles.js";
import { units } from "../../db/schema/units.js";
import { users } from "../../db/schema/users.js";
import type { CreateAdminUpmUserInput } from "./admin-upm.schemas.js";

type DatabaseClient = typeof dbType;
type TransactionClient = Parameters<Parameters<DatabaseClient["transaction"]>[0]>[0];

export type AdminUpmUser = {
    professionalId: string;
    userId: string;
    professionalUnitId: string;
    unitId: string;
    unitName: string;
    name: string;
    email: string;
    cpf: string;
    birthdate: string;
    phone: string;
    status: boolean;
    roleKey: string;
    roleDescription: string;
    createdAt: string;
    updatedAt: string;
};

export class AdminUpmRepository {
    constructor(private readonly db: DatabaseClient) {}

    private toDate(value: string) {
        return new Date(`${value}T00:00:00.000Z`);
    }

    private async createUserWithAccount(
        tx: TransactionClient,
        input: CreateAdminUpmUserInput["user"],
    ) {
        const [createdUser] = await tx
            .insert(users)
            .values({
                name: input.name,
                email: input.email,
                cpf: input.cpf,
                birthdate: this.toDate(input.birthdate),
                phone: input.phone,
                isActive: input.status,
            })
            .returning({
                id: users.id,
            });

        await tx.insert(accounts).values({
            userId: createdUser.id,
            accountId: createdUser.id,
            providerId: "credential",
            password: await hash(input.password, 12),
        });

        return createdUser.id;
    }

    private async ensureRoleByKey(tx: TransactionClient, roleKey: string) {
        const [existingRole] = await tx
            .select({
                id: roles.id,
            })
            .from(roles)
            .where(eq(roles.key, roleKey))
            .limit(1);

        if (existingRole) {
            return existingRole.id;
        }

        const [createdRole] = await tx
            .insert(roles)
            .values({
                key: roleKey,
                description: "Permissão interna Alfamed",
                internal: true,
                isActive: true,
            })
            .returning({
                id: roles.id,
            });

        return createdRole.id;
    }

    async hasUnit(unitId: string) {
        const [result] = await this.db
            .select({ id: units.id })
            .from(units)
            .where(eq(units.id, unitId))
            .limit(1);

        return !!result;
    }

    async listUsersByRoleKey(roleKey: string): Promise<AdminUpmUser[]> {
        const rows = await this.db
            .select({
                professional: {
                    id: professionals.id,
                    isActive: professionals.isActive,
                    createdAt: professionals.createdAt,
                    updatedAt: professionals.updatedAt,
                },
                professionalUnit: {
                    id: professionalUnits.id,
                    unitId: professionalUnits.unitId,
                },
                role: {
                    key: roles.key,
                    description: roles.description,
                },
                unit: {
                    name: units.name,
                },
                user: {
                    id: users.id,
                    name: users.name,
                    email: users.email,
                    cpf: users.cpf,
                    birthdate: users.birthdate,
                    phone: users.phone,
                },
            })
            .from(professionalUnitRoles)
            .innerJoin(roles, eq(professionalUnitRoles.roleId, roles.id))
            .innerJoin(professionalUnits, eq(professionalUnitRoles.professionalUnitId, professionalUnits.id))
            .innerJoin(units, eq(professionalUnits.unitId, units.id))
            .innerJoin(professionals, eq(professionalUnits.professionalId, professionals.id))
            .innerJoin(users, eq(professionals.userId, users.id))
            .where(
                and(
                    eq(professionalUnitRoles.isActive, true),
                    eq(roles.isActive, true),
                    eq(roles.key, roleKey),
                ),
            );

        return rows
            .map((row) => ({
                professionalId: row.professional.id,
                userId: row.user.id,
                professionalUnitId: row.professionalUnit.id,
                unitId: row.professionalUnit.unitId,
                unitName: row.unit.name,
                name: row.user.name,
                email: row.user.email,
                cpf: row.user.cpf,
                birthdate: row.user.birthdate.toISOString(),
                phone: row.user.phone,
                status: row.professional.isActive,
                roleKey: row.role.key,
                roleDescription: row.role.description,
                createdAt: row.professional.createdAt.toISOString(),
                updatedAt: row.professional.updatedAt.toISOString(),
            }))
            .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    }

    async createUserWithRoleKey(roleKey: string, data: CreateAdminUpmUserInput): Promise<AdminUpmUser> {
        return this.db.transaction(async (tx) => {
            const roleId = await this.ensureRoleByKey(tx, roleKey);
            const userId = await this.createUserWithAccount(tx, data.user);

            const [createdProfessional] = await tx
                .insert(professionals)
                .values({
                    userId,
                    isActive: data.user.status,
                })
                .returning({
                    id: professionals.id,
                    isActive: professionals.isActive,
                    createdAt: professionals.createdAt,
                    updatedAt: professionals.updatedAt,
                });

            const [createdProfessionalUnit] = await tx
                .insert(professionalUnits)
                .values({
                    professionalId: createdProfessional.id,
                    unitId: data.unitId,
                })
                .returning({
                    id: professionalUnits.id,
                    unitId: professionalUnits.unitId,
                });

            await tx.insert(professionalUnitRoles).values({
                professionalUnitId: createdProfessionalUnit.id,
                roleId,
                isActive: true,
            });

            const [created] = await tx
                .select({
                    role: {
                        key: roles.key,
                        description: roles.description,
                    },
                    unit: {
                        name: units.name,
                    },
                    user: {
                        id: users.id,
                        name: users.name,
                        email: users.email,
                        cpf: users.cpf,
                        birthdate: users.birthdate,
                        phone: users.phone,
                    },
                })
                .from(professionalUnitRoles)
                .innerJoin(roles, eq(professionalUnitRoles.roleId, roles.id))
                .innerJoin(professionalUnits, eq(professionalUnitRoles.professionalUnitId, professionalUnits.id))
                .innerJoin(units, eq(professionalUnits.unitId, units.id))
                .innerJoin(professionals, eq(professionalUnits.professionalId, professionals.id))
                .innerJoin(users, eq(professionals.userId, users.id))
                .where(
                    and(
                        eq(professionalUnitRoles.professionalUnitId, createdProfessionalUnit.id),
                        eq(roles.key, roleKey),
                    ),
                )
                .limit(1);

            if (!created) {
                throw new Error("Unable to create internal user");
            }

            return {
                professionalId: createdProfessional.id,
                userId: created.user.id,
                professionalUnitId: createdProfessionalUnit.id,
                unitId: createdProfessionalUnit.unitId,
                unitName: created.unit.name,
                name: created.user.name,
                email: created.user.email,
                cpf: created.user.cpf,
                birthdate: created.user.birthdate.toISOString(),
                phone: created.user.phone,
                status: createdProfessional.isActive,
                roleKey: created.role.key,
                roleDescription: created.role.description,
                createdAt: createdProfessional.createdAt.toISOString(),
                updatedAt: createdProfessional.updatedAt.toISOString(),
            };
        });
    }
}
