import { Elysia, t } from "elysia";
import { getAuthenticatedUserId } from "../../http/plugins/unit-access.js";
import type { AnamnesisRepository } from "./anamnesis.repository.js";
import { AnamnesisService } from "./anamnesis.service.js";
import {
    anamnesisErrorSchema,
    anamnesisListSchema,
    anamnesisSchema,
    createAnamnesisSchema,
} from "./anamnesis.schemas.js";

type AnamnesisRoutesOptions = {
    anamnesisRepository: AnamnesisRepository;
};

export const anamnesisRoutes = ({ anamnesisRepository }: AnamnesisRoutesOptions) => {
    const anamnesisService = new AnamnesisService(anamnesisRepository);

    return new Elysia({ name: "anamnesis-routes", prefix: "/anamnesis" })
        .get(
            "/:appointmentId",
            async (context) => {
                const { params, status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                try {
                    const result = await anamnesisService.listByAppointmentId(params.appointmentId);
                    return status(200, result);
                } catch {
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                params: t.Object({
                    appointmentId: t.String({ format: "uuid" }),
                }),
                detail: {
                    summary: "Buscar anamnese do agendamento",
                    description: "Retorna a anamnese vinculada ao agendamento informado. Utilizado na tela de atendimento médico para exibir os dados preenchidos pelo paciente antes da consulta. Caso o paciente não tenha preenchido a anamnese no momento do agendamento, retorna um array vazio.",
                    tags: ["Anamnesis"],
                },
                response: {
                    200: anamnesisListSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    500: anamnesisErrorSchema,
                },
            },
        )
        .post(
            "/",
            async (context) => {
                const { body, status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                try {
                    const created = await anamnesisService.create(body as any);
                    return status(201, created);
                } catch {
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                body: createAnamnesisSchema,
                detail: {
                    summary: "Registrar anamnese",
                    description: "Registra a anamnese do paciente ao final do fluxo de agendamento no aplicativo mobile. O paciente preenche os dados de saúde (queixa, dor, medicamentos, alergias, cirurgias e histórico familiar) antes de confirmar o agendamento. O campo painLevel segue a escala: 0 = Não, 1 = Leve, 2 = Moderada, 3 = Intensa.",
                    tags: ["Anamnesis"],
                },
                response: {
                    201: anamnesisSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    500: anamnesisErrorSchema,
                },
            },
        );
};
