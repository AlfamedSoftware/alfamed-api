import { and, asc, eq } from "drizzle-orm";
import type { z } from "zod";
import type { db as dbType } from "../../db/client.js";
import { accounts } from "../../db/schema/accounts.js";
import { patients } from "../../db/schema/patients.js";
import { professionalUnitRoles } from "../../db/schema/professional-unit-roles.js";
import { professionalUnits } from "../../db/schema/professional-units.js";
import { professionals } from "../../db/schema/professionals.js";
import { roles } from "../../db/schema/roles.js";
import { users } from "../../db/schema/users.js";
import {
    createProfessionalUnitSchema,
    professionalUnitFullDataByUnitListSchema,
    professionalUnitFullDataByUnitSchema,
    professionalUnitFullDataSchema,
    professionalUnitProfileSchema,
} from "./professional-units.schemas.js";

export type CreateProfessionalUnitInput = z.infer<typeof createProfessionalUnitSchema>;
export type ProfessionalUnitProfile = z.infer<typeof professionalUnitProfileSchema>;
export type ProfessionalUnitFullData = z.infer<typeof professionalUnitFullDataSchema>;
export type ProfessionalUnitFullDataByUnit = z.infer<typeof professionalUnitFullDataByUnitSchema>;

export type ProfileUpdateChanges = {
    userChanges: {
        name?: string;
        socialName?: string | null;
        email?: string;
        phone?: string;
        cpf?: string;
        birthdate?: Date;
        sex?: "M" | "F" | "O" | null;
    };
    professionalChanges: {
        crm?: string;
    };
};

export type FullUpdateChanges = ProfileUpdateChanges & {
    professionalUnitChanges: {
        isActive?: boolean;
    };
    professionalUnitRoleChanges: {
        roleId?: string;
    };
    patientChanges: {
        isActive?: boolean;
    };
};

type DatabaseClient = typeof dbType;

export class ProfessionalUnitsRepository {
    readonly create: (data: CreateProfessionalUnitInput) => Promise<ProfessionalUnitProfile>;
    readonly findByIdAndUnit: (
        professionalUnitId: string,
        unitId: string,
    ) => Promise<ProfessionalUnitProfile | null>;
    readonly findFullDataByIdAndUnit: (
        professionalUnitId: string,
        unitId: string,
    ) => Promise<ProfessionalUnitFullData | null>;
    readonly listFullDataByUnit: (unitId: string) => Promise<ProfessionalUnitFullDataByUnit[]>;
    readonly findByProfessionalIdAndUnitId: (
        professionalId: string,
        unitId: string,
    ) => Promise<ProfessionalUnitProfile | null>;
    readonly findUserByEmail: (email: string) => Promise<{ id: string } | null>;
    readonly findUserByCpf: (cpf: string) => Promise<{ id: string } | null>;
    readonly roleExists: (roleId: string) => Promise<boolean>;
    readonly findProfileUpdateTarget: (
        unitId: string,
        userId: string,
        professionalId: string,
    ) => Promise<{
        professionalUnitId: string;
        user: {
            id: string;
            name: string;
            socialName: string | null;
            email: string;
            phone: string;
            cpf: string;
            birthdate: Date;
            sex: string | null;
        };
        professional: {
            id: string;
            crm: string | null;
        };
    } | null>;
    readonly findFullUpdateTarget: (
        unitId: string,
        data: {
            userId: string;
            professionalId: string;
            professionalUnitId: string;
            professionalUnitRoleId: string;
            patientId: string;
        },
    ) => Promise<{
        user: {
            id: string;
            name: string;
            socialName: string | null;
            email: string;
            phone: string;
            cpf: string;
            birthdate: Date;
            sex: string | null;
        };
        professional: {
            id: string;
            crm: string | null;
        };
        professionalUnit: {
            id: string;
            isActive: boolean;
        };
        professionalUnitRole: {
            id: string;
            roleId: string;
        };
        patient: {
            id: string;
            isActive: boolean;
        };
    } | null>;
    readonly applyProfileUpdate: (args: {
        userId: string;
        professionalId: string;
        userChanges: ProfileUpdateChanges["userChanges"];
        professionalChanges: ProfileUpdateChanges["professionalChanges"];
        accountPasswordHash?: string;
    }) => Promise<void>;
    readonly applyFullUpdate: (args: {
        userId: string;
        professionalId: string;
        professionalUnitId: string;
        professionalUnitRoleId: string;
        patientId: string;
        userChanges: FullUpdateChanges["userChanges"];
        professionalChanges: FullUpdateChanges["professionalChanges"];
        professionalUnitChanges: FullUpdateChanges["professionalUnitChanges"];
        professionalUnitRoleChanges: FullUpdateChanges["professionalUnitRoleChanges"];
        patientChanges: FullUpdateChanges["patientChanges"];
        accountPasswordHash?: string;
    }) => Promise<void>;
    readonly professionalExists: (professionalId: string) => Promise<boolean>;

