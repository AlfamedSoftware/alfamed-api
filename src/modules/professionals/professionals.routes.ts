import { Elysia, t } from "elysia";
import { z } from "zod";
import {
    getValidatedUnitIdFromRequest,
    invalidOrMissingUnitHeaderMessage,
} from "@/http/plugins/unit-access";
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

    return new Elysia({ name: "professionals-routes", prefix: "/professionals" })
        .post(
            "/",
            async (context) => {
                const { body, status } = context;
                const userId = (context as { user?: { id?: string } }).user?.id;

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                const unitId = getValidatedUnitIdFromRequest(context.request);

                if (!unitId) {
                    return status(400, { message: invalidOrMissingUnitHeaderMessage });
                }

                try {
                    const createPayload = {
                        isActive: body.isActive,
                        userId,
                    };
                    const professional = await professionalsService.createProfessional(userId, unitId, createPayload);

                    return status(201, professional);
                } catch (error) {
                    if (error instanceof Error && error.message === "Forbidden") {
                        return status(403, { message: "Forbidden" });
                    }
                    if (isUniqueConstraintError(error)) {
                        return status(409, { message: "Professional already exists for this user" });
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
                const userId = (context as { user?: { id?: string } }).user?.id;

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                const unitId = getValidatedUnitIdFromRequest(context.request);

                if (!unitId) {
                    return status(400, { message: invalidOrMissingUnitHeaderMessage });
                }

                try {
                    const professionals = await professionalsService.listProfessionals(userId, unitId);

                    return status(200, professionals);
                } catch (error) {
                    if (error instanceof Error && error.message === "Forbidden") {
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
                const userId = (context as { user?: { id?: string } }).user?.id;

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                const unitId = getValidatedUnitIdFromRequest(context.request);

                if (!unitId) {
                    return status(400, { message: invalidOrMissingUnitHeaderMessage });
                }

                try {
                    const professional = await professionalsService.getProfessionalById(
                        userId,
                        params.id,
                        unitId,
                    );

                    return status(200, professional);
                } catch (error) {
                    if (error instanceof Error && error.message === "Professional not found") {
                        return status(404, { message: "Professional not found" });
                    }
                    if (error instanceof Error && error.message === "Forbidden") {
                        return status(403, { message: "Forbidden" });
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
                const userId = (context as { user?: { id?: string } }).user?.id;

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                const unitId = getValidatedUnitIdFromRequest(context.request);

                if (!unitId) {
                    return status(400, { message: invalidOrMissingUnitHeaderMessage });
                }

                try {
                    const professional = await professionalsService.updateProfessional(
                        userId,
                        params.id,
                        unitId,
                        body,
                    );

                    return status(200, professional);
                } catch (error) {
                    if (error instanceof Error && error.message === "Professional not found") {
                        return status(404, { message: "Professional not found" });
                    }
                    if (error instanceof Error && error.message === "Forbidden") {
                        return status(403, { message: "Forbidden" });
                    }
                    if (isUniqueConstraintError(error)) {
                        return status(409, { message: "Professional already exists for this user" });
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
                const userId = (context as { user?: { id?: string } }).user?.id;

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                const unitId = getValidatedUnitIdFromRequest(context.request);

                if (!unitId) {
                    return status(400, { message: invalidOrMissingUnitHeaderMessage });
                }

                try {
                    await professionalsService.deleteProfessional(userId, params.id, unitId);

                    return status(200, { message: "Professional deleted" });
                } catch (error) {
                    if (error instanceof Error && error.message === "Professional not found") {
                        return status(404, { message: "Professional not found" });
                    }
                    if (error instanceof Error && error.message === "Forbidden") {
                        return status(403, { message: "Forbidden" });
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
