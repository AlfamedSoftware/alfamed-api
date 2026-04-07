import { Elysia, t } from "elysia";
import { getAuthenticatedUserId } from "@/http/plugins/unit-access";
import { isDomainError } from "@/http/plugins/domain-error";
import type { UnitsRepository } from "./units.repository";
import { UnitsService } from "./units.service";
import {
    createUnitSchema,
    unitProfileSchema,
    unitsErrorSchema,
    updateUnitSchema,
} from "./units.schemas";

type UnitsRoutesOptions = {
    unitsRepository: UnitsRepository;
    hasUserAccessToUnitChecker: (userId: string, unitId: string) => Promise<boolean>;
};

export const unitsRoutes = ({ unitsRepository, hasUserAccessToUnitChecker }: UnitsRoutesOptions) => {
    const unitsService = new UnitsService(unitsRepository, hasUserAccessToUnitChecker);
    const resolveAuthenticatedUser = (context: { user?: { id?: string } }) =>
        getAuthenticatedUserId(context);

    return new Elysia({ name: "units-routes", prefix: "/units" })
        .post(
            "/",
            async (context) => {
                const { body, status } = context;
                const userId = resolveAuthenticatedUser(context as { user?: { id?: string } });

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                try {
                    const unit = await unitsService.createUnit(userId, body);

                    return status(201, unit);
                } catch (error) {
                    if (error instanceof Error && error.message === "Forbidden") {
                        return status(403, { message: "Forbidden" });
                    }

                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                body: createUnitSchema,
                detail: {
                    summary: "Create unit",
                    description:
                        "Creates a new unit linked to the authenticated professional. If the authenticated user is not linked to a professional, returns 403 Forbidden.",
                    tags: ["Units"],
                },
                response: {
                    201: unitProfileSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    500: unitsErrorSchema,
                },
            },
        )
        .get(
            "/:id",
            async (context) => {
                const { params, status } = context;
                const userId = resolveAuthenticatedUser(context as { user?: { id?: string } });

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                try {
                    const unit = await unitsService.getUnitById(userId, params.id);

                    return status(200, unit);
                } catch (error) {
                    if (isDomainError(error, "FORBIDDEN")) {
                        return status(403, { message: "Forbidden" });
                    }
                    if (isDomainError(error, "UNIT_NOT_FOUND")) {
                        return status(404, { message: "Unit not found" });
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
                    summary: "Get unit",
                    description: "Gets a unit by route id if the authenticated user belongs to that unit.",
                    tags: ["Units"],
                },
                response: {
                    200: unitProfileSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    404: t.Object({ message: t.Literal("Unit not found") }),
                    500: unitsErrorSchema,
                },
            },
        )
        .patch(
            "/:id",
            async (context) => {
                const { body, params, status } = context;
                const userId = resolveAuthenticatedUser(context as { user?: { id?: string } });

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                try {
                    const unit = await unitsService.updateUnit(userId, params.id, body);

                    return status(200, unit);
                } catch (error) {
                    if (isDomainError(error, "FORBIDDEN")) {
                        return status(403, { message: "Forbidden" });
                    }
                    if (isDomainError(error, "UNIT_NOT_FOUND")) {
                        return status(404, { message: "Unit not found" });
                    }

                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                params: t.Object({
                    id: t.String({ format: "uuid" }),
                }),
                body: updateUnitSchema,
                detail: {
                    summary: "Update unit",
                    description:
                        "Updates the unit selected by route id if the authenticated user has access to that unit.",
                    tags: ["Units"],
                },
                response: {
                    200: unitProfileSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    404: t.Object({ message: t.Literal("Unit not found") }),
                    500: unitsErrorSchema,
                },
            },
        )
        .delete(
            "/:id",
            async (context) => {
                const { params, status } = context;
                const userId = resolveAuthenticatedUser(context as { user?: { id?: string } });

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                try {
                    await unitsService.deleteUnit(userId, params.id);

                    return status(200, { message: "Unit deleted" });
                } catch (error) {
                    if (isDomainError(error, "FORBIDDEN")) {
                        return status(403, { message: "Forbidden" });
                    }
                    if (isDomainError(error, "UNIT_NOT_FOUND")) {
                        return status(404, { message: "Unit not found" });
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
                    summary: "Delete unit",
                    description:
                        "Deletes the unit selected by route id if the authenticated user has access to that unit.",
                    tags: ["Units"],
                },
                response: {
                    200: t.Object({ message: t.Literal("Unit deleted") }),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    404: t.Object({ message: t.Literal("Unit not found") }),
                    500: unitsErrorSchema,
                },
            },
        );
};
