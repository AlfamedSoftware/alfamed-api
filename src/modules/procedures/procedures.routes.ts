import { Elysia, t } from "elysia";
import { getAuthenticatedUserId } from "../../http/plugins/unit-access.js";
import { isDomainError } from "../../http/plugins/domain-error.js";
import { getUnitIdFromRequest } from "../../http/plugins/unit-context.js";
import type { ProceduresRepository } from "./procedures.repository.js";
import { ProceduresService } from "./procedures.service.js";
import {
    proceduresErrorSchema,
    proceduresListSchema,
    createProcedureSchema,
    updateProcedureSchema,
    procedureSchema,
} from "./procedures.schemas.js";

const unitSelectionRequiredMessage = "Selecione uma unidade para continuar";

type ProceduresRoutesOptions = {
    proceduresRepository: ProceduresRepository;
    hasUserAccessToUnitChecker: (userId: string, unitId: string) => Promise<boolean>;
};

export const proceduresRoutes = ({
    proceduresRepository,
    hasUserAccessToUnitChecker,
}: ProceduresRoutesOptions) => {
    const proceduresService = new ProceduresService(
        proceduresRepository,
        hasUserAccessToUnitChecker,
    );

    return new Elysia({ name: "procedures-routes", prefix: "/procedures" })
        .post(
            "/",
            async (context) => {
                const { body, status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });
                const selectedUnitId = getUnitIdFromRequest(context.request);

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                if (!selectedUnitId) {
                    return status(400, { message: unitSelectionRequiredMessage });
                }

                try {
                    const created = await proceduresService.createProcedureForUnit(userId, selectedUnitId, body as any);

                    return status(201, created);
                } catch (error) {
                    if (isDomainError(error, "FORBIDDEN")) {
                        return status(403, { message: "Forbidden" });
                    }

                    if (isDomainError(error, "SPECIALTY_REQUIRED_FOR_TYPE")) {
                        return status(422, { message: "Especialidade é obrigatória para Consultas e Retornos" });
                    }

                    if (isDomainError(error, "PROCEDURE_CODE_ALREADY_EXISTS")) {
                        return status(409, { message: "O código do procedimento já está cadastrado nessa unidade" });
                    }

                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                body: createProcedureSchema,
                detail: {
                    summary: "Create procedure",
                    description: "Creates a procedure for the selected unit.",
                    tags: ["Procedures"],
                },
                response: {
                    201: procedureSchema,
                    400: t.Object({ message: t.Literal("Selecione uma unidade para continuar") }),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    409: t.Object({ message: t.Literal("O código do procedimento já está cadastrado nessa unidade") }),
                    422: t.Object({ message: t.Literal("Especialidade é obrigatória para Consultas e Retornos") }),
                    500: proceduresErrorSchema,
                },
            },
        )
        .get(
            "/list-procedures-by-unit/:unitId",
            async (context) => {
                const { params, query, status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                try {
                    const procedures = await proceduresService.listProceduresByUnit(
                        params.unitId,
                        query.specialtyId as string | undefined,
                        query.isActive as boolean | undefined,
                        query.type as number | undefined,
                    );

                    return status(200, procedures);
                } catch (error) {
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                params: t.Object({
                    unitId: t.String({ format: "uuid" }),
                }),
                query: t.Object({
                    specialtyId: t.Optional(t.String({ format: "uuid" })),
                    isActive: t.Optional(t.Boolean()),
                    type: t.Optional(t.Numeric()),
                }),
                detail: {
                    summary: "List procedures by unit",
                    description: "Returns the procedures for a specified unit, optionally filtered by specialty and isActive.",
                    tags: ["Procedures"],
                },
                response: {
                    200: proceduresListSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    500: proceduresErrorSchema,
                },
            },
        )
        .get(
            "/list-procedures-by-ids/:listaIds",
            async (context) => {
                const { params, query, status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });
                const selectedUnitId = getUnitIdFromRequest(context.request);

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                if (!selectedUnitId) {
                    return status(400, { message: unitSelectionRequiredMessage });
                }

                const ids = params.listaIds.split(",").map((id) => id.trim()).filter(Boolean);

                try {
                    const procedures = await proceduresService.listProceduresByIds(
                        selectedUnitId,
                        ids,
                        query.isActive as boolean | undefined,
                    );

                    return status(200, procedures);
                } catch (error) {
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                params: t.Object({
                    listaIds: t.String(),
                }),
                query: t.Object({
                    isActive: t.Optional(t.Boolean()),
                }),
                detail: {
                    summary: "List procedures by IDs",
                    description: "Returns procedures matching the given comma-separated IDs, filtered to the selected unit.",
                    tags: ["Procedures"],
                },
                response: {
                    200: proceduresListSchema,
                    400: t.Object({ message: t.Literal("Selecione uma unidade para continuar") }),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    500: proceduresErrorSchema,
                },
            },
        )
        .get(
            "/:procedureId",
            async (context) => {
                const { params, status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });
                const selectedUnitId = getUnitIdFromRequest(context.request);

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                if (!selectedUnitId) {
                    return status(400, { message: unitSelectionRequiredMessage });
                }

                try {
                    const procedure = await proceduresService.getProcedureById(
                        userId,
                        selectedUnitId,
                        params.procedureId,
                    );

                    if (!procedure) {
                        return status(404, { message: "Procedure not found" });
                    }

                    return status(200, procedure);
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
                    procedureId: t.String({ format: "uuid" }),
                }),
                detail: {
                    summary: "Get procedure by id",
                    description: "Returns all data for a procedure by id within the selected unit.",
                    tags: ["Procedures"],
                },
                response: {
                    200: procedureSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    400: t.Object({ message: t.Literal("Selecione uma unidade para continuar") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    404: t.Object({ message: t.Literal("Procedure not found") }),
                    500: proceduresErrorSchema,
                },
            },
        )
        .patch(
            "/",
            async (context) => {
                const { body, status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });
                const selectedUnitId = getUnitIdFromRequest(context.request);

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                if (!selectedUnitId) {
                    return status(400, { message: unitSelectionRequiredMessage });
                }

                try {
                    const { procedureId, ...payload } = body as {
                        procedureId: string;
                        specialtyId?: string | null;
                        type?: number;
                        description?: string;
                        observation?: string | null;
                        code?: string;
                        price?: string;
                        isPerformedInUnit?: boolean;
                        isActive?: boolean;
                    };

                    const updated = await proceduresService.updateProcedureForUnit(
                        userId,
                        selectedUnitId,
                        procedureId,
                        payload,
                    );

                    if (!updated) {
                        return status(404, { message: "Procedure not found" });
                    }

                    return status(200, updated);
                } catch (error) {
                    if (isDomainError(error, "FORBIDDEN")) {
                        return status(403, { message: "Forbidden" });
                    }

                    if (isDomainError(error, "SPECIALTY_REQUIRED_FOR_TYPE")) {
                        return status(422, { message: "Especialidade é obrigatória para Consultas e Retornos" });
                    }

                    if (isDomainError(error, "PROCEDURE_CODE_ALREADY_EXISTS")) {
                        return status(409, { message: "O código do procedimento já está cadastrado nessa unidade" });
                    }

                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                body: updateProcedureSchema,
                detail: {
                    summary: "Update procedure",
                    description: "Updates a procedure by id (sent in body) within the selected unit.",
                    tags: ["Procedures"],
                },
                response: {
                    200: procedureSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    400: t.Object({ message: t.Literal("Selecione uma unidade para continuar") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    404: t.Object({ message: t.Literal("Procedure not found") }),
                    409: t.Object({ message: t.Literal("O código do procedimento já está cadastrado nessa unidade") }),
                    422: t.Object({ message: t.Literal("Especialidade é obrigatória para Consultas e Retornos") }),
                    500: proceduresErrorSchema,
                },
            },
        );
};
