import { and, eq } from "drizzle-orm";
import type { z } from "zod";
import type { db as dbType } from "../../db/client.js";
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
                .where(and(eq(professionalUnits.id, professionalUnitId), eq(professionalUnits.unitId, unitId)))
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
                .where(and(eq(professionalUnits.id, professionalUnitId), eq(professionalUnits.unitId, unitId)))
                .limit(1);

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
                .where(eq(professionalUnits.unitId, unitId));

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
