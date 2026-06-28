import { eq } from "drizzle-orm";
import type { z } from "zod";
import type { db as dbType } from "../../db/client.js";
import { anamnesis } from "../../db/schema/anamnesis.js";
import { anamnesisSchema } from "./anamnesis.schemas.js";

type DatabaseClient = typeof dbType;

export type AnamnesisRecord = z.infer<typeof anamnesisSchema>;

export class AnamnesisRepository {
    constructor(private readonly db: DatabaseClient) {}

    async findByAppointmentId(appointmentId: string): Promise<AnamnesisRecord[]> {
        const rows = await this.db
            .select()
            .from(anamnesis)
            .where(eq(anamnesis.appointmentId, appointmentId));

        return rows.map((row) =>
            anamnesisSchema.parse({
                ...row,
                createdAt: row.createdAt.toISOString(),
                updatedAt: row.updatedAt.toISOString(),
            }),
        );
    }

    async create(data: {
        appointmentId: string;
        mainComplaint?: string | null;
        painLevel?: number | null;
        takingMedication?: string | null;
        knownAllergy?: string | null;
        hadSurgery?: boolean | null;
        surgeryDetails?: string | null;
        familyHistory?: boolean | null;
        familyHistoryDetails?: string | null;
    }): Promise<AnamnesisRecord> {
        const [inserted] = await this.db
            .insert(anamnesis)
            .values(data)
            .returning();

        return anamnesisSchema.parse({
            ...inserted,
            createdAt: inserted.createdAt.toISOString(),
            updatedAt: inserted.updatedAt.toISOString(),
        });
    }
}
