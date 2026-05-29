import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import type { db as dbType } from "../../db/client.js";
import { accounts } from "../../db/schema/accounts.js";
import { patients } from "../../db/schema/patients.js";
import { users } from "../../db/schema/users.js";
import { DomainError } from "../../http/plugins/domain-error.js";
import {
    createPatientFullCreateSchema,
    createPatientForUserSchema,
    patientFullDataByUserSchema,
    patientProfileSchema,
} from "./patients.schemas.js";

export type Patient = z.infer<typeof patientProfileSchema>;
export type PatientFullDataByUser = z.infer<typeof patientFullDataByUserSchema>;
export type CreatePatientInput = z.infer<typeof createPatientForUserSchema>;
export type CreatePatientFullCreateInput = z.infer<typeof createPatientFullCreateSchema>;

type DatabaseClient = typeof dbType;

export class PatientsRepository {
    readonly createPatient: (data: CreatePatientInput) => Promise<Patient>;
    readonly createPatientFullCreate: (data: CreatePatientFullCreateInput) => Promise<PatientFullDataByUser>;
    readonly getPatientByUserId: (userId: string) => Promise<Patient | null>;
    readonly getPatientById: (patientId: string) => Promise<Patient | null>;
    readonly getPatientFullDataByUserId: (userId: string) => Promise<PatientFullDataByUser | null>;
    readonly findUserByEmail: (email: string) => Promise<{ id: string } | null>;
    readonly findUserByCpf: (cpf: string) => Promise<{ id: string } | null>;
    readonly applyFullUpdate: (args: {
        userId: string;
        patientId: string;
        userChanges: Record<string, unknown>;
        patientChanges: Record<string, unknown>;
        accountPasswordHash?: string;
    }) => Promise<void>;

