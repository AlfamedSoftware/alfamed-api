import { eq } from "drizzle-orm";
import type { z } from "zod";
import type { db as dbType } from "../../db/client.js";
import { patients } from "../../db/schema/patients.js";
import { createPatientForUserSchema, patientListItemSchema, patientProfileSchema } from "./patients.schemas.js";
import { users } from "../../db/schema/users.js";

export type Patient = z.infer<typeof patientProfileSchema>;
export type PatientListItem = z.infer<typeof patientListItemSchema>;
export type CreatePatientInput = z.infer<typeof createPatientForUserSchema>;

type DatabaseClient = typeof dbType;

export class PatientsRepository {
    readonly createPatient: (data: CreatePatientInput) => Promise<Patient>;
    readonly getPatientByUserId: (userId: string) => Promise<Patient | null>;
    readonly getPatientById: (patientId: string) => Promise<Patient | null>;
    readonly listPatients: () => Promise<PatientListItem[]>;

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

        this.listPatients = async () => {
            const rows = await db
                .select({
                    id: patients.id,
                    userId: patients.userId,
                    name: users.name,
                    email: users.email,
                    cpf: users.cpf,
                    phone: users.phone,
                    isActive: patients.isActive,
                })
                .from(patients)
                .innerJoin(users, eq(users.id, patients.userId));

            return rows.map((row) =>
                patientListItemSchema.parse({
                    id: row.id,
                    userId: row.userId,
                    name: row.name ?? "Sem nome",
                    email: row.email ?? "sem-email@example.com",
                    cpf: row.cpf ?? undefined,
                    phone: row.phone ?? "-",
                    isActive: row.isActive,
                }),
            );
        };
    }
}
