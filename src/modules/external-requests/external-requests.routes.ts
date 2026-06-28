import { Elysia, t } from "elysia";
import type { db as dbType } from "../../db/client.js";
import { getAuthenticatedUserId } from "../../http/plugins/unit-access.js";
import { ExternalRequestsRepository } from "./external-requests.repository.js";
import { ExternalRequestsService, RequisitionNotFoundError } from "./external-requests.service.js";

type DatabaseClient = typeof dbType;

export const externalRequestsRoutes = ({ db }: { db: DatabaseClient }) => {
    const repository = new ExternalRequestsRepository(db);
    const service = new ExternalRequestsService(repository);

    return new Elysia({ name: "external-requests-routes", prefix: "/external-requests" })
        .get(
            "/requisition/:appointmentId",
            async (context) => {
                const { params, status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });

                if (!userId) {
                    return status(401, { message: "Não autorizado" });
                }

                try {
                    const pdf = await service.generateRequisitionPdf(params.appointmentId);

                    return new Response(new Uint8Array(pdf), {
                        headers: {
                            "Content-Type": "application/pdf",
                            "Content-Disposition": `inline; filename="requisicao-${params.appointmentId}.pdf"`,
                        },
                    });
                } catch (error) {
                    if (error instanceof RequisitionNotFoundError) {
                        return status(404, { message: "Atendimento não encontrado" });
                    }

                    console.error("[external-requests.routes] Error generating requisition PDF:", error);
                    return status(500, { message: "Erro interno do servidor" });
                }
            },
            {
                auth: true,
                params: t.Object({
                    appointmentId: t.String({ format: "uuid" }),
                }),
                detail: {
                    summary: "Generate exam requisition PDF",
                    description: "Generates a PDF requisition for all external exams requested in an appointment.",
                    tags: ["External Requests"],
                },
            },
        );
};
