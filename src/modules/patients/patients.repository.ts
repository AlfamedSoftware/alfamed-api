import { eq } from "drizzle-orm";
import type { z } from "zod";
import type { db as dbType } from "../../db/client.js";
import { patients } from "../../db/schema/patients.js";
import { patientProfileSchema } from "./patients.schemas.js";

export type Patient = z.infer<typeof patientProfileSchema>;

type DatabaseClient = typeof dbType;

export class PatientsRepository {
    readonly createPatient: (userId: string) => Promise<Patient>;
    readonly getPatientByUserId: (userId: string) => Promise<Patient | null>;
    readonly getPatientById: (patientId: string) => Promise<Patient | null>;

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

        this.createPatient = async (userId: string) => {
            const [newPatient] = await db
                .insert(patients)
                .values({
                    userId,
                    isActive: true,
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
    }
}
