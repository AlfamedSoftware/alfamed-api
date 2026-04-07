import { Elysia, t } from "elysia";
import { z } from "zod";
import {
    getAuthenticatedUserId,
    getRequiredUnitIdFromRequest,
    invalidOrMissingUnitHeaderMessage,
} from "@/http/plugins/unit-access";
import { isDomainError } from "@/http/plugins/domain-error";
import { isUniqueConstraintError } from "@/http/plugins/db-errors";
import type { ProfessionalsRepository } from "./professionals.repository";
import { ProfessionalsService } from "./professionals.service";
import {
    createProfessionalSchema,
    professionalProfileSchema,
    professionalsErrorSchema,
    updateProfessionalSchema,
} from "./professionals.schemas";

type ProfessionalsRoutesOptions = {
    professionalsRepository: ProfessionalsRepository;
    hasUserAccessToUnitChecker: (userId: string, unitId: string) => Promise<boolean>;
};

export const professionalsRoutes = ({
    professionalsRepository,
    hasUserAccessToUnitChecker,
}: ProfessionalsRoutesOptions) => {
    const professionalsService = new ProfessionalsService(professionalsRepository, hasUserAccessToUnitChecker);
    const resolveRequestScope = (context: { request: Request; user?: { id?: string } }) => {
        const userId = getAuthenticatedUserId(context);

        if (!userId) {
            return { error: "unauthorized" as const };
        }

        try {
            const unitId = getRequiredUnitIdFromRequest(context.request);

            return { userId, unitId };
        } catch {
            return { error: "invalid_unit" as const };
        }
    };

    return new Elysia({ name: "professionals-routes", prefix: "/professionals" })
        .post(
            "/",
            async (context) => {
                const { body, status } = context;
                const scope = resolveRequestScope(context as { request: Request; user?: { id?: string } });

                if ("error" in scope) {
                    if (scope.error === "unauthorized") {
                        return status(401, { message: "Unauthorized" });
                    }

                    return status(400, { message: invalidOrMissingUnitHeaderMessage });
                }

                try {
                    const createPayload = {
                        isActive: body.isActive,
                        userId: scope.userId,
                    };
                    const professional = await professionalsService.createProfessional(
                        scope.userId,
                        scope.unitId,
                        createPayload,
                    );

                    return status(201, professional);
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
                    description: "Creates a professional linked to a user.",
                    tags: ["Professionals"],
                },
                response: {
                    201: professionalProfileSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    400: t.Object({ message: t.Literal("Invalid or missing unit header") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    409: t.Object({ message: t.Literal("Professional already exists for this user") }),
                    500: professionalsErrorSchema,
                },
            },
        )
        .get(
            "/",
            async (context) => {
                const { status } = context;
                const scope = resolveRequestScope(context as { request: Request; user?: { id?: string } });

                if ("error" in scope) {
                    if (scope.error === "unauthorized") {
                        return status(401, { message: "Unauthorized" });
                    }

                    return status(400, { message: invalidOrMissingUnitHeaderMessage });
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
                    description: "Returns professionals for the unit selected in x-unit-id header.",
                    tags: ["Professionals"],
                },
                response: {
                    200: z.array(professionalProfileSchema),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    400: t.Object({ message: t.Literal("Invalid or missing unit header") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    500: professionalsErrorSchema,
                },
            },
        )
        .get(
            "/:id",
            async (context) => {
                const { params, status } = context;
                const scope = resolveRequestScope(context as { request: Request; user?: { id?: string } });

                if ("error" in scope) {
                    if (scope.error === "unauthorized") {
                        return status(401, { message: "Unauthorized" });
                    }

                    return status(400, { message: invalidOrMissingUnitHeaderMessage });
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
                    200: professionalProfileSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    400: t.Object({ message: t.Literal("Invalid or missing unit header") }),
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
                const scope = resolveRequestScope(context as { request: Request; user?: { id?: string } });

                if ("error" in scope) {
                    if (scope.error === "unauthorized") {
                        return status(401, { message: "Unauthorized" });
                    }

                    return status(400, { message: invalidOrMissingUnitHeaderMessage });
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
                    400: t.Object({ message: t.Literal("Invalid or missing unit header") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    404: t.Object({ message: t.Literal("Professional not found") }),
                    409: t.Object({ message: t.Literal("Professional already exists for this user") }),
                    500: professionalsErrorSchema,
                },
            },
        )
        .delete(
            "/:id",
            async (context) => {
                const { params, status } = context;
                const scope = resolveRequestScope(context as { request: Request; user?: { id?: string } });

                if ("error" in scope) {
                    if (scope.error === "unauthorized") {
                        return status(401, { message: "Unauthorized" });
                    }

                    return status(400, { message: invalidOrMissingUnitHeaderMessage });
                }

                try {
                    await professionalsService.deleteProfessional(scope.userId, params.id, scope.unitId);

                    return status(200, { message: "Professional deleted" });
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
                    summary: "Delete professional",
                    description: "Deletes a professional by id.",
                    tags: ["Professionals"],
                },
                response: {
                    200: t.Object({ message: t.Literal("Professional deleted") }),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    400: t.Object({ message: t.Literal("Invalid or missing unit header") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    404: t.Object({ message: t.Literal("Professional not found") }),
                    500: professionalsErrorSchema,
                },
            },
        );
};
