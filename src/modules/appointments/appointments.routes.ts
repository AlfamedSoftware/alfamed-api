import { Elysia, t } from "elysia";
import { getAuthenticatedUserId } from "../../http/plugins/unit-access.js";
import { getUnitIdFromRequest, getProfessionalUnitIdFromRequest } from "../../http/plugins/unit-context.js";
import type { db as dbType } from "../../db/client.js";
import { AppointmentsRepository } from "./appointments.repository.js";
import {
    appointmentAvailabilityResponseSchema,
    appointmentEventSchema,
    appointmentsErrorSchema,
    availabilityQuerySchema,
    calendarEventsQuerySchema,
    createAppointmentSchema,
} from "./appointments.schemas.js";

type DatabaseClient = typeof dbType;

type AppointmentsRoutesOptions = {
    db: DatabaseClient;
};

export const appointmentsRoutes = ({ db }: AppointmentsRoutesOptions) => {
    const appointmentsRepository = new AppointmentsRepository(db);

    return new Elysia({ name: "appointments-routes", prefix: "/appointments" })
        .get(
            "/events",
            async (context) => {
                const { query, status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });
                const unitId = getUnitIdFromRequest(context.request);

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                if (!unitId) {
                    return status(400, { message: "Selecione uma clínica para continuar" });
                }

                try {
                    const events = await appointmentsRepository.listAgendaEvents(query, unitId);
                    return status(200, events);
                } catch (error) {
                    console.error("[appointments.routes] Error listing events:", error);
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                query: calendarEventsQuerySchema,
                detail: {
                    summary: "List agenda events",
                    description: "Returns appointments and blocks for the selected unit and professionals.",
                    tags: ["Appointments"],
                },
                response: {
                    200: appointmentEventSchema.array(),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    400: t.Object({ message: t.Literal("Selecione uma clínica para continuar") }),
                    500: appointmentsErrorSchema,
                },
            },
        )
        .get(
            "/availability",
            async (context) => {
                const { query, status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });
                const unitId = getUnitIdFromRequest(context.request);

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                if (!unitId) {
                    return status(400, { message: "Selecione uma clínica para continuar" });
                }

                try {
                    const availability = await appointmentsRepository.checkAvailability(query, unitId);
                    return status(200, {
                        available: availability.available,
                        windows: availability.windows.map((window) => ({
                            start: window.start.toISOString(),
                            end: window.end.toISOString(),
                        })),
                    });
                } catch (error) {
                    console.error("[appointments.routes] Error checking availability:", error);
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                query: availabilityQuerySchema,
                detail: {
                    summary: "Check availability",
                    description: "Returns whether the requested interval is available and the free windows in the day.",
                    tags: ["Appointments"],
                },
                response: {
                    200: appointmentAvailabilityResponseSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    400: t.Object({ message: t.Literal("Selecione uma clínica para continuar") }),
                    500: appointmentsErrorSchema,
                },
            },
        )
        .post(
            "/",
            async (context) => {
                const { body, status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });
                const unitId = getUnitIdFromRequest(context.request);
                const currentProfessionalUnitId = getProfessionalUnitIdFromRequest(context.request);

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                if (!unitId) {
                    return status(400, { message: "Selecione uma clínica para continuar" });
                }

                try {
                    let professionalId = body.professionalId ?? null;

                    if (!professionalId) {
                        if (!currentProfessionalUnitId) {
                            return status(400, { message: "Selecione um profissional para continuar" });
                        }

                        const professionalUnit = await appointmentsRepository.findProfessionalUnitById(currentProfessionalUnitId);

                        if (!professionalUnit || professionalUnit.unitId !== unitId) {
                            return status(403, { message: "Forbidden" });
                        }

                        professionalId = professionalUnit.professionalId;
                    }

                    if (!professionalId) {
                        return status(400, { message: "Selecione um profissional para continuar" });
                    }

                    const appointment = await appointmentsRepository.createAppointment(
                        {
                            ...body,
                            professionalId,
                        },
                        unitId,
                    );

                    return status(201, appointment);
                } catch (error) {
                    console.error("[appointments.routes] Error creating appointment:", error);
                    return status(409, { message: error instanceof Error ? error.message : "Schedule is not available" });
                }
            },
            {
                auth: true,
                body: createAppointmentSchema,
                detail: {
                    summary: "Create appointment",
                    description: "Creates an appointment for a patient and a professional.",
                    tags: ["Appointments"],
                },
                response: {
                    201: t.Object({
                        id: t.String({ format: "uuid" }),
                        patientId: t.String({ format: "uuid" }),
                        professionalUnitId: t.String({ format: "uuid" }),
                        startAt: t.Date(),
                        endAt: t.Date(),
                    }),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    400: t.Union([
                        t.Object({ message: t.Literal("Selecione uma clínica para continuar") }),
                        t.Object({ message: t.Literal("Selecione um profissional para continuar") }),
                    ]),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    409: t.Object({ message: t.String() }),
                    500: appointmentsErrorSchema,
                },
            },
        )
        .get(
            "/:id",
            async (context) => {
                const { params, status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });
                const unitId = getUnitIdFromRequest(context.request);

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                if (!unitId) {
                    return status(400, { message: "Selecione uma clínica para continuar" });
                }

                try {
                    const appointment = await appointmentsRepository.getAppointmentById(params.id, unitId);

                    if (!appointment) {
                        return status(404, { message: "Appointment not found" });
                    }

                    return status(200, appointment);
                } catch (error) {
                    console.error("[appointments.routes] Error getting appointment:", error);
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                detail: {
                    summary: "Get appointment",
                    description: "Returns appointment details.",
                    tags: ["Appointments"],
                },
                response: {
                    200: t.Object({
                        id: t.String({ format: "uuid" }),
                        patientId: t.String({ format: "uuid" }),
                        professionalUnitId: t.String({ format: "uuid" }),
                        startAt: t.Date(),
                        endAt: t.Date(),
                        reason: t.Optional(t.String()),
                        professionalId: t.String({ format: "uuid" }),
                    }),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    400: t.Object({ message: t.Literal("Selecione uma clínica para continuar") }),
                    404: t.Object({ message: t.Literal("Appointment not found") }),
                    500: appointmentsErrorSchema,
                },
            },
        )
        .put(
            "/:id",
            async (context) => {
                const { params, body, status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });
                const unitId = getUnitIdFromRequest(context.request);

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                if (!unitId) {
                    return status(400, { message: "Selecione uma clínica para continuar" });
                }

                try {
                    const appointment = await appointmentsRepository.updateAppointment(params.id, body, unitId);
                    return status(200, appointment);
                } catch (error) {
                    console.error("[appointments.routes] Error updating appointment:", error);
                    const message = error instanceof Error ? error.message : "Internal server error";

                    if (message === "Appointment not found") {
                        return status(404, { message });
                    }

                    if (message.includes("not available")) {
                        return status(409, { message });
                    }

                    return status(500, { message });
                }
            },
            {
                auth: true,
                body: t.Partial(
                    t.Object({
                        patientId: t.String({ format: "uuid" }),
                        startAt: t.Date(),
                        endAt: t.Date(),
                        reason: t.Union([t.String(), t.Null()]),
                    }),
                ),
                detail: {
                    summary: "Update appointment",
                    description: "Updates an appointment.",
                    tags: ["Appointments"],
                },
                response: {
                    200: t.Object({
                        id: t.String({ format: "uuid" }),
                        patientId: t.String({ format: "uuid" }),
                        professionalUnitId: t.String({ format: "uuid" }),
                        startAt: t.Date(),
                        endAt: t.Date(),
                    }),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    400: t.Object({ message: t.Literal("Selecione uma clínica para continuar") }),
                    404: t.Object({ message: t.Literal("Appointment not found") }),
                    409: t.Object({ message: t.String() }),
                    500: appointmentsErrorSchema,
                },
            },
        )
        .delete(
            "/:id",
            async (context) => {
                const { params, status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });
                const unitId = getUnitIdFromRequest(context.request);

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                if (!unitId) {
                    return status(400, { message: "Selecione uma clínica para continuar" });
                }

                try {
                    const existing = await appointmentsRepository.getAppointmentById(params.id, unitId);

                    if (!existing) {
                        return status(404, { message: "Appointment not found" });
                    }

                    // Soft delete
                    await appointmentsRepository.deleteAppointment(params.id);
                    return status(200, { success: true });
                } catch (error) {
                    console.error("[appointments.routes] Error deleting appointment:", error);
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                detail: {
                    summary: "Delete appointment",
                    description: "Deletes an appointment.",
                    tags: ["Appointments"],
                },
                response: {
                    200: t.Object({ success: t.Boolean() }),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    400: t.Object({ message: t.Literal("Selecione uma clínica para continuar") }),
                    404: t.Object({ message: t.Literal("Appointment not found") }),
                    500: appointmentsErrorSchema,
                },
            },
        );
};