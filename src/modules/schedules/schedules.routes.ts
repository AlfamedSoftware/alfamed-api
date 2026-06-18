import { Elysia, t } from "elysia";
import { SchedulesRepository } from "./schedules.repository.js";
import { SchedulesService } from "./schedules.service.js";
import { getAuthenticatedUserId } from "../../http/plugins/unit-access.js";
import type { db as dbType } from "../../db/client.js";
import {
    listFullAvailableScheduleSlotsSchema,
    schedulesErrorSchema,
} from "./schedules.schemas.js";

type DatabaseClient = typeof dbType;

type SchedulesRoutesOptions = {
    db: DatabaseClient;
};

export const schedulesRoutes = ({ db }: SchedulesRoutesOptions) => {
    const schedulesRepository = new SchedulesRepository(db);
    const schedulesService = new SchedulesService(schedulesRepository);

    return new Elysia({ name: "schedules-routes", prefix: "/schedules" })
        .get(
            "/list-full-available-schedule-slots",
            async (context) => {
                const { query, status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });

                if (!userId) {
                    return status(401, { message: "Não autorizado" });
                }

                try {
                    const result = await schedulesService.listFullAvailableScheduleSlots({
                        date: query.date,
                        professionalUnitId: query.professionalUnitId,
                        specialtyId: query.specialtyId,
                        isActive: query.isActive,
                        isAvailable: query.isAvailable,
                    });
                    return status(200, result);
                } catch (error) {
                    console.error("[schedules.routes] Error listing available schedule slots:", error);
                    return status(500, { message: "Erro interno do servidor" });
                }
            },
            {
                auth: true,
                query: t.Object({
                    date: t.String(),
                    professionalUnitId: t.Optional(t.String()),
                    specialtyId: t.Optional(t.String()),
                    isActive: t.Optional(t.Boolean()),
                    isAvailable: t.Optional(t.Boolean()),
                }),
                detail: {
                    summary: "List full available schedule slots",
                    description: "Returns available schedule slots with full data including users, professional units, and specialties.",
                    tags: ["Schedules"],
                },
                response: {
                    200: listFullAvailableScheduleSlotsSchema,
                    401: t.Object({ message: t.Literal("Não autorizado") }),
                    500: schedulesErrorSchema,
                },
            },
        );
};
