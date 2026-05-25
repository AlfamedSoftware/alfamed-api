import { eq } from "drizzle-orm";
import type { z } from "zod";
import type { db as dbType } from "../../db/client.js";
import { patients } from "../../db/schema/patients.js";
import { users } from "../../db/schema/users.js";
import {
    createPatientForUserSchema,
    patientFullDataByUserSchema,
    patientProfileSchema,
} from "./patients.schemas.js";

export type Patient = z.infer<typeof patientProfileSchema>;
export type PatientFullDataByUser = z.infer<typeof patientFullDataByUserSchema>;
export type CreatePatientInput = z.infer<typeof createPatientForUserSchema>;

type DatabaseClient = typeof dbType;

export class PatientsRepository {
    readonly createPatient: (data: CreatePatientInput) => Promise<Patient>;
    readonly getPatientByUserId: (userId: string) => Promise<Patient | null>;
    readonly getPatientById: (patientId: string) => Promise<Patient | null>;
    readonly getPatientFullDataByUserId: (userId: string) => Promise<PatientFullDataByUser | null>;

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
    }
}
