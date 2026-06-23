import { and, eq } from "drizzle-orm";
import type { z } from "zod";
import type { db as dbType } from "../../db/client.js";
import { appointments } from "../../db/schema/appointments.js";
import { appointmentLogs } from "../../db/schema/appointment-logs.js";
import { professionalUnits } from "../../db/schema/professional-units.js";
import { professionals } from "../../db/schema/professionals.js";
import { appointmentsStatus } from "../../db/schema/appointments-status.js";
import { appointmentSchema } from "./appointments.schemas.js";

type DatabaseClient = typeof dbType;

export type AppointmentProfile = z.infer<typeof appointmentSchema>;

export class AppointmentsRepository {
    constructor(private readonly db: DatabaseClient) {}

    async getStatusIdByCode(code: number): Promise<string> {
        const [status] = await this.db
            .select({ id: appointmentsStatus.id })
            .from(appointmentsStatus)
            .where(eq(appointmentsStatus.code, code))
            .limit(1);

        if (!status) {
            throw new Error("Invalid status code");
        }

        return status.id;
    }

    async create(data: {
        patientId: string;
        professionalUnitId: string;
        scheduleSlotId: string;
        statusId: string;
    }): Promise<AppointmentProfile> {
        const [inserted] = await this.db
            .insert(appointments)
            .values({
                patientId: data.patientId,
                professionalUnitId: data.professionalUnitId,
                scheduleSlotId: data.scheduleSlotId,
                statusId: data.statusId,
                isActive: true,
            })
            .returning({
                id: appointments.id,
            });

        const [row] = await this.db
            .select({
                id: appointments.id,
                patientId: appointments.patientId,
                professionalUnitId: appointments.professionalUnitId,
                scheduleSlotId: appointments.scheduleSlotId,
                startAt: appointments.startAt,
                endAt: appointments.endAt,
                diagnostics: appointments.diagnostics,
                evolution: appointments.evolution,
                statusId: appointments.statusId,
                isActive: appointments.isActive,
                createdAt: appointments.createdAt,
                updatedAt: appointments.updatedAt,
            })
            .from(appointments)
            .where(eq(appointments.id, inserted.id))
            .limit(1);

        return appointmentSchema.parse({
            ...row,
            startAt: row.startAt?.toISOString() ?? null,
            endAt: row.endAt?.toISOString() ?? null,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
        });
    }

    async updateById(
        appointmentId: string,
        data: {
            patientId?: string;
            professionalUnitId?: string;
            scheduleSlotId?: string;
            startAt?: Date | null;
            endAt?: Date | null;
            diagnostics?: string | null;
            evolution?: string | null;
            statusId?: string;
            isActive?: boolean;
        },
    ): Promise<AppointmentProfile | null> {
        const [updated] = await this.db
            .update(appointments)
            .set({
                ...(typeof data.patientId !== "undefined" ? { patientId: data.patientId } : {}),
                ...(typeof data.professionalUnitId !== "undefined" ? { professionalUnitId: data.professionalUnitId } : {}),
                ...(typeof data.scheduleSlotId !== "undefined" ? { scheduleSlotId: data.scheduleSlotId } : {}),
                ...(typeof data.startAt !== "undefined" ? { startAt: data.startAt } : {}),
                ...(typeof data.endAt !== "undefined" ? { endAt: data.endAt } : {}),
                ...(typeof data.diagnostics !== "undefined" ? { diagnostics: data.diagnostics } : {}),
                ...(typeof data.evolution !== "undefined" ? { evolution: data.evolution } : {}),
                ...(typeof data.statusId !== "undefined" ? { statusId: data.statusId } : {}),
                ...(typeof data.isActive !== "undefined" ? { isActive: data.isActive } : {}),
            })
            .where(and(eq(appointments.id, appointmentId), eq(appointments.isActive, true)))
            .returning({
                id: appointments.id,
            });

        if (!updated) {
            return null;
        }

        const [row] = await this.db
            .select({
                id: appointments.id,
                patientId: appointments.patientId,
                professionalUnitId: appointments.professionalUnitId,
                scheduleSlotId: appointments.scheduleSlotId,
                startAt: appointments.startAt,
                endAt: appointments.endAt,
                diagnostics: appointments.diagnostics,
                evolution: appointments.evolution,
                statusId: appointments.statusId,
                isActive: appointments.isActive,
                createdAt: appointments.createdAt,
                updatedAt: appointments.updatedAt,
            })
            .from(appointments)
            .where(eq(appointments.id, appointmentId))
            .limit(1);

        return appointmentSchema.parse({
            ...row,
            startAt: row.startAt?.toISOString() ?? null,
            endAt: row.endAt?.toISOString() ?? null,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
        });
    }

    async createAppointmentLog(appointmentId: string, oldStatusId: string | null, newStatusId: string, professionalUnitId: string): Promise<void> {
        // Get the user_id from professional_unit -> professional -> user
        const [professionalUnit] = await this.db
            .select({
                userId: professionals.userId,
            })
            .from(professionalUnits)
            .innerJoin(professionals, eq(professionalUnits.professionalId, professionals.id))
            .where(eq(professionalUnits.id, professionalUnitId))
            .limit(1);

        await this.db.insert(appointmentLogs).values({
            appointmentId,
            oldStatusId,
            newStatusId,
            changedBy: professionalUnit?.userId ?? null,
            observation: null,
        });
    }
}