import { hash } from "bcryptjs";
import { and, eq } from "drizzle-orm";
import type { db as dbType } from "../../db/client.js";
import { accounts } from "../../db/schema/accounts.js";
import { professionalUnitRoles } from "../../db/schema/professional-unit-roles.js";
import { professionalUnitSpecialties } from "../../db/schema/professional-unit-specialties.js";
import { professionalUnits } from "../../db/schema/professional-units.js";
import { professionals } from "../../db/schema/professionals.js";
import { roles } from "../../db/schema/roles.js";
import { units } from "../../db/schema/units.js";
import { users } from "../../db/schema/users.js";
import type {
    CreateAdminProfessionalInput,
    CreateAdminUnitInput,
    UpdateAdminUnitInput,
} from "./admin-units.schemas.js";

type DatabaseClient = typeof dbType;
type TransactionClient = Parameters<Parameters<DatabaseClient["transaction"]>[0]>[0];

const ADMINISTRATIVE_ROLE_KEY = "administrative";

export type AdminUnit = {
    id: string;
    name: string;
    cnpj: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    phone: string | null;
    email: string | null;
    ownerUserId: string | null;
    owner: {
        id: string;
        name: string;
        email: string;
        cpf: string;
        birthdate: string;
        phone: string;
        isActive: boolean;
    } | null;
    professionalsCount: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
};

export type AdminProfessional = {
    id: string;
    userId: string;
    unitId: string;
    name: string;
    email: string;
    cpf: string;
    birthdate: string;
    phone: string;
    crm: string | null;
    specialtyIds: string[];
    status: boolean;
    createdAt: string;
    updatedAt: string;
};

export class AdminUnitsRepository {
    constructor(private readonly db: DatabaseClient) { }

    private toDate(value: string) {
        return new Date(`${value}T00:00:00.000Z`);
    }

