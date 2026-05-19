import { Elysia, t } from "elysia";
import { z } from "zod";
import { getAuthenticatedUserId } from "../../http/plugins/unit-access.js";
import { getUnitIdFromRequest, getProfessionalUnitIdFromRequest } from "../../http/plugins/unit-context.js";
import { isDomainError } from "../../http/plugins/domain-error.js";
import { isUniqueConstraintError } from "../../http/plugins/db-errors.js";
import type { ProfessionalsRepository } from "./professionals.repository.js";
import { ProfessionalsService } from "./professionals.service.js";
import {
    createProfessionalSchema,
    createProfessionalForUserSchema,
    professionalProfileSchema,
    professionalRoleProfileSchema,
    professionalDetailSchema,
    professionalWithUnitProfileSchema,
    professionalsErrorSchema,
    updateProfessionalSchema,
} from "./professionals.schemas.js";

const unitSelectionRequiredMessage = "Selecione uma unidade para continuar";
const professionalUnitSelectionRequiredMessage = "Selecione um vínculo profissional para continuar";

type ProfessionalsRoutesOptions = {
    professionalsRepository: ProfessionalsRepository;
    hasUserAccessToUnitChecker: (userId: string, unitId: string) => Promise<boolean>;
};

export const professionalsRoutes = ({
    professionalsRepository,
    hasUserAccessToUnitChecker,
}: ProfessionalsRoutesOptions) => {
    const professionalsService = new ProfessionalsService(
        professionalsRepository,
        hasUserAccessToUnitChecker,
    );
    const resolveRequestScope = async (context: { request: Request; user?: { id?: string } }) => {
        const userId = getAuthenticatedUserId(context);

        if (!userId) {
            return { error: "unauthorized" as const };
        }

        const selectedUnitId = getUnitIdFromRequest(context.request);

        if (selectedUnitId) {
            return { userId, unitId: selectedUnitId };
        }

        return { error: "invalid_unit" as const };
    };

    return new Elysia({ name: "professionals-routes", prefix: "/professionals" })
        .post(
            "/",
            async (context) => {
                const { body, status } = context;
                const scope = await resolveRequestScope(context as { request: Request; user?: { id?: string } });

                if ("error" in scope) {
                    if (scope.error === "unauthorized") {
                        return status(401, { message: "Unauthorized" });
                    }

                    return status(400, { message: unitSelectionRequiredMessage });
                }

                try {
                    const createPayload = {
                        isActive: body.isActive,
                        userId: scope.userId,
                    };
                    const result = await professionalsService.createProfessional(
                        scope.userId,
                        scope.unitId,
                        createPayload,
                    );

                    return status(201, { ...result.professional, professionalUnitId: result.professionalUnitId });
                } catch (error) {
                    if (isUniqueConstraintError(error)) {
                        return status(409, { message: "Professional already exists for this user" });
                    }
                    if (isDomainError(error, "FORBIDDEN")) {
                        return status(403, { message: "Forbidden" });
                    }

                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                body: createProfessionalSchema,
                detail: {
                    summary: "Create professional",
                    description: "Creates a professional linked to the authenticated user.",
                    tags: ["Professionals"],
                },
                response: {
                    201: professionalWithUnitProfileSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    400: t.Object({ message: t.Literal("Selecione uma unidade para continuar") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    409: t.Object({ message: t.Literal("Professional already exists for this user") }),
                    500: professionalsErrorSchema,
                },
            },
        )
        .get(
            "/professional-unit/roles",
            async (context) => {
                const { status } = context;
                const scope = await resolveRequestScope(context as { request: Request; user?: { id?: string } });

                if ("error" in scope) {
                    if (scope.error === "unauthorized") {
                        return status(401, { message: "Unauthorized" });
                    }

                    return status(400, { message: unitSelectionRequiredMessage });
                }

                const professionalUnitId = getProfessionalUnitIdFromRequest(context.request);

                if (!professionalUnitId) {
                    return status(400, { message: professionalUnitSelectionRequiredMessage });
                }

                try {
                    const roles = await professionalsService.listCurrentProfessionalUnitRoles(
                        scope.userId,
                        scope.unitId,
                        professionalUnitId,
                    );

                    return status(200, roles);
                } catch (error) {
                    if (isDomainError(error, "FORBIDDEN")) {
                        return status(403, { message: "Forbidden" });
                    }

                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                detail: {
                    summary: "List current professional unit roles",
                    description:
                        "Returns active roles linked to the currently selected professional unit, respecting active status across related tables.",
                    tags: ["Professionals"],
                },
                response: {
                    200: z.array(professionalRoleProfileSchema),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    400: t.Union([
                        t.Object({ message: t.Literal("Selecione uma unidade para continuar") }),
                        t.Object({ message: t.Literal("Selecione um vínculo profissional para continuar") }),
                    ]),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    500: professionalsErrorSchema,
                },
            },
        )
        .post(
            "/link-user",
            async (context) => {
                const { body, status } = context;
                const scope = await resolveRequestScope(context as { request: Request; user?: { id?: string } });

                if ("error" in scope) {
                    if (scope.error === "unauthorized") {
                        return status(401, { message: "Unauthorized" });
                    }

                    return status(400, { message: unitSelectionRequiredMessage });
                }

                try {
                    const result = await professionalsService.createProfessional(
                        scope.userId,
                        scope.unitId,
                        {
                            userId: body.userId,
                            isActive: body.isActive,
                        }
                    );

                    return status(201, { ...result.professional, professionalUnitId: result.professionalUnitId });
                } catch (error) {
                    if (isUniqueConstraintError(error)) {
                        return status(409, { message: "Professional already exists for this user" });
                    }

                    if (isDomainError(error, "FORBIDDEN")) {
                        return status(403, { message: "Forbidden" });
                    }

                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                body: createProfessionalForUserSchema,
                detail: {
                    summary: "Create professional for user",
                    description: "Creates a professional linked to the userId provided in the request body and to the selected unit.",
                    tags: ["Professionals"],
                },
                response: {
                    201: professionalWithUnitProfileSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    400: t.Object({ message: t.Literal("Selecione uma unidade para continuar") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    409: t.Object({ message: t.String() }),
                    500: professionalsErrorSchema,
                },
            },
        )
        .get(
            "/",
            async (context) => {
                const { status } = context;
                const scope = await resolveRequestScope(context as { request: Request; user?: { id?: string } });

                if ("error" in scope) {
                    if (scope.error === "unauthorized") {
                        return status(401, { message: "Unauthorized" });
                    }

                    return status(400, { message: unitSelectionRequiredMessage });
                }

                try {
                    const professionals = await professionalsService.listProfessionals(scope.userId, scope.unitId);

                    return status(200, professionals);
                } catch (error) {
                    if (isDomainError(error, "FORBIDDEN")) {
                        return status(403, { message: "Forbidden" });
                    }

                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                detail: {
                    summary: "List professionals",
                    description: "Returns professionals for the selected unit.",
                    tags: ["Professionals"],
                },
                response: {
                    200: z.array(professionalProfileSchema),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    400: t.Object({ message: t.Literal("Selecione uma unidade para continuar") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    500: professionalsErrorSchema,
                },
            },
        )
        .get(
            "/:id",
            async (context) => {
                const { params, status } = context;
                const scope = await resolveRequestScope(context as { request: Request; user?: { id?: string } });

                if ("error" in scope) {
                    if (scope.error === "unauthorized") {
                        return status(401, { message: "Unauthorized" });
                    }

                    return status(400, { message: unitSelectionRequiredMessage });
                }

                try {
                    const professional = await professionalsService.getProfessionalById(
                        scope.userId,
                        params.id,
                        scope.unitId,
                    );

                    return status(200, professional);
                } catch (error) {
                    if (isDomainError(error, "FORBIDDEN")) {
                        return status(403, { message: "Forbidden" });
                    }
                    if (isDomainError(error, "PROFESSIONAL_NOT_FOUND")) {
                        return status(404, { message: "Professional not found" });
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
                    summary: "Get professional by id",
                    description: "Returns a professional profile by id.",
                    tags: ["Professionals"],
                },
                response: {
                    200: professionalDetailSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    400: t.Object({ message: t.Literal("Selecione uma unidade para continuar") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    404: t.Object({ message: t.Literal("Professional not found") }),
                    500: professionalsErrorSchema,
                },
            },
        )
        .patch(
            "/:id",
            async (context) => {
                const { params, body, status } = context;
                const scope = await resolveRequestScope(context as { request: Request; user?: { id?: string } });

                if ("error" in scope) {
                    if (scope.error === "unauthorized") {
                        return status(401, { message: "Unauthorized" });
                    }

                    return status(400, { message: unitSelectionRequiredMessage });
                }

                try {
                    const professional = await professionalsService.updateProfessional(
                        scope.userId,
                        params.id,
                        scope.unitId,
                        body,
                    );

                    return status(200, professional);
                } catch (error) {
                    if (isUniqueConstraintError(error)) {
                        return status(409, { message: "Professional already exists for this user" });
                    }
                    if (isDomainError(error, "FORBIDDEN")) {
                        return status(403, { message: "Forbidden" });
                    }
                    if (isDomainError(error, "PROFESSIONAL_NOT_FOUND")) {
                        return status(404, { message: "Professional not found" });
                    }

                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                params: t.Object({
                    id: t.String({ format: "uuid" }),
                }),
                body: updateProfessionalSchema,
                detail: {
                    summary: "Update professional",
                    description: "Updates a professional profile by id.",
                    tags: ["Professionals"],
                },
                response: {
                    200: professionalProfileSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    400: t.Object({ message: t.Literal("Selecione uma unidade para continuar") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    404: t.Object({ message: t.Literal("Professional not found") }),
                    409: t.Object({ message: t.Literal("Professional already exists for this user") }),
                    500: professionalsErrorSchema,
                },
            },
        );
    };
