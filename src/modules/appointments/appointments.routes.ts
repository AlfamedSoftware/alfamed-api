import { Elysia, t } from "elysia";
import { isDomainError } from "../../http/plugins/domain-error.js";
import { getAuthenticatedUserId } from "../../http/plugins/unit-access.js";
import { getClinicIdFromRequest } from "../../http/plugins/clinic-context.js";
import type { AppointmentsRepository } from "./appointments.repository.js";
import { AppointmentsService, isConflictDomainError } from "./appointments.service.js";
import {
    appointmentRequestProfileSchema,
    appointmentsErrorSchema,
    availabilityQuerySchema,
    counterProposalSchema,
    createAppointmentRequestSchema,
    createScheduleSchema,
    scheduleProfileSchema,
    updateScheduleSchema,
} from "./appointments.schemas.js";
import { any } from "zod";

type AppointmentsRoutesOptions = {
    appointmentsRepository: AppointmentsRepository;
    hasUserAccessToUnitChecker: (userId: string, unitId: string) => Promise<boolean>;
    getUserUnitIdsByUserId?: (userId: string) => Promise<string[]>;
};

export const appointmentsRoutes = ({
    appointmentsRepository,
    hasUserAccessToUnitChecker,
    getUserUnitIdsByUserId,
}: AppointmentsRoutesOptions) => {
    const appointmentsService = new AppointmentsService(appointmentsRepository, hasUserAccessToUnitChecker);

    const getUserId = (context: { user?: { id?: string } }) => getAuthenticatedUserId(context);

    const resolveUnitId = async (context: { request: Request; user?: { id?: string } }) => {
        const userId = getUserId(context);

        if (!userId) {
            return { error: "unauthorized" as const };
        }

        const selectedClinicId = getClinicIdFromRequest(context.request);

        if (selectedClinicId) {
            return { userId, unitId: selectedClinicId };
        }

        return { error: "invalid_unit" as const };
    };

    return new Elysia({ name: "appointments-routes", prefix: "/appointments" })
        .post(
            "/schedules",
            async (context) => {
                const { body, status } = context;
                const scope = await resolveUnitId(context as { request: Request; user?: { id?: string } });

                if ("error" in scope) {
                    if (scope.error === "unauthorized") {
                        return status(401, { message: "Unauthorized" });
                    }

                    return status(400, { message: "Selecione uma clínica para continuar" });
                }

                try {
                    const created = await appointmentsService.createSchedule(scope.userId, scope.unitId, body);
                    return status(201, created);
                } catch (error) {
                    if (isDomainError(error, "FORBIDDEN")) {
                        return status(403, { message: "Forbidden" });
                    }
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                body: createScheduleSchema,
                detail: {
                    summary: "Create schedule slot",
                    description: "Creates professional schedule slots for the selected unit.",
                    tags: ["Appointments"],
                },
                response: {
                    201: scheduleProfileSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    400: t.Object({ message: t.Literal("Selecione uma clínica para continuar") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    500: appointmentsErrorSchema,
                },
            },
        )
        .patch(
            "/schedules/:id",
            async (context) => {
                const { body, params, status } = context;
                const userId = getUserId(context as { user?: { id?: string } });

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                try {
                    const updated = await appointmentsService.updateSchedule(userId, params.id, body);
                    return status(200, updated);
                } catch (error) {
                    if (isDomainError(error, "FORBIDDEN")) {
                        return status(403, { message: "Forbidden" });
                    }
                    if (isDomainError(error, "SCHEDULE_NOT_FOUND")) {
                        return status(404, { message: "Schedule not found" });
                    }
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                params: t.Object({
                    id: t.String({ format: "uuid" }),
                }),
                body: updateScheduleSchema,
                detail: {
                    summary: "Update schedule slot",
                    description: "Updates schedule slot details when the requester owns the professional schedule.",
                    tags: ["Appointments"],
                },
                response: {
                    200: scheduleProfileSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    404: t.Object({ message: t.Literal("Schedule not found") }),
                    500: appointmentsErrorSchema,
                },
            },
        )
        .get(
            "/availability",
            async (context) => {
                const { query, status } = context;

                try {
                    const availability = await appointmentsService.listAvailability(query);
                    return status(200, availability);
                } catch {
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                query: availabilityQuerySchema,
                detail: {
                    summary: "List available schedule slots",
                    description: "Lists active schedule slots with available capacity for a unit.",
                    tags: ["Appointments"],
                },
                response: {
                    200: scheduleProfileSchema.array(),
                    500: appointmentsErrorSchema,
                },
            },
        )
        .post(
            "/requests",
            async (context) => {
                const { body, status } = context;
                const userId = getUserId(context as { user?: { id?: string } });

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                try {
                    const created = await appointmentsService.createAppointmentRequest(userId, body.scheduleId);
                    return status(201, created);
                } catch (error) {
                    if (isDomainError(error, "FORBIDDEN")) {
                        return status(403, { message: "Forbidden" });
                    }
                    if (isDomainError(error, "SCHEDULE_NOT_FOUND")) {
                        return status(404, { message: "Schedule not found" });
                    }
                    if (isConflictDomainError(error)) {
                        return status(409, { message: "Schedule is not available" });
                    }
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                body: createAppointmentRequestSchema,
                detail: {
                    summary: "Create appointment request",
                    description: "Creates a booking request for the authenticated patient.",
                    tags: ["Appointments"],
                },
                response: {
                    201: appointmentRequestProfileSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    404: t.Object({ message: t.Literal("Schedule not found") }),
                    409: t.Object({ message: t.Literal("Schedule is not available") }),
                    500: appointmentsErrorSchema,
                },
            },
        )
        .get(
            "/requests/:id",
            async (context) => {
                const { params, status } = context;
                const userId = getUserId(context as { user?: { id?: string } });

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                try {
                    const request = await appointmentsService.getAppointmentRequest(userId, params.id);
                    return status(200, request as any);
                } catch (error) {
                    if (isDomainError(error, "FORBIDDEN")) {
                        return status(403, { message: "Forbidden" });
                    }
                    if (isDomainError(error, "REQUEST_NOT_FOUND")) {
                        return status(404, { message: "Request not found" });
                    }
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                params: t.Object({
                    id: t.String({ format: "uuid" }),
                }),
                detail: {
                    summary: "Get appointment request by id",
                    description: "Returns an appointment request when the requester has permission to view it.",
                    tags: ["Appointments"],
                },
                response: {
                    200: appointmentRequestProfileSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    404: t.Object({ message: t.Literal("Request not found") }),
                    500: appointmentsErrorSchema,
                },
            },
        )
        .patch(
            "/requests/:id/confirm",
            async (context) => {
                const { params, status } = context;
                const userId = getUserId(context as { user?: { id?: string } });

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                try {
                    await appointmentsService.confirmRequest(userId, params.id);
                    return status(200, { message: "Request confirmed" });
                } catch (error) {
                    if (isDomainError(error, "FORBIDDEN")) return status(403, { message: "Forbidden" });
                    if (isDomainError(error, "REQUEST_NOT_FOUND")) return status(404, { message: "Request not found" });
                    if (isConflictDomainError(error)) return status(409, { message: "Invalid request status transition" });
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                params: t.Object({ id: t.String({ format: "uuid" }) }),
                detail: {
                    summary: "Confirm appointment request",
                    description: "Professional confirms a pending appointment request.",
                    tags: ["Appointments"],
                },
                response: {
                    200: t.Object({ message: t.Literal("Request confirmed") }),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    404: t.Object({ message: t.Literal("Request not found") }),
                    409: t.Object({ message: t.Literal("Invalid request status transition") }),
                    500: appointmentsErrorSchema,
                },
            },
        )
        .patch(
            "/requests/:id/reject",
            async (context) => {
                const { params, status } = context;
                const userId = getUserId(context as { user?: { id?: string } });

                if (!userId) return status(401, { message: "Unauthorized" });

                try {
                    await appointmentsService.rejectRequest(userId, params.id);
                    return status(200, { message: "Request rejected" });
                } catch (error) {
                    if (isDomainError(error, "FORBIDDEN")) return status(403, { message: "Forbidden" });
                    if (isDomainError(error, "REQUEST_NOT_FOUND")) return status(404, { message: "Request not found" });
                    if (isConflictDomainError(error)) return status(409, { message: "Invalid request status transition" });
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                params: t.Object({ id: t.String({ format: "uuid" }) }),
                detail: {
                    summary: "Reject appointment request",
                    description: "Professional rejects a request.",
                    tags: ["Appointments"],
                },
                response: {
                    200: t.Object({ message: t.Literal("Request rejected") }),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    404: t.Object({ message: t.Literal("Request not found") }),
                    409: t.Object({ message: t.Literal("Invalid request status transition") }),
                    500: appointmentsErrorSchema,
                },
            },
        )
        .patch(
            "/requests/:id/counter-propose",
            async (context) => {
                const { params, body, status } = context;
                const userId = getUserId(context as { user?: { id?: string } });

                if (!userId) return status(401, { message: "Unauthorized" });

                try {
                    await appointmentsService.counterProposeRequest(
                        userId,
                        params.id,
                        body.proposedScheduleId,
                        body.observation,
                    );
                    return status(200, { message: "Counter proposal sent" });
                } catch (error) {
                    if (isDomainError(error, "FORBIDDEN")) return status(403, { message: "Forbidden" });
                    if (isDomainError(error, "REQUEST_NOT_FOUND")) return status(404, { message: "Request not found" });
                    if (isDomainError(error, "SCHEDULE_NOT_FOUND")) return status(404, { message: "Schedule not found" });
                    if (isConflictDomainError(error)) return status(409, { message: "Invalid counter proposal" });
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                params: t.Object({ id: t.String({ format: "uuid" }) }),
                body: counterProposalSchema,
                detail: {
                    summary: "Counter propose appointment request",
                    description: "Professional proposes another schedule for the appointment request.",
                    tags: ["Appointments"],
                },
                response: {
                    200: t.Object({ message: t.Literal("Counter proposal sent") }),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    404: t.Union([
                        t.Object({ message: t.Literal("Request not found") }),
                        t.Object({ message: t.Literal("Schedule not found") }),
                    ]),
                    409: t.Object({ message: t.Literal("Invalid counter proposal") }),
                    500: appointmentsErrorSchema,
                },
            },
        )
        .patch(
            "/requests/:id/patient-accept",
            async (context) => {
                const { params, status } = context;
                const userId = getUserId(context as { user?: { id?: string } });

                if (!userId) return status(401, { message: "Unauthorized" });

                try {
                    await appointmentsService.patientAcceptCounterProposal(userId, params.id);
                    return status(200, { message: "Counter proposal accepted" });
                } catch (error) {
                    if (isDomainError(error, "FORBIDDEN")) return status(403, { message: "Forbidden" });
                    if (isDomainError(error, "REQUEST_NOT_FOUND")) return status(404, { message: "Request not found" });
                    if (isConflictDomainError(error) || isDomainError(error, "SCHEDULE_NOT_FOUND")) {
                        return status(409, { message: "Unable to accept counter proposal" });
                    }
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                params: t.Object({ id: t.String({ format: "uuid" }) }),
                detail: {
                    summary: "Patient accepts counter proposal",
                    description: "Patient accepts a professional counter proposal.",
                    tags: ["Appointments"],
                },
                response: {
                    200: t.Object({ message: t.Literal("Counter proposal accepted") }),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    404: t.Object({ message: t.Literal("Request not found") }),
                    409: t.Object({ message: t.Literal("Unable to accept counter proposal") }),
                    500: appointmentsErrorSchema,
                },
            },
        )
        .patch(
            "/requests/:id/patient-reject",
            async (context) => {
                const { params, status } = context;
                const userId = getUserId(context as { user?: { id?: string } });

                if (!userId) return status(401, { message: "Unauthorized" });

                try {
                    await appointmentsService.patientRejectCounterProposal(userId, params.id);
                    return status(200, { message: "Counter proposal rejected" });
                } catch (error) {
                    if (isDomainError(error, "FORBIDDEN")) return status(403, { message: "Forbidden" });
                    if (isDomainError(error, "REQUEST_NOT_FOUND")) return status(404, { message: "Request not found" });
                    if (isConflictDomainError(error)) return status(409, { message: "Invalid request status transition" });
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                params: t.Object({ id: t.String({ format: "uuid" }) }),
                detail: {
                    summary: "Patient rejects counter proposal",
                    description: "Patient rejects a professional counter proposal.",
                    tags: ["Appointments"],
                },
                response: {
                    200: t.Object({ message: t.Literal("Counter proposal rejected") }),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    404: t.Object({ message: t.Literal("Request not found") }),
                    409: t.Object({ message: t.Literal("Invalid request status transition") }),
                    500: appointmentsErrorSchema,
                },
            },
        );
};
