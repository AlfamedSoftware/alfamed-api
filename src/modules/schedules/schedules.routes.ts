import { Elysia, t } from "elysia";
import { z } from "zod";
import { getAuthenticatedUserId } from "../../http/plugins/unit-access.js";
import { getUnitIdFromRequest } from "../../http/plugins/unit-context.js";
import type { db as dbType } from "../../db/client.js";
import { SchedulesRepository } from "./schedules.repository.js";

type DatabaseClient = typeof dbType;

const scheduleItemSchema = z.object({
    dayOfWeek: z.number().min(0).max(6),
    startTime: z.string(),
    endTime: z.string(),
    appointmentDurationMinutes: z.number().int().min(1),
    isActive: z.boolean().optional(),
});

const replaceSchedulesSchema = z.object({
    schedules: z.array(scheduleItemSchema),
});

export const schedulesRoutes = ({ db }: { db: DatabaseClient }) => {
    const repo = new SchedulesRepository(db);

    return new Elysia({ name: "schedules-routes", prefix: "/professionals" })
        .get(
            "/:id/schedules",
            async (context) => {
                const { params, status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });
                const unitId = getUnitIdFromRequest(context.request);

                if (!userId) return status(401, { message: "Unauthorized" });
                if (!unitId) return status(400, { message: "Selecione uma clínica para continuar" });

                try {
                    const rows = await repo.listByProfessionalAndUnit(params.id, unitId);
                    return status(200, rows.map((r) => ({
                        id: r.id,
                        dayOfWeek: r.dayOfWeek,
                        startTime: r.startTime,
                        endTime: r.endTime,
                        appointmentDurationMinutes: r.appointmentDurationMinutes,
                        isActive: r.isActive,
                    })));
                } catch (error) {
                    console.error("[schedules.routes] Error listing schedules:", error);
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                params: t.Object({ id: t.String({ format: "uuid" }) }),
                detail: {
                    summary: "List professional schedules",
                    description: "Returns schedules for the given professional within the selected unit.",
                    tags: ["Professionals"],
                },
                response: {
                    200: t.Array(
                        t.Object({
                            id: t.String({ format: "uuid" }),
                            dayOfWeek: t.Number(),
                            startTime: t.String(),
                            endTime: t.String(),
                            appointmentDurationMinutes: t.Number(),
                            isActive: t.Boolean(),
                        }),
                    ),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    400: t.Object({ message: t.Literal("Selecione uma clínica para continuar") }),
                    500: t.Object({ message: t.String() }),
                },
            },
        )
        .put(
            "/:id/schedules",
            async (context) => {
                const { params, body, status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });
                const unitId = getUnitIdFromRequest(context.request);

                if (!userId) return status(401, { message: "Unauthorized" });
                if (!unitId) return status(400, { message: "Selecione uma clínica para continuar" });

                try {
                    const parsed = replaceSchedulesSchema.parse(body);
                    const saved = await repo.replaceForProfessionalAndUnit(params.id, unitId, parsed.schedules as any);
                    return status(200, saved);
                } catch (error) {
                    console.error("[schedules.routes] Error replacing schedules:", error);
                    if (error instanceof Error && error.message === "PROFESSIONAL_UNIT_NOT_FOUND") {
                        return status(404, { message: "Professional unit not found" });
                    }
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                params: t.Object({ id: t.String({ format: "uuid" }) }),
                body: z.any(),
                detail: {
                    summary: "Replace professional schedules",
                    description: "Replace all schedules for the professional in the selected unit.",
                    tags: ["Professionals"],
                },
                response: {
                    200: t.Array(
                        t.Object({
                            id: t.String({ format: "uuid" }),
                            dayOfWeek: t.Number(),
                            startTime: t.String(),
                            endTime: t.String(),
                            appointmentDurationMinutes: t.Number(),
                            isActive: t.Boolean(),
                        }),
                    ),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    400: t.Object({ message: t.Literal("Selecione uma clínica para continuar") }),
                    404: t.Object({ message: t.Literal("Professional unit not found") }),
                    500: t.Object({ message: t.String() }),
                },
            },
        )
        .delete(
            "/:id/schedules/:scheduleId",
            async (context) => {
                const { params, status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });
                const unitId = getUnitIdFromRequest(context.request);

                if (!userId) return status(401, { message: "Unauthorized" });
                if (!unitId) return status(400, { message: "Selecione uma clínica para continuar" });

                try {
                    await repo.deleteById(params.id, unitId, params.scheduleId);
                    return status(204);
                } catch (error) {
                    console.error("[schedules.routes] Error deleting schedule:", error);
                    if (error instanceof Error && error.message === "PROFESSIONAL_UNIT_NOT_FOUND") {
                        return status(404, { message: "Professional unit not found" });
                    }
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                params: t.Object({ id: t.String({ format: "uuid" }), scheduleId: t.String({ format: "uuid" }) }),
                detail: {
                    summary: "Delete schedule",
                    description: "Deletes a schedule for the professional in the selected unit.",
                    tags: ["Professionals"],
                },
                response: {
                    204: t.Undefined(),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    400: t.Object({ message: t.Literal("Selecione uma clínica para continuar") }),
                    404: t.Object({ message: t.Literal("Professional unit not found") }),
                    500: t.Object({ message: t.String() }),
                },
            },
        );
};