    constructor(db: DatabaseClient) {
        const toProfile = (row: {
            id: string;
            userId: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
        }) =>
            patientProfileSchema.parse({
                id: row.id,
                userId: row.userId,
                isActive: row.isActive,
                createdAt: row.createdAt.toISOString(),
                updatedAt: row.updatedAt.toISOString(),
            });

        this.createPatient = async (data: CreatePatientInput) => {
            const [newPatient] = await db
                .insert(patients)
                .values({
                    userId: data.userId,
                    isActive: data.isActive,
                })
                .returning({
                    id: patients.id,
                    userId: patients.userId,
                    isActive: patients.isActive,
                    createdAt: patients.createdAt,
                    updatedAt: patients.updatedAt,
                });

            return toProfile(newPatient);
        };

        this.createPatientFullCreate = async (data: CreatePatientFullCreateInput) => {
            const normalizedName = data.name.trim();
            const normalizedSocialName = data.socialName?.trim() || null;
            const normalizedEmail = data.email.trim().toLowerCase();
            const normalizedCpf = data.cpf.trim();
            const normalizedPhone = data.phone.trim();
            const normalizedPassword = data.password.trim();

            const [existingByEmail] = await db
                .select({ id: users.id })
                .from(users)
                .where(eq(users.email, normalizedEmail))
                .limit(1);

            if (existingByEmail) {
                throw new DomainError("EMAIL_ALREADY_EXISTS", "E-mail já cadastrado");
            }

            const [existingByCpf] = await db
                .select({ id: users.id })
                .from(users)
                .where(eq(users.cpf, normalizedCpf))
                .limit(1);

            if (existingByCpf) {
                throw new DomainError("CPF_ALREADY_EXISTS", "CPF já cadastrado");
            }

            const createdPatient = await db.transaction(async (tx) => {
                const [createdUser] = await tx
                    .insert(users)
                    .values({
                        name: normalizedName,
                        socialName: normalizedSocialName,
                        email: normalizedEmail,
                        cpf: normalizedCpf,
                        birthdate: new Date(data.birthdate),
                        phone: normalizedPhone,
                        sex: data.sex,
                        emailVerified: false,
                        isActive: true,
                        twoFactorEnabled: false,
                    })
                    .returning({
                        id: users.id,
                        name: users.name,
                        socialName: users.socialName,
                        email: users.email,
                        cpf: users.cpf,
                        birthdate: users.birthdate,
                        phone: users.phone,
                        sex: users.sex,
                        isActive: users.isActive,
                    });

                await tx.insert(accounts).values({
                    userId: createdUser.id,
                    accountId: createdUser.id,
                    providerId: "credential",
                    password: await hash(normalizedPassword, 12),
                });

                const [patientRow] = await tx
                    .insert(patients)
                    .values({
                        userId: createdUser.id,
                        isActive: true,
                    })
                    .returning({
                        id: patients.id,
                        isActive: patients.isActive,
                    });

                return {
                    id: patientRow.id,
                    isActive: patientRow.isActive,
                    users: {
                        id: createdUser.id,
                        name: createdUser.name,
                        socialName: createdUser.socialName,
                        email: createdUser.email,
                        phone: createdUser.phone,
                        cpf: createdUser.cpf,
                        birthdate: createdUser.birthdate.toISOString(),
                        sex: createdUser.sex,
                        isActive: createdUser.isActive,
                    },
                };
            });

            return patientFullDataByUserSchema.parse(createdPatient);
        };

        this.getPatientByUserId = async (userId: string) => {
            const [result] = await db
                .select({
                    id: patients.id,
                    userId: patients.userId,
                    isActive: patients.isActive,
                    createdAt: patients.createdAt,
                    updatedAt: patients.updatedAt,
                })
                .from(patients)
                .where(eq(patients.userId, userId))
                .limit(1);

            return result ? toProfile(result) : null;
        };

        this.getPatientById = async (patientId: string) => {
            const [result] = await db
                .select({
                    id: patients.id,
                    userId: patients.userId,
                    isActive: patients.isActive,
                    createdAt: patients.createdAt,
                    updatedAt: patients.updatedAt,
                })
                .from(patients)
                .where(eq(patients.id, patientId))
                .limit(1);

            return result ? toProfile(result) : null;
        };

        this.getPatientFullDataByUserId = async (userId: string) => {
            const [result] = await db
                .select({
                    id: patients.id,
                    isActive: patients.isActive,
                    userId: users.id,
                    userName: users.name,
                    userSocialName: users.socialName,
                    userEmail: users.email,
                    userPhone: users.phone,
                    userCpf: users.cpf,
                    userBirthdate: users.birthdate,
                    userSex: users.sex,
                    userIsActive: users.isActive,
                })
                .from(patients)
                .innerJoin(users, eq(patients.userId, users.id))
                .where(eq(users.id, userId))
                .limit(1);

            if (!result) {
                return null;
            }

            return patientFullDataByUserSchema.parse({
                id: result.id,
                isActive: result.isActive,
                users: {
                    id: result.userId,
                    name: result.userName,
                    socialName: result.userSocialName,
                    email: result.userEmail,
                    phone: result.userPhone,
                    cpf: result.userCpf,
                    birthdate: result.userBirthdate.toISOString(),
                    sex: result.userSex,
                    isActive: result.userIsActive,
                },
            });
        };

        this.findUserByEmail = async (email: string) => {
            const [result] = await db
                .select({ id: users.id })
                .from(users)
                .where(eq(users.email, email))
                .limit(1);

            return result ?? null;
        };

        this.findUserByCpf = async (cpf: string) => {
            const [result] = await db
                .select({ id: users.id })
                .from(users)
                .where(eq(users.cpf, cpf))
                .limit(1);

            return result ?? null;
        };

        this.applyFullUpdate = async ({
            userId,
            patientId,
            userChanges,
            patientChanges,
            accountPasswordHash,
        }) => {
            await db.transaction(async (tx) => {
                if (Object.keys(userChanges).length > 0) {
                    await tx.update(users).set(userChanges).where(eq(users.id, userId));
                }

                if (Object.keys(patientChanges).length > 0) {
                    await tx.update(patients).set(patientChanges).where(eq(patients.id, patientId));
                }

                if (accountPasswordHash) {
                    await tx.update(accounts).set({ password: accountPasswordHash }).where(eq(accounts.userId, userId));
                }
            });
        };
    }
}
