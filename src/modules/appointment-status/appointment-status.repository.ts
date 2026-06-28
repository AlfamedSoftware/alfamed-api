import { and, asc, eq, type SQL } from "drizzle-orm";
import type { z } from "zod";
import type { db as dbType } from "../../db/client.js";
import { appointmentsStatus } from "../../db/schema/appointments-status.js";
import { appointmentStatusSchema } from "./appointment-status.schemas.js";

type DatabaseClient = typeof dbType;

export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;

export type ListAppointmentStatusFilters = {
    isActive?: boolean;
};

export class AppointmentStatusRepository {
    constructor(private readonly db: DatabaseClient) { }

    async list(filters: ListAppointmentStatusFilters = {}): Promise<AppointmentStatus[]> {
        const conditions: SQL[] = [];

        if (filters.isActive !== undefined) {
            conditions.push(eq(appointmentsStatus.isActive, filters.isActive));
        }

        const rows = await this.db
            .select({
                id: appointmentsStatus.id,
                code: appointmentsStatus.code,
                description: appointmentsStatus.description,
                isActive: appointmentsStatus.isActive,
                createdAt: appointmentsStatus.createdAt,
                updatedAt: appointmentsStatus.updatedAt,
            })
            .from(appointmentsStatus)
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(asc(appointmentsStatus.code));

        return rows.map((row) =>
            appointmentStatusSchema.parse({
                ...row,
                createdAt: row.createdAt.toISOString(),
                updatedAt: row.updatedAt.toISOString(),
            }),
        );
    }
}
