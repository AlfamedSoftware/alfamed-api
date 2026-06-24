import { Elysia, t } from "elysia";
import { getAuthenticatedUserId } from "../../http/plugins/unit-access.js";
import { isDomainError } from "../../http/plugins/domain-error.js";
import type { AppointmentsRepository } from "./appointments.repository.js";
import { AppointmentsService } from "./appointments.service.js";
import type { SchedulesRepository } from "../schedules/schedules.repository.js";
import {
    appointmentsErrorSchema,
    createAppointmentSchema,
    updateAppointmentSchema,
    appointmentSchema,
} from "./appointments.schemas.js";

type AppointmentsRoutesOptions = {
    appointmentsRepository: AppointmentsRepository;
    schedulesRepository: SchedulesRepository;
};

export const appointmentsRoutes = ({
    appointmentsRepository,
    schedulesRepository,
}: AppointmentsRoutesOptions) => {
    const appointmentsService = new AppointmentsService(
        appointmentsRepository,
        schedulesRepository,
    );

    return new Elysia({ name: "appointments-routes", prefix: "/appointments" })
        .post(
            "/",
            async (context) => {
                const { body, status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                try {
                    const { scheduleSlotId } = body as { scheduleSlotId: string };
                    const isAvailable = await schedulesRepository.checkSlotAvailability(scheduleSlotId);

                    if (!isAvailable) {
                        return status(409, { message: "Essa vaga não está mais disponivel para o agendamento" });
                    }

                    const created = await appointmentsService.createAppointment(body as any);
                    return status(201, created);
                } catch (error) {
                    if (isDomainError(error, "FORBIDDEN")) {
                        return status(403, { message: "Forbidden" });
                    }

                    if (error instanceof Error && error.message === "SELF_BOOKING_FORBIDDEN") {
                        return status(404, { message: "Profissional não pode se auto agendar" });
                    }

                    if (error instanceof Error && error.message === "SLOT_PAST") {
                        return status(410, { message: "Não é possível agendar uma consulta que já passou" });
                    }

                    if (error instanceof Error && error.message === "SLOT_TOO_SOON") {
                        return status(422, { message: "Não é possível agendar com menos de 30 minutos de antecedência" });
                    }

                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                body: createAppointmentSchema,
                detail: {
                    summary: "Create appointment",
                    description: "Creates a new appointment.",
                    tags: ["Appointments"],
                },
                response: {
                    201: appointmentSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    404: t.Object({ message: t.Literal("Profissional não pode se auto agendar") }),
                    409: t.Object({ message: t.Literal("Essa vaga não está mais disponivel para o agendamento") }),
                    410: t.Object({ message: t.Literal("Não é possível agendar uma consulta que já passou") }),
                    422: t.Object({ message: t.Literal("Não é possível agendar com menos de 30 minutos de antecedência") }),
                    500: appointmentsErrorSchema,
                },
            },
        )
        .patch(
            "/:id",
            async (context) => {
                const { params, body, status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                try {
                    const updated = await appointmentsService.updateAppointment(params.id, body as any);
                    return status(200, updated);
                } catch (error) {
                    if (isDomainError(error, "FORBIDDEN")) {
                        return status(403, { message: "Forbidden" });
                    }

                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                params: t.Object({
                    id: t.String({ format: "uuid" }),
                }),
                body: updateAppointmentSchema,
                detail: {
                    summary: "Update appointment",
                    description: "Updates an existing appointment.",
                    tags: ["Appointments"],
                },
                response: {
                    200: appointmentSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    500: appointmentsErrorSchema,
                },
            },
        )
};