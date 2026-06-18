import { Elysia, t } from "elysia";
import { isDomainError } from "../../http/plugins/domain-error.js";
import { getAuthenticatedUserId } from "../../http/plugins/unit-access.js";
import type { IPatientAppointmentsRepository } from "./patient-appointments.repository.js";
import { PatientAppointmentsRepository } from "./patient-appointments.repository.js";
import { PatientAppointmentsService } from "./patient-appointments.service.js";
import {
    patientAppointmentResponseSchema,
    patientAppointmentsErrorSchema,
    slotResponseSchema,
} from "./patient-appointments.schemas.js";
import type { db as dbType } from "../../db/client.js";

type DatabaseClient = typeof dbType;

type PatientAppointmentsRoutesOptions = {
    db: DatabaseClient;
    patientAppointmentsRepository?: IPatientAppointmentsRepository;
};

export const patientAppointmentsRoutes = ({ db, patientAppointmentsRepository }: PatientAppointmentsRoutesOptions) => {
    const repository = patientAppointmentsRepository ?? new PatientAppointmentsRepository(db);
    const service = new PatientAppointmentsService(repository);

    return new Elysia({ name: "patient-appointments-routes", prefix: "/patient-appointments" })
        .get(
            "/slots",
            async (context) => {
                const { query, status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });

                if (!userId) return status(401, { message: "Não autorizado" });

                const { professionalId, unitId, date } = query as { professionalId: string; unitId: string; date: string };

                if (!professionalId || !unitId || !date) {
                    return status(400, { message: "professionalId, unitId e date são obrigatórios" });
                }

                if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                    return status(400, { message: "date deve estar no formato YYYY-MM-DD" });
                }

                try {
                    const slots = await service.getSlots(professionalId, unitId, date);
                    return status(200, slots);
                } catch (error) {
                    if (isDomainError(error, "PROFESSIONAL_UNIT_NOT_FOUND")) {
                        return status(404, { message: "Profissional não encontrado" });
                    }
                    console.error("[patient-appointments.routes] Error getting slots:", error);
                    return status(500, { message: "Erro interno do servidor" });
                }
            },
            {
                auth: true,
                query: t.Object({
                    professionalId: t.String({ format: "uuid" }),
                    unitId: t.String({ format: "uuid" }),
                    date: t.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }),
                }),
                detail: {
                    summary: "List available slots",
                    description: "Returns all time slots for a professional on a given date, with availability status.",
                    tags: ["Patient Appointments"],
                },
                response: {
                    200: t.Array(slotResponseSchema),
                    400: t.Object({ message: t.String() }),
                    401: t.Object({ message: t.Literal("Não autorizado") }),
                    404: t.Object({ message: t.String() }),
                    500: patientAppointmentsErrorSchema,
                },
            },
        )
        .post(
            "/",
            async (context) => {
                const { body, status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });

                if (!userId) return status(401, { message: "Não autorizado" });

                try {
                    const appointment = await service.bookSlot(userId, body as any);
                    return status(201, appointment);
                } catch (error) {
                    if (isDomainError(error, "PATIENT_NOT_FOUND")) {
                        return status(404, { message: "Paciente não encontrado" });
                    }
                    if (isDomainError(error, "PROFESSIONAL_UNIT_NOT_FOUND")) {
                        return status(404, { message: "Profissional não encontrado" });
                    }
                    if (isDomainError(error, "NO_SLOTS_AVAILABLE")) {
                        return status(409, { message: "Horário não disponível" });
                    }
                    console.error("[patient-appointments.routes] Error booking slot:", error);
                    return status(500, { message: "Erro interno do servidor" });
                }
            },
            {
                auth: true,
                body: t.Object({
                    professionalId: t.String({ format: "uuid" }),
                    unitId: t.String({ format: "uuid" }),
                    startAt: t.String({ format: "date-time" }),
                    reason: t.Optional(t.String({ minLength: 1 })),
                }),
                detail: {
                    summary: "Book a slot",
                    description: "Creates an appointment for the authenticated patient in the specified slot.",
                    tags: ["Patient Appointments"],
                },
                response: {
                    201: patientAppointmentResponseSchema,
                    401: t.Object({ message: t.Literal("Não autorizado") }),
                    404: t.Object({ message: t.String() }),
                    409: t.Object({ message: t.String() }),
                    500: patientAppointmentsErrorSchema,
                },
            },
        );
};
