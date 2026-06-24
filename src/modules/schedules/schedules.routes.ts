import { Elysia, t } from "elysia";
import { SchedulesRepository } from "./schedules.repository.js";
import { SchedulesService, ScheduleConflictError, ScheduleOverflowError } from "./schedules.service.js";
import { getAuthenticatedUserId } from "../../http/plugins/unit-access.js";
import type { db as dbType } from "../../db/client.js";
import {
    listFullAvailableScheduleSlotsSchema,
    schedulesErrorSchema,
    fullSlotDetailSchema,
    createScheduleResponseSchema,
} from "./schedules.schemas.js";

type DatabaseClient = typeof dbType;

type SchedulesRoutesOptions = {
    db: DatabaseClient;
};

export const schedulesRoutes = ({ db }: SchedulesRoutesOptions) => {
    const schedulesRepository = new SchedulesRepository(db);
    const schedulesService = new SchedulesService(schedulesRepository);

    return new Elysia({ name: "schedules-routes", prefix: "/schedules" })
        .post(
            "/",
            async (context) => {
                const { body, status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });

                if (!userId) {
                    return status(401, { message: "Não autorizado" });
                }

                try {
                    const schedule = await schedulesService.createSchedule({
                        professionalUnitId: body.professionalUnitId,
                        isActive: body.isActive,
                        startTime: body.startTime,
                        specialtyId: body.specialtyId,
                        slots: body.slots,
                        date: body.date,
                        durationMinutes: body.durationMinutes,
                        procedureId: body.procedureId,
                    });
                    return status(201, {
                        id: schedule.id,
                        professionalUnitId: schedule.professionalUnitId,
                        specialtyId: schedule.specialtyId,
                        procedureId: schedule.procedureId,
                        slots: schedule.slots,
                        emptySlots: schedule.emptySlots,
                        allocatedSlots: schedule.allocatedSlots,
                        date: schedule.date,
                        startTime: schedule.startTime,
                        endTime: schedule.endTime,
                        durationMinutes: schedule.durationMinutes,
                        isActive: schedule.isActive,
                        createdAt: schedule.createdAt.toISOString(),
                        updatedAt: schedule.updatedAt.toISOString(),
                    });
                } catch (error) {
                    if (error instanceof ScheduleConflictError) {
                        return status(409, {
                            message: `${error.professionalName} já possui uma agenda na unidade ${error.unitName} das ${error.conflictStartTime} às ${error.conflictEndTime}.`,
                        });
                    }
                    if (error instanceof ScheduleOverflowError) {
                        return status(422, {
                            message: `Ultrapassa a meia-noite. Máximo de ${error.maxSlots} vagas para este horário e duração.`,
                            maxSlots: error.maxSlots,
                        });
                    }
                    console.error("[schedules.routes] Error creating schedule:", error);
                    return status(500, { message: "Erro interno do servidor" });
                }
            },
            {
                auth: true,
                body: t.Object({
                    professionalUnitId: t.String({ format: "uuid" }),
                    isActive: t.Boolean(),
                    startTime: t.String(),
                    specialtyId: t.String({ format: "uuid" }),
                    slots: t.Integer({ minimum: 1 }),
                    date: t.String(),
                    durationMinutes: t.Integer({ minimum: 1 }),
                    procedureId: t.String({ format: "uuid" }),
                }),
                detail: {
                    summary: "Create schedule",
                    description: "Creates a new schedule. emptySlots is set to slots and allocatedSlots to 0.",
                    tags: ["Schedules"],
                },
                response: {
                    201: createScheduleResponseSchema,
                    401: t.Object({ message: t.Literal("Não autorizado") }),
                    409: t.Object({ message: t.String() }),
                    422: t.Object({ message: t.String(), maxSlots: t.Number() }),
                    500: schedulesErrorSchema,
                },
            },
        )
        .get(
            "/list-full-schedule-slots",
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
                    summary: "List full schedule slots",
                    description: "Returns schedule and it's slots with full data including users, professional units, and specialties.",
                    tags: ["Schedules"],
                },
                response: {
                    200: listFullAvailableScheduleSlotsSchema,
                    401: t.Object({ message: t.Literal("Não autorizado") }),
                    500: schedulesErrorSchema,
                },
            },
        )
        .get(
            "/full-slot/:id",
            async (context) => {
                const { params, status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });

                if (!userId) {
                    return status(401, { message: "Não autorizado" });
                }

                try {
                    const result = await schedulesService.getFullSlotDetailById(params.id);
                    return status(200, result);
                } catch (error) {
                    console.error("[schedules.routes] Error getting full slot detail:", error);
                    if (error instanceof Error && error.message === "Vaga não encontrada") {
                        return status(404, { message: "Vaga não encontrada" });
                    }
                    return status(500, { message: "Erro interno do servidor" });
                }
            },
            {
                auth: true,
                params: t.Object({
                    id: t.String(),
                }),
                detail: {
                    summary: "Get full slot detail",
                    description: "Returns complete slot information with schedule, user, professional unit, unit, and specialty data.",
                    tags: ["Schedules"],
                },
                response: {
                    200: fullSlotDetailSchema,
                    401: t.Object({ message: t.Literal("Não autorizado") }),
                    404: t.Object({ message: t.Literal("Vaga não encontrada") }),
                    500: schedulesErrorSchema,
                },
            },
        )
        .get(
            "/check-availability/:scheduleSlotId",
            async (context) => {
                const { params, status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });

                if (!userId) {
                    return status(401, { message: "Não autorizado" });
                }

                try {
                    const isAvailable = await schedulesService.checkSlotAvailability(params.scheduleSlotId);
                    return status(200, { isAvailable });
                } catch (error) {
                    console.error("[schedules.routes] Error checking slot availability:", error);
                    return status(500, { message: "Erro interno do servidor" });
                }
            },
            {
                auth: true,
                params: t.Object({
                    scheduleSlotId: t.String(),
                }),
                detail: {
                    summary: "Check slot availability",
                    description: "Returns true if the slot is available, false otherwise.",
                    tags: ["Schedules"],
                },
                response: {
                    200: t.Object({ isAvailable: t.Boolean() }),
                    401: t.Object({ message: t.Literal("Não autorizado") }),
                    500: schedulesErrorSchema,
                },
            },
        );
};