    constructor(db: DatabaseClient) {
        const toProfile = (row: {
            id: string;
            professionalId: string;
            unitId: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
        }) =>
            professionalUnitProfileSchema.parse({
                id: row.id,
                professionalId: row.professionalId,
                unitId: row.unitId,
                isActive: row.isActive,
                createdAt: row.createdAt.toISOString(),
                updatedAt: row.updatedAt.toISOString(),
            });

        this.create = async (data) => {
            const [result] = await db
                .insert(professionalUnits)
                .values({
                    professionalId: data.professionalId,
                    unitId: data.unitId,
                    isActive: data.isActive,
                })
                .returning({
                    id: professionalUnits.id,
                    professionalId: professionalUnits.professionalId,
                    unitId: professionalUnits.unitId,
                    isActive: professionalUnits.isActive,
                    createdAt: professionalUnits.createdAt,
                    updatedAt: professionalUnits.updatedAt,
                });

            return toProfile(result);
        };

        this.findByIdAndUnit = async (professionalUnitId, unitId) => {
            const [result] = await db
                .select({
                    id: professionalUnits.id,
                    professionalId: professionalUnits.professionalId,
                    unitId: professionalUnits.unitId,
                    isActive: professionalUnits.isActive,
                    createdAt: professionalUnits.createdAt,
                    updatedAt: professionalUnits.updatedAt,
                })
                .from(professionalUnits)
                .where(
                    and(
                        eq(professionalUnits.id, professionalUnitId),
                        eq(professionalUnits.unitId, unitId),
                        eq(users.isActive, true),
                        eq(professionals.isActive, true),
                    ),
                )
                .limit(1);

            return result ? toProfile(result) : null;
        };

        this.findFullDataByIdAndUnit = async (professionalUnitId, unitId) => {
            const [base] = await db
                .select({
                    id: professionalUnits.id,
                    isActive: professionalUnits.isActive,
                    professionalId: professionals.id,
                    professionalCrm: professionals.crm,
                    professionalIsActive: professionals.isActive,
                    userId: users.id,
                    userName: users.name,
                    socialName: users.socialName,
                    userEmail: users.email,
                    userPhone: users.phone,
                    userCpf: users.cpf,
                    userSex: users.sex,
                    userBirthdate: users.birthdate,
                    userIsActive: users.isActive,
                })
                .from(professionalUnits)
                .innerJoin(professionals, eq(professionalUnits.professionalId, professionals.id))
                .innerJoin(users, eq(professionals.userId, users.id))
                .where(and(eq(professionalUnits.id, professionalUnitId), eq(professionalUnits.unitId, unitId)))
                .limit(1);

            if (!base) {
                return null;
            }

            const roleRows = await db
                .select({
                    id: roles.id,
                    name: roles.description,
                    isActive: roles.isActive,
                })
                .from(professionalUnitRoles)
                .innerJoin(roles, eq(professionalUnitRoles.roleId, roles.id))
                .innerJoin(professionalUnits, eq(professionalUnitRoles.professionalUnitId, professionalUnits.id))
                .where(and(eq(professionalUnits.id, professionalUnitId), eq(professionalUnits.unitId, unitId)));

            const professionalUnitRoleRows = await db
                .select({
                    id: professionalUnitRoles.id,
                })
                .from(professionalUnitRoles)
                .innerJoin(professionalUnits, eq(professionalUnitRoles.professionalUnitId, professionalUnits.id))
                .where(and(eq(professionalUnits.id, professionalUnitId), eq(professionalUnits.unitId, unitId)));

            const patientRows = await db
                .select({
                    id: patients.id,
                    isActive: patients.isActive,
                })
                .from(patients)
                .where(eq(patients.userId, base.userId))
                .limit(1);

            return professionalUnitFullDataSchema.parse({
                id: base.id,
                isActive: base.isActive,
                users: {
                    id: base.userId,
                    name: base.userName,
                    socialName: base.socialName ?? "",
                    email: base.userEmail,
                    phone: base.userPhone ?? "",
                    sex: base.userSex ?? "",
                    cpf: base.userCpf ?? "",
                    birthdate: base.userBirthdate.toISOString(),
                    isActive: base.userIsActive,
                },
                professionals: {
                    id: base.professionalId,
                    crm: base.professionalCrm ?? "",
                    isActive: base.professionalIsActive,
                },
                roles: roleRows[0],
                professionalUnitRoles: professionalUnitRoleRows[0],
                patients: patientRows[0],
            });
        };

        this.listFullDataByUnit = async (unitId) => {
            const baseRows = await db
                .select({
                    id: professionalUnits.id,
                    isActive: professionalUnits.isActive,
                    professionalId: professionals.id,
                    professionalCrm: professionals.crm,
                    professionalIsActive: professionals.isActive,
                    userId: users.id,
                    userName: users.name,
                    socialName: users.socialName,
                    userEmail: users.email,
                    userPhone: users.phone,
                    userCpf: users.cpf,
                    userSex: users.sex,
                    userBirthdate: users.birthdate,
                    userIsActive: users.isActive,
                })
                .from(professionalUnits)
                .innerJoin(professionals, eq(professionalUnits.professionalId, professionals.id))
                .innerJoin(users, eq(professionals.userId, users.id))
                .where(eq(professionalUnits.unitId, unitId))
                .orderBy(asc(users.name), asc(users.cpf));

            const results = await Promise.all(
                baseRows.map(async (base) => {
                    const [role] = await db
                        .select({
                            id: roles.id,
                            name: roles.description,
                            isActive: roles.isActive,
                        })
                        .from(professionalUnitRoles)
                        .innerJoin(roles, eq(professionalUnitRoles.roleId, roles.id))
                        .innerJoin(professionalUnits, eq(professionalUnitRoles.professionalUnitId, professionalUnits.id))
                        .where(and(eq(professionalUnits.id, base.id), eq(professionalUnits.unitId, unitId)))
                        .limit(1);

                    return professionalUnitFullDataByUnitSchema.parse({
                        id: base.id,
                        isActive: base.isActive,
                        users: {
                            id: base.userId,
                            name: base.userName,
                            socialName: base.socialName ?? "",
                            email: base.userEmail,
                            phone: base.userPhone ?? "",
                            sex: base.userSex ?? "",
                            cpf: base.userCpf ?? "",
                            birthdate: base.userBirthdate.toISOString(),
                            isActive: base.userIsActive,
                        },
                        professionals: {
                            id: base.professionalId,
                            crm: base.professionalCrm ?? "",
                            isActive: base.professionalIsActive,
                        },
                        roles: role,
                    });
                }),
            );

            return professionalUnitFullDataByUnitListSchema.parse(results);
        };

        this.findByProfessionalIdAndUnitId = async (professionalId, unitId) => {
            const [result] = await db
                .select({
                    id: professionalUnits.id,
                    professionalId: professionalUnits.professionalId,
                    unitId: professionalUnits.unitId,
                    isActive: professionalUnits.isActive,
                    createdAt: professionalUnits.createdAt,
                    updatedAt: professionalUnits.updatedAt,
                })
                .from(professionalUnits)
                .where(
                    and(
                        eq(professionalUnits.professionalId, professionalId),
                        eq(professionalUnits.unitId, unitId),
                    ),
                )
                .limit(1);

            return result ? toProfile(result) : null;
        };

        this.findUserByEmail = async (email) => {
            const [result] = await db
                .select({ id: users.id })
                .from(users)
                .where(eq(users.email, email))
                .limit(1);

            return result ?? null;
        };

        this.findUserByCpf = async (cpf) => {
            const [result] = await db
                .select({ id: users.id })
                .from(users)
                .where(eq(users.cpf, cpf))
                .limit(1);

            return result ?? null;
        };

        this.roleExists = async (roleId) => {
            const [result] = await db
                .select({ id: roles.id })
                .from(roles)
                .where(eq(roles.id, roleId))
                .limit(1);

            return !!result;
        };

        this.findProfileUpdateTarget = async (unitId, userId, professionalId) => {
            const [result] = await db
                .select({
                    professionalUnitId: professionalUnits.id,
                    userId: users.id,
                    userName: users.name,
                    socialName: users.socialName,
                    userEmail: users.email,
                    userPhone: users.phone,
                    userCpf: users.cpf,
                    userBirthdate: users.birthdate,
                    userSex: users.sex,
                    professionalId: professionals.id,
                    professionalCrm: professionals.crm,
                })
                .from(professionalUnits)
                .innerJoin(professionals, eq(professionalUnits.professionalId, professionals.id))
                .innerJoin(users, eq(professionals.userId, users.id))
                .where(
                    and(
                        eq(professionalUnits.unitId, unitId),
                        eq(professionals.id, professionalId),
                        eq(users.id, userId),
                    ),
                )
                .limit(1);

            if (!result) {
                return null;
            }

            return {
                professionalUnitId: result.professionalUnitId,
                user: {
                    id: result.userId,
                    name: result.userName,
                    socialName: result.socialName,
                    email: result.userEmail,
                    phone: result.userPhone,
                    cpf: result.userCpf,
                    birthdate: result.userBirthdate,
                    sex: result.userSex,
                },
                professional: {
                    id: result.professionalId,
                    crm: result.professionalCrm,
                },
            };
        };

        this.findFullUpdateTarget = async (unitId, data) => {
            const [base] = await db
                .select({
                    userId: users.id,
                    userName: users.name,
                    socialName: users.socialName,
                    userEmail: users.email,
                    userPhone: users.phone,
                    userCpf: users.cpf,
                    userBirthdate: users.birthdate,
                    userSex: users.sex,
                    professionalId: professionals.id,
                    professionalCrm: professionals.crm,
                    professionalUnitId: professionalUnits.id,
                    professionalUnitIsActive: professionalUnits.isActive,
                })
                .from(professionalUnits)
                .innerJoin(professionals, eq(professionalUnits.professionalId, professionals.id))
                .innerJoin(users, eq(professionals.userId, users.id))
                .where(
                    and(
                        eq(professionalUnits.unitId, unitId),
                        eq(professionalUnits.id, data.professionalUnitId),
                        eq(professionals.id, data.professionalId),
                        eq(users.id, data.userId),
                    ),
                )
                .limit(1);

            if (!base) {
                return null;
            }

            const [roleLink] = await db
                .select({
                    id: professionalUnitRoles.id,
                    roleId: professionalUnitRoles.roleId,
                })
                .from(professionalUnitRoles)
                .where(
                    and(
                        eq(professionalUnitRoles.id, data.professionalUnitRoleId),
                        eq(professionalUnitRoles.professionalUnitId, data.professionalUnitId),
                    ),
                )
                .limit(1);

            if (!roleLink) {
                return null;
            }

            const [patient] = await db
                .select({
                    id: patients.id,
                    isActive: patients.isActive,
                })
                .from(patients)
                .where(and(eq(patients.id, data.patientId), eq(patients.userId, data.userId)))
                .limit(1);

            if (!patient) {
                return null;
            }

            return {
                user: {
                    id: base.userId,
                    name: base.userName,
                    socialName: base.socialName,
                    email: base.userEmail,
                    phone: base.userPhone,
                    cpf: base.userCpf,
                    birthdate: base.userBirthdate,
                    sex: base.userSex,
                },
                professional: {
                    id: base.professionalId,
                    crm: base.professionalCrm,
                },
                professionalUnit: {
                    id: base.professionalUnitId,
                    isActive: base.professionalUnitIsActive,
                },
                professionalUnitRole: {
                    id: roleLink.id,
                    roleId: roleLink.roleId,
                },
                patient,
            };
        };

        this.applyProfileUpdate = async ({
            userId,
            professionalId,
            userChanges,
            professionalChanges,
            accountPasswordHash,
        }) => {
            await db.transaction(async (tx) => {
                if (Object.keys(userChanges).length > 0) {
                    await tx.update(users).set(userChanges).where(eq(users.id, userId));
                }

                if (Object.keys(professionalChanges).length > 0) {
                    await tx
                        .update(professionals)
                        .set(professionalChanges)
                        .where(eq(professionals.id, professionalId));
                }

                if (accountPasswordHash) {
                    await tx
                        .update(accounts)
                        .set({ password: accountPasswordHash })
                        .where(eq(accounts.userId, userId));
                }
            });
        };

        this.applyFullUpdate = async ({
            userId,
            professionalId,
            professionalUnitId,
            professionalUnitRoleId,
            patientId,
            userChanges,
            professionalChanges,
            professionalUnitChanges,
            professionalUnitRoleChanges,
            patientChanges,
            accountPasswordHash,
        }) => {
            await db.transaction(async (tx) => {
                if (Object.keys(userChanges).length > 0) {
                    await tx.update(users).set(userChanges).where(eq(users.id, userId));
                }

                if (Object.keys(professionalChanges).length > 0) {
                    await tx
                        .update(professionals)
                        .set(professionalChanges)
                        .where(eq(professionals.id, professionalId));
                }

                if (Object.keys(professionalUnitChanges).length > 0) {
                    await tx
                        .update(professionalUnits)
                        .set(professionalUnitChanges)
                        .where(eq(professionalUnits.id, professionalUnitId));
                }

                if (Object.keys(professionalUnitRoleChanges).length > 0) {
                    await tx
                        .update(professionalUnitRoles)
                        .set(professionalUnitRoleChanges)
                        .where(eq(professionalUnitRoles.id, professionalUnitRoleId));
                }

                if (Object.keys(patientChanges).length > 0) {
                    await tx.update(patients).set(patientChanges).where(eq(patients.id, patientId));
                }

                if (accountPasswordHash) {
                    await tx
                        .update(accounts)
                        .set({ password: accountPasswordHash })
                        .where(eq(accounts.userId, userId));
                }
            });
        };

        this.professionalExists = async (professionalId) => {
            const [result] = await db
                .select({ id: professionals.id })
                .from(professionals)
                .where(eq(professionals.id, professionalId))
                .limit(1);

            return !!result;
        };
    }
}
