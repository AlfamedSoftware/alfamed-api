import { Elysia, t } from "elysia";
import { z } from "zod";
import type { AppointmentStatusRepository } from "./appointment-status.repository.js";
import { AppointmentStatusService } from "./appointment-status.service.js";
import {
    appointmentStatusSchema,
    appointmentStatusErrorSchema,
} from "./appointment-status.schemas.js";

type AppointmentStatusRoutesOptions = {
    appointmentStatusRepository: AppointmentStatusRepository;
};

export const appointmentStatusRoutes = ({ appointmentStatusRepository }: AppointmentStatusRoutesOptions) => {
    const appointmentStatusService = new AppointmentStatusService(appointmentStatusRepository);

    return new Elysia({ name: "appointment-status-routes", prefix: "/appointment-status" })
        .get(
            "/",
            async ({ query, status }) => {
                try {
                    const statuses = await appointmentStatusService.listAppointmentStatus({
                        isActive: query.isActive,
                    });

                    return status(200, statuses);
                } catch (error) {
                    console.error("[appointment-status][list]", error);

                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                query: t.Object({
                    isActive: t.Optional(t.BooleanString()),
                }),
                detail: {
                    summary: "List appointment statuses",
                    description: "Returns appointment statuses, optionally filtered by active status.",
                    tags: ["Appointment Status"],
                },
                response: {
                    200: z.array(appointmentStatusSchema),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    500: appointmentStatusErrorSchema,
                },
            },
        );
};
