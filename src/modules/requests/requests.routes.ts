import { Elysia, t } from "elysia";
import { getAuthenticatedUserId } from "../../http/plugins/unit-access.js";
import { RequestsRepository } from "./requests.repository.js";
import { RequestsService } from "./requests.service.js";
import type { db as dbType } from "../../db/client.js";

type DatabaseClient = typeof dbType;

export const requestsRoutes = ({ db }: { db: DatabaseClient }) => {
    const requestsRepository = new RequestsRepository(db);
    const requestsService = new RequestsService(requestsRepository);

    return new Elysia({ name: "requests-routes", prefix: "/requests" })
        .post(
            "/save-from-appointment",
            async (context) => {
                const { body, status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                try {
                    await requestsService.saveFromAppointment(body.appointmentId, body.procedureIds);
                    return status(200, { message: "Exames salvos com sucesso" });
                } catch (error) {
                    console.log("Error saving exam requests:", error);
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                body: t.Object({
                    appointmentId: t.String({ format: "uuid" }),
                    procedureIds: t.Array(t.String({ format: "uuid" })),
                }),
                detail: {
                    summary: "Save exam requests from appointment",
                    description:
                        "Grava os exames selecionados de um atendimento, separando entre pedidos internos (requests) e externos (external_requests) conforme o parâmetro modulo1GestaoExames da unidade e o campo isPerformedInUnit do procedimento.",
                    tags: ["Requests"],
                },
                response: {
                    200: t.Object({ message: t.String() }),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    500: t.Object({ message: t.String() }),
                },
            },
        )
        .get(
            "/by-appointment/:appointmentId",
            async (context) => {
                const { params, status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                try {
                    const items = await requestsService.listByAppointment(params.appointmentId);
                    return status(200, items);
                } catch (error) {
                    console.log("Error listing exam requests:", error);
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                params: t.Object({
                    appointmentId: t.String({ format: "uuid" }),
                }),
                detail: {
                    summary: "List exam requests by appointment",
                    description: "Lista os exames (internos e externos) gravados em um atendimento.",
                    tags: ["Requests"],
                },
                response: {
                    200: t.Array(
                        t.Object({
                            id: t.String(),
                            procedureId: t.String(),
                            description: t.String(),
                            kind: t.Union([t.Literal("internal"), t.Literal("external")]),
                            statusCode: t.Nullable(t.Number()),
                            statusDescription: t.Nullable(t.String()),
                        }),
                    ),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    500: t.Object({ message: t.String() }),
                },
            },
        );
};
