import { Elysia, t } from "elysia";
import { getAuthenticatedUserId } from "../../http/plugins/unit-access.js";
import { getProfessionalUnitIdFromRequest, getUnitIdFromRequest } from "../../http/plugins/unit-context.js";
import type { db as dbType } from "../../db/client.js";
import { AttendanceRepository } from "./attendance.repository.js";
import {
    attendanceErrorSchema,
    attendanceScheduleDetailsSchema,
    attendanceSchedulesQuerySchema,
    attendanceSchedulesResponseSchema,
    updateAttendanceScheduleStatusResponseSchema,
    updateAttendanceScheduleStatusSchema,
} from "./attendance.schemas.js";

type DatabaseClient = typeof dbType;

type AttendanceRoutesOptions = {
    db: DatabaseClient;
};

export const attendanceRoutes = ({ db }: AttendanceRoutesOptions) => {
    const attendanceRepository = new AttendanceRepository(db);

    const resolveContext = (context: { request: Request; user?: { id?: string } }) => {
        const userId = getAuthenticatedUserId(context);
        const unitId = getUnitIdFromRequest(context.request);
        const professionalUnitId = getProfessionalUnitIdFromRequest(context.request);

        return { userId, unitId, professionalUnitId };
    };

    return new Elysia({ name: "attendance-routes", prefix: "/attendance" })
        .get(
            "/schedules",
            async (context) => {
                const { query, status } = context;
                const { userId, unitId, professionalUnitId } = resolveContext(context as { request: Request; user?: { id?: string } });

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                if (!unitId) {
                    return status(400, { message: "Selecione uma clínica para continuar" });
                }

                if (!professionalUnitId) {
                    return status(400, { message: "Selecione um profissional para continuar" });
                }

                try {
                    const schedules = await attendanceRepository.listSchedules(query, unitId, professionalUnitId);

                    if (!schedules) {
                        return status(403, { message: "Forbidden" });
                    }

                    return status(200, schedules);
                } catch (error) {
                    console.error("[attendance.routes] Error listing schedules:", error);
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                query: attendanceSchedulesQuerySchema,
                detail: {
                    summary: "List attendance schedules",
                    description: "Returns the current professional schedules grouped by specialty.",
                    tags: ["Attendance"],
                },
                response: {
                    200: attendanceSchedulesResponseSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    400: t.Union([
                        t.Object({ message: t.Literal("Selecione uma clínica para continuar") }),
                        t.Object({ message: t.Literal("Selecione um profissional para continuar") }),
                    ]),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    500: attendanceErrorSchema,
                },
            },
        )
        .get(
            "/schedules/:scheduleId",
            async (context) => {
                const { params, status } = context;
                const { userId, unitId, professionalUnitId } = resolveContext(context as { request: Request; user?: { id?: string } });

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                if (!unitId) {
                    return status(400, { message: "Selecione uma clínica para continuar" });
                }

                if (!professionalUnitId) {
                    return status(400, { message: "Selecione um profissional para continuar" });
                }

                try {
                    const schedule = await attendanceRepository.getScheduleDetails(params.scheduleId, unitId, professionalUnitId);

                    if (!schedule) {
                        return status(404, { message: "Schedule not found" });
                    }

                    return status(200, schedule);
                } catch (error) {
                    console.error("[attendance.routes] Error getting schedule:", error);
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                params: t.Object({
                    scheduleId: t.String({ format: "uuid" }),
                }),
                detail: {
                    summary: "Get attendance schedule",
                    description: "Returns appointment details for the attendance screen.",
                    tags: ["Attendance"],
                },
                response: {
                    200: attendanceScheduleDetailsSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    400: t.Union([
                        t.Object({ message: t.Literal("Selecione uma clínica para continuar") }),
                        t.Object({ message: t.Literal("Selecione um profissional para continuar") }),
                    ]),
                    404: t.Object({ message: t.Literal("Schedule not found") }),
                    500: attendanceErrorSchema,
                },
            },
        )
        .patch(
            "/schedules/:scheduleId/status",
            async (context) => {
                const { params, body, status } = context;
                const { userId, unitId, professionalUnitId } = resolveContext(context as { request: Request; user?: { id?: string } });

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                if (!unitId) {
                    return status(400, { message: "Selecione uma clínica para continuar" });
                }

                if (!professionalUnitId) {
                    return status(400, { message: "Selecione um profissional para continuar" });
                }

                try {
                    const updated = await attendanceRepository.updateScheduleStatus(params.scheduleId, body.status, unitId, professionalUnitId);

                    if (!updated) {
                        return status(404, { message: "Schedule not found" });
                    }

                    return status(200, updated);
                } catch (error) {
                    console.error("[attendance.routes] Error updating schedule status:", error);
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                params: t.Object({
                    scheduleId: t.String({ format: "uuid" }),
                }),
                body: updateAttendanceScheduleStatusSchema,
                detail: {
                    summary: "Update attendance schedule status",
                    description: "Updates appointment status for attendance workflow.",
                    tags: ["Attendance"],
                },
                response: {
                    200: updateAttendanceScheduleStatusResponseSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    400: t.Union([
                        t.Object({ message: t.Literal("Selecione uma clínica para continuar") }),
                        t.Object({ message: t.Literal("Selecione um profissional para continuar") }),
                    ]),
                    404: t.Object({ message: t.Literal("Schedule not found") }),
                    500: attendanceErrorSchema,
                },
            },
        );
};