    private async createUserWithAccount(
        tx: TransactionClient,
        input: {
            name: string;
            email: string;
            cpf: string;
            birthdate: string;
            phone: string;
            password: string;
            status?: boolean;
        },
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

    private async mapUnit(row: {
        unit: {
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
        };
        owner: {
            id: string;
            name: string;
            email: string;
            cpf: string;
            birthdate: Date;
            phone: string;
            isActive: boolean;
        } | null;
    },
        executor: DatabaseClient | TransactionClient = this.db,
    ): Promise<AdminUnit> {
        const rows = await executor
            .select({
                professionalId: professionalUnits.professionalId,
            })
            .from(professionalUnits)
            .where(eq(professionalUnits.unitId, row.unit.id));

        return {
            id: row.unit.id,
            name: row.unit.name,
            cnpj: row.unit.cnpj,
            address: row.unit.address,
            city: row.unit.city,
            state: row.unit.state,
            phone: row.unit.phone,
            email: row.unit.email,
            ownerUserId: row.unit.ownerUserId,
            owner: row.owner?.id && row.owner.birthdate
                ? {
                    id: row.owner.id,
                    name: row.owner.name,
                    email: row.owner.email,
                    cpf: row.owner.cpf,
                    birthdate: row.owner.birthdate.toISOString(),
                    phone: row.owner.phone,
                    isActive: row.owner.isActive,
                }
                : null,
            professionalsCount: rows.length,
            isActive: row.unit.isActive,
            createdAt: row.unit.createdAt.toISOString(),
            updatedAt: row.unit.updatedAt.toISOString(),
        };
    }

    async listUnits() {
        const rows = await this.db
            .select({
                unit: {
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
                },
                owner: {
                    id: users.id,
                    name: users.name,
                    email: users.email,
                    cpf: users.cpf,
                    birthdate: users.birthdate,
                    phone: users.phone,
                    isActive: users.isActive,
                },
            })
            .from(units)
            .leftJoin(users, eq(units.ownerUserId, users.id));

        return Promise.all(rows.map((row) => this.mapUnit(row)));
    }

    async findUnitById(unitId: string) {
        return this.findUnitByIdWithExecutor(this.db, unitId);
    }

    private async findUnitByIdWithExecutor(executor: DatabaseClient | TransactionClient, unitId: string) {
        const [row] = await executor
            .select({
                unit: {
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
                },
                owner: {
                    id: users.id,
                    name: users.name,
                    email: users.email,
                    cpf: users.cpf,
                    birthdate: users.birthdate,
                    phone: users.phone,
                    isActive: users.isActive,
                },
            })
            .from(units)
            .leftJoin(users, eq(units.ownerUserId, users.id))
            .where(eq(units.id, unitId))
            .limit(1);

        if (!row) {
            return null;
        }

        return this.mapUnit(row, executor);
    }

    async createUnit(data: CreateAdminUnitInput) {
        return this.db.transaction(async (tx) => {
            const ownerUserId = await this.createUserWithAccount(tx, data.owner);

            const [ownerProfessional] = await tx
                .insert(professionals)
                .values({
                    userId: ownerUserId,
                    isActive: data.owner.status,
                })
                .returning({
                    id: professionals.id,
                });

            const [createdUnit] = await tx
                .insert(units)
                .values({
                    name: data.name,
                    cnpj: data.cnpj,
                    address: data.address,
                    city: data.city,
                    state: data.state.toUpperCase(),
                    phone: data.phone,
                    email: data.email,
                    ownerUserId,
                    isActive: data.isActive,
                })
                .returning({
                    id: units.id,
                });

            const [createdProfessionalUnit] = await tx
                .insert(professionalUnits)
                .values({
                    professionalId: ownerProfessional.id,
                    unitId: createdUnit.id,
                })
                .returning({
                    id: professionalUnits.id,
                });

            const [administrativeRole] = await tx
                .select({
                    id: roles.id,
                })
                .from(roles)
                .where(eq(roles.key, ADMINISTRATIVE_ROLE_KEY))
                .limit(1);

            if (!administrativeRole) {
                throw new Error("Administrative role not found");
            }

            await tx.insert(professionalUnitRoles).values({
                professionalUnitId: createdProfessionalUnit.id,
                roleId: administrativeRole.id,
                isActive: true,
            });

            const created = await this.findUnitByIdWithExecutor(tx, createdUnit.id);

            if (!created) {
                throw new Error("Unable to create unit");
            }

            return created;
        });
    }

    async updateUnit(unitId: string, data: UpdateAdminUnitInput) {
        const [updated] = await this.db
            .update(units)
            .set({
                name: data.name,
                cnpj: data.cnpj,
                address: data.address,
                city: data.city,
                state: data.state?.toUpperCase(),
                phone: data.phone,
                email: data.email,
                ownerUserId: data.ownerUserId,
                isActive: data.isActive,
            })
            .where(eq(units.id, unitId))
            .returning({ id: units.id });

        if (!updated) {
            return null;
        }

        return this.findUnitById(updated.id);
    }

    async countProfessionalsByUnit(unitId: string) {
        const rows = await this.db
            .select({
                professionalId: professionalUnits.professionalId,
            })
            .from(professionalUnits)
            .where(eq(professionalUnits.unitId, unitId));

        return rows.length;
    }

    async deleteUnit(unitId: string) {
        await this.db.delete(units).where(eq(units.id, unitId));
    }

    private async listUnitProfessionalsWithExecutor(unitId: string, executor: DatabaseClient | TransactionClient = this.db) {
        const rows = await executor
            .select({
                professionalUnit: {
                    id: professionalUnits.id,
                },
                professional: {
                    id: professionals.id,
                    userId: professionals.userId,
                    crm: professionals.crm,
                    isActive: professionals.isActive,
                    createdAt: professionals.createdAt,
                    updatedAt: professionals.updatedAt,
                },
                user: {
                    name: users.name,
                    email: users.email,
                    cpf: users.cpf,
                    birthdate: users.birthdate,
                    phone: users.phone,
                },
            })
            .from(professionals)
            .innerJoin(professionalUnits, eq(professionals.id, professionalUnits.professionalId))
            .innerJoin(users, eq(professionals.userId, users.id))
            .where(eq(professionalUnits.unitId, unitId));

        const mapped = await Promise.all(
            rows.map(async (row) => {
                const specialtiesRows = await executor
                    .select({ specialtyId: professionalUnitSpecialties.specialtyId })
                    .from(professionalUnitSpecialties)
                    .where(eq(professionalUnitSpecialties.professionalUnitId, row.professionalUnit.id));

                return {
                    id: row.professional.id,
                    userId: row.professional.userId,
                    unitId,
                    name: row.user.name,
                    email: row.user.email,
                    cpf: row.user.cpf,
                    birthdate: row.user.birthdate.toISOString(),
                    phone: row.user.phone,
                    crm: row.professional.crm,
                    specialtyIds: specialtiesRows.map((specialty) => specialty.specialtyId),
                    status: row.professional.isActive,
                    createdAt: row.professional.createdAt.toISOString(),
                    updatedAt: row.professional.updatedAt.toISOString(),
                } satisfies AdminProfessional;
            }),
        );

        return mapped;
    }

    async listUnitProfessionals(unitId: string) {
        return this.listUnitProfessionalsWithExecutor(unitId, this.db);
    }

    async createUnitProfessional(unitId: string, data: CreateAdminProfessionalInput) {
        return this.db.transaction(async (tx) => {
            const userId = await this.createUserWithAccount(tx, data.user);

            const [createdProfessional] = await tx
                .insert(professionals)
                .values({
                    userId,
                    crm: data.crm,
                    isActive: data.user.status,
                })
                .returning({ id: professionals.id });

            const [createdProfessionalUnit] = await tx
                .insert(professionalUnits)
                .values({
                    professionalId: createdProfessional.id,
                    unitId,
                })
                .returning({ id: professionalUnits.id });

            if (!createdProfessionalUnit) {
                throw new Error("Unable to create professional unit");
            }

            if (data.specialtyIds?.length) {
                await tx.insert(professionalUnitSpecialties).values(
                    data.specialtyIds.map((specialtyId) => ({
                        professionalUnitId: createdProfessionalUnit.id,
                        specialtyId,
                    })),
                );
            }

            const [created] = await this.listUnitProfessionalsWithExecutor(unitId, tx).then((list) =>
                list.filter((item) => item.id === createdProfessional.id),
            );

            if (!created) {
                throw new Error("Unable to create professional");
            }

            return created;
        });
    }

    async hasProfessionalLinkedToUnit(unitId: string) {
        const [result] = await this.db
            .select({ id: professionalUnits.id })
            .from(professionalUnits)
            .where(eq(professionalUnits.unitId, unitId))
            .limit(1);

        return !!result;
    }

    async hasUnit(unitId: string) {
        const [result] = await this.db
            .select({ id: units.id })
            .from(units)
            .where(eq(units.id, unitId))
            .limit(1);

        return !!result;
    }
}
