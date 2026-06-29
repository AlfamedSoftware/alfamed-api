import { Elysia, t } from "elysia";
import type { ExamManagementRepository } from "./exam-management.repository.js";
import { ExamManagementService } from "./exam-management.service.js";
import { examManagementListSchema, examManagementItemSchema, examManagementErrorSchema } from "./exam-management.schemas.js";
import { getAuthenticatedUserId } from "../../http/plugins/unit-access.js";
import { getProfessionalUnitIdFromRequest } from "../../http/plugins/unit-context.js";

type ExamManagementRoutesOptions = {
    examManagementRepository: ExamManagementRepository;
};

export const examManagementRoutes = ({ examManagementRepository }: ExamManagementRoutesOptions) => {
    const examManagementService = new ExamManagementService(examManagementRepository);

    return new Elysia({ name: "exam-management-routes", prefix: "/exam-management" })
        .get(
            "/",
            async ({ query, status }) => {
                try {
                    const items = await examManagementService.listExamManagements({
                        professionalUserId: query.professionalUserId,
                        date: query.date,
                        statusCode: query.statusCode,
                    });

                    return status(200, items);
                } catch (error) {
                    console.error("[exam-management][list]", error);
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                query: t.Object({
                    professionalUserId: t.Optional(t.String()),
                    date: t.Optional(t.String()),
                    statusCode: t.Optional(t.Numeric()),
                }),
                detail: {
                    summary: "List exam managements",
                    description: "Returns appointments that have at least one active request, with patient, professional and request data. Ordered by schedule date and slot start time.",
                    tags: ["Exam Management"],
                },
                response: {
                    200: examManagementListSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    500: examManagementErrorSchema,
                },
            },
        )
        .patch(
            "/:appointmentId/liberar",
            async (context) => {
                const { params, status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });
                if (!userId) return status(401, { message: "Unauthorized" });
                try {
                    const result = await examManagementService.liberarRequests(params.appointmentId, userId);
                    if (!result.success) return status(404, { message: "Appointment not found or has no active requests" });
                    return status(200, { message: "Requests liberadas com sucesso" });
                } catch (error) {
                    console.error("[exam-management][liberar]", error);
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                params: t.Object({
                    appointmentId: t.String({ format: "uuid" }),
                }),
                detail: {
                    summary: "Liberar requests do agendamento para exame",
                    description: "Atualiza o status de todos os pedidos ativos do agendamento para 'Aguardando realização' (code 2) e registra o log de transição para cada um.",
                    tags: ["Exam Management"],
                },
                response: {
                    200: t.Object({ message: t.String() }),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    404: examManagementErrorSchema,
                    500: examManagementErrorSchema,
                },
            },
        )
        .patch(
            "/:appointmentId/iniciar",
            async (context) => {
                const { params, status, request } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });
                if (!userId) return status(401, { message: "Unauthorized" });
                const professionalUnitId = getProfessionalUnitIdFromRequest(request);
                if (!professionalUnitId) return status(401, { message: "No professional unit selected" });
                try {
                    const result = await examManagementService.iniciarRequests(params.appointmentId, professionalUnitId, userId);
                    if (!result.success) return status(404, { message: "Appointment not found or has no active requests" });
                    return status(200, { message: "Exame iniciado com sucesso" });
                } catch (error) {
                    console.error("[exam-management][iniciar]", error);
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                params: t.Object({
                    appointmentId: t.String({ format: "uuid" }),
                }),
                detail: {
                    summary: "Iniciar exame do agendamento",
                    description: "Atualiza o status de todos os pedidos ativos do agendamento para 'Paciente em exame' (code 3), vincula o professionalUnitId da sessão e registra o log de transição para cada um.",
                    tags: ["Exam Management"],
                },
                response: {
                    200: t.Object({ message: t.String() }),
                    401: t.Object({ message: t.String() }),
                    404: examManagementErrorSchema,
                    500: examManagementErrorSchema,
                },
            },
        )
        .patch(
            "/:appointmentId/iniciar-laudo",
            async (context) => {
                const { params, status, request } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });
                if (!userId) return status(401, { message: "Unauthorized" });
                const professionalUnitId = getProfessionalUnitIdFromRequest(request);
                if (!professionalUnitId) return status(401, { message: "No professional unit selected" });
                try {
                    const result = await examManagementService.iniciarLaudo(params.appointmentId, professionalUnitId, userId);
                    if (!result.success) return status(404, { message: "Appointment not found or has no active requests" });
                    return status(200, { message: "Laudo iniciado com sucesso" });
                } catch (error) {
                    console.error("[exam-management][iniciar-laudo]", error);
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                params: t.Object({
                    appointmentId: t.String({ format: "uuid" }),
                }),
                detail: {
                    summary: "Iniciar laudo do agendamento",
                    description: "Avança todos os pedidos ativos para 'Laudo em análise' (code 5) e vincula o professionalUnitId da sessão em request_results.",
                    tags: ["Exam Management"],
                },
                response: {
                    200: t.Object({ message: t.String() }),
                    401: t.Object({ message: t.String() }),
                    404: examManagementErrorSchema,
                    500: examManagementErrorSchema,
                },
            },
        )
        .patch(
            "/:appointmentId/encerrar",
            async (context) => {
                const { params, body, status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });
                if (!userId) return status(401, { message: "Unauthorized" });
                try {
                    const result = await examManagementService.encerrarRequests(params.appointmentId, body.statusCode, body.justification, userId);
                    if (!result.success) return status(404, { message: "Appointment not found or has no active requests" });
                    return status(200, { message: "Pedidos encerrados com sucesso" });
                } catch (error) {
                    console.error("[exam-management][encerrar]", error);
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                params: t.Object({
                    appointmentId: t.String({ format: "uuid" }),
                }),
                body: t.Object({
                    statusCode: t.Union([t.Literal(7), t.Literal(8)]),
                    justification: t.String({ minLength: 1 }),
                }),
                detail: {
                    summary: "Encerrar pedidos do agendamento sem resultado",
                    description: "Avança todos os pedidos ativos para 'Exame não realizado' (code 7) ou 'Paciente não compareceu' (code 8), preenchendo justification em cada pedido.",
                    tags: ["Exam Management"],
                },
                response: {
                    200: t.Object({ message: t.String() }),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    404: examManagementErrorSchema,
                    500: examManagementErrorSchema,
                },
            },
        )
        .patch(
            "/:appointmentId/finalizar-laudo",
            async (context) => {
                const { params, body, status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });
                if (!userId) return status(401, { message: "Unauthorized" });
                try {
                    const result = await examManagementService.finalizarLaudo(params.appointmentId, body.attachmentUrl, userId, body.complementaryInfo);
                    if (!result.success) return status(404, { message: "Appointment not found or has no active requests" });
                    return status(200, { message: "Laudo liberado com sucesso" });
                } catch (error) {
                    console.error("[exam-management][finalizar-laudo]", error);
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                params: t.Object({
                    appointmentId: t.String({ format: "uuid" }),
                }),
                body: t.Object({
                    attachmentUrl: t.String(),
                    complementaryInfo: t.Optional(t.Nullable(t.String())),
                }),
                detail: {
                    summary: "Finalizar laudo do agendamento",
                    description: "Avança todos os pedidos ativos para 'Laudo liberado' (code 6), registra a URL do laudo e releasedAt em request_results. O campo complementaryInfo é opcional.",
                    tags: ["Exam Management"],
                },
                response: {
                    200: t.Object({ message: t.String() }),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    404: examManagementErrorSchema,
                    500: examManagementErrorSchema,
                },
            },
        )
        .patch(
            "/:appointmentId/finalizar",
            async (context) => {
                const { params, body, status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });
                if (!userId) return status(401, { message: "Unauthorized" });
                try {
                    const result = await examManagementService.finalizarRequests(params.appointmentId, userId, body.complementaryInfo);
                    if (!result.success) return status(404, { message: "Appointment not found or has no active requests" });
                    return status(200, { message: "Exame finalizado com sucesso" });
                } catch (error) {
                    console.error("[exam-management][finalizar]", error);
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                params: t.Object({
                    appointmentId: t.String({ format: "uuid" }),
                }),
                body: t.Object({
                    complementaryInfo: t.Optional(t.Nullable(t.String())),
                }),
                detail: {
                    summary: "Finalizar exame do agendamento",
                    description: "Avança todos os pedidos ativos para 'Aguardando análise' (code 4), registra performedAt e cria request_result para cada pedido. O campo complementaryInfo é opcional.",
                    tags: ["Exam Management"],
                },
                response: {
                    200: t.Object({ message: t.String() }),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    404: examManagementErrorSchema,
                    500: examManagementErrorSchema,
                },
            },
        )
        .get(
            "/:appointmentId",
            async ({ params, status }) => {
                try {
                    const item = await examManagementService.getExamManagementDetails(params.appointmentId);

                    if (!item) return status(404, { message: "Not found" });

                    return status(200, item);
                } catch (error) {
                    console.error("[exam-management][details]", error);
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                params: t.Object({
                    appointmentId: t.String(),
                }),
                detail: {
                    summary: "Get exam management details",
                    description: "Returns the full exam management data for a specific appointment.",
                    tags: ["Exam Management"],
                },
                response: {
                    200: examManagementItemSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    404: t.Object({ message: t.Literal("Not found") }),
                    500: examManagementErrorSchema,
                },
            },
        );
};
