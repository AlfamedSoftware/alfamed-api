import { Elysia, t } from "elysia";
import type { AttendimentsRepository } from "./attendiments.repository.js";
import type { SchedulesRepository } from "../schedules/schedules.repository.js";
import { AttendimentsService } from "./attendiments.service.js";
import { appointmentFullDataSchema, appointmentsBySpecialtyListSchema, attendimentsErrorSchema } from "./attendiments.schemas.js";

type AttendimentsRoutesOptions = {
    attendimentsRepository: AttendimentsRepository;
    schedulesRepository: SchedulesRepository;
};

export const attendimentsRoutes = ({
    attendimentsRepository,
    schedulesRepository,
}: AttendimentsRoutesOptions) => {
    const attendimentsService = new AttendimentsService(
        attendimentsRepository,
        schedulesRepository,
    );

    return new Elysia({ name: "attendiments-routes", prefix: "/attendiments" })
        .get(
            "/list-appointments-by-specialty",
            async ({ query }) => {
                const result = await attendimentsService.listAppointmentsBySpecialty({
                    date: query.date as string,
                    professionalUnitId: query.professionalUnitId as string,
                });
                return result;
            },
            {
                query: t.Object({
                    date: t.String(),
                    professionalUnitId: t.String({ format: "uuid" }),
                }),
                detail: {
                    summary: "List appointments by specialty",
                    description: "Lists all active appointments grouped by specialty, including related schedule, patient, and procedure information.",
                    tags: ["Attendiments"],
                },
                response: {
                    200: appointmentsBySpecialtyListSchema,
                    500: attendimentsErrorSchema,
                },
            },
        )
        .get(
            "/attendiment-full-data/:appointmentId",
            async ({ params, status }) => {
                const result = await attendimentsService.getAppointmentFullData(params.appointmentId);
                if (!result) return status(404, { message: "Appointment not found" });
                return result;
            },
            {
                params: t.Object({
                    appointmentId: t.String({ format: "uuid" }),
                }),
                detail: {
                    summary: "Get full appointment data",
                    description: "Returns the full appointment data including user, schedule, schedule slot, specialty, and procedure information.",
                    tags: ["Attendiments"],
                },
                response: {
                    200: appointmentFullDataSchema,
                    404: attendimentsErrorSchema,
                    500: attendimentsErrorSchema,
                },
            },
        )
        .patch(
            "/:id/iniciar",
            async ({ params, status }) => {
                try {
                    const result = await attendimentsService.iniciarAtendimento(params.id);
                    if (!result.success) return status(404, { message: "Appointment not found" });
                    return status(200, { message: "Atendimento iniciado com sucesso" });
                } catch {
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                params: t.Object({
                    id: t.String({ format: "uuid" }),
                }),
                detail: {
                    summary: "Iniciar atendimento",
                    description: "Atualiza o status do agendamento para 'Atendimento iniciado' (code 2) e registra o horário de início.",
                    tags: ["Attendiments"],
                },
                response: {
                    200: t.Object({ message: t.String() }),
                    404: attendimentsErrorSchema,
                    500: attendimentsErrorSchema,
                },
            },
        )
        .patch(
            "/:id/finalizar",
            async ({ params, body, status }) => {
                try {
                    const result = await attendimentsService.finalizarAtendimento(params.id, body as {
                        diagnostics?: string | null;
                        clinicNotes?: string | null;
                    });
                    if (!result.success) return status(404, { message: "Appointment not found" });
                    return status(200, { message: "Atendimento finalizado com sucesso" });
                } catch (error) {
                    console.log("Error finalizing appointment and saving requests:", error);
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                params: t.Object({
                    id: t.String({ format: "uuid" }),
                }),
                body: t.Object({
                    diagnostics: t.Optional(t.Nullable(t.String())),
                    clinicNotes: t.Optional(t.Nullable(t.String())),
                }),
                detail: {
                    summary: "Finalizar atendimento",
                    description: "Finaliza o atendimento (status code 3), registra endAt, diagnostics e clinicNotes.",
                    tags: ["Attendiments"],
                },
                response: {
                    200: t.Object({ message: t.String() }),
                    404: attendimentsErrorSchema,
                    500: attendimentsErrorSchema,
                },
            },
        )
        .patch(
            "/:id/falta",
            async ({ params, status }) => {
                try {
                    const result = await attendimentsService.faltaAtendimento(params.id);
                    if (!result.success) return status(404, { message: "Appointment not found" });
                    return status(200, { message: "Falta registrada com sucesso" });
                } catch {
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                params: t.Object({
                    id: t.String({ format: "uuid" }),
                }),
                detail: {
                    summary: "Registrar falta",
                    description: "Registra falta do paciente (status code 4) sem devolver a vaga ao schedule.",
                    tags: ["Attendiments"],
                },
                response: {
                    200: t.Object({ message: t.String() }),
                    404: attendimentsErrorSchema,
                    500: attendimentsErrorSchema,
                },
            },
        )
        .patch(
            "/:id/cancelar",
            async ({ params, status }) => {
                try {
                    const result = await attendimentsService.cancelarAtendimento(params.id);
                    if (!result.success) return status(404, { message: "Appointment not found" });
                    return status(200, { message: "Atendimento cancelado com sucesso" });
                } catch {
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                params: t.Object({
                    id: t.String({ format: "uuid" }),
                }),
                detail: {
                    summary: "Cancelar atendimento",
                    description: "Cancela o agendamento (status code 5), devolve a vaga ao schedule e registra o log.",
                    tags: ["Attendiments"],
                },
                response: {
                    200: t.Object({ message: t.String() }),
                    404: attendimentsErrorSchema,
                    500: attendimentsErrorSchema,
                },
            },
        );
};
