import { eq } from "drizzle-orm";
import type { z } from "zod";
import type { db as dbType } from "../../db/client.js";
import { patients } from "../../db/schema/patients.js";
import { patientSchema } from "./patients.schemas.js";

export type Patient = z.infer<typeof patientSchema>;

type DatabaseClient = typeof dbType;

export class PatientsRepository {
    readonly createPatient: (userId: string) => Promise<Patient>;
    readonly getPatientByUserId: (userId: string) => Promise<Patient | null>;
    readonly getPatientById: (patientId: string) => Promise<Patient | null>;

    constructor(db: DatabaseClient) {
        this.createPatient = async (userId: string) => {
            const [newPatient] = await db
                .insert(patients)
                .values({
                    userId,
                    isActive: true,
                })
                .returning();

            return newPatient as Patient;
        };

        this.getPatientByUserId = async (userId: string) => {
            const [result] = await db
                .select()
                .from(patients)
                .where(eq(patients.userId, userId))
                .limit(1);

            return (result as Patient) || null;
        };

        this.getPatientById = async (patientId: string) => {
            const [result] = await db
                .select()
                .from(patients)
                .where(eq(patients.id, patientId))
                .limit(1);

            return (result as Patient) || null;
        };
    }
}
