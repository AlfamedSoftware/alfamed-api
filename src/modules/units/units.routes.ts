import { Elysia, t } from "elysia";
import {
    getValidatedUnitIdFromRequest,
    invalidOrMissingUnitHeaderMessage,
} from "@/http/plugins/unit-access";
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

    return new Elysia({ name: "units-routes", prefix: "/units" })
        .post(
            "/",
            async (context) => {
                const { body, status } = context;
                const professionalId = (context as { user?: { id?: string } }).user?.id;

                if (!professionalId) {
                    return status(401, { message: "Unauthorized" });
                }

                try {
                    const unit = await unitsService.createUnit(professionalId, body);

                    return status(201, unit);
                } catch {
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                body: createUnitSchema,
                detail: {
                    summary: "Create unit",
                    description: "Creates a unit.",
                    tags: ["Units"],
                },
                response: {
                    201: unitProfileSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    500: unitsErrorSchema,
                },
            },
        )
        .get(
            "/:id",
            async (context) => {
                const { status } = context;
                const professionalId = (context as { user?: { id?: string } }).user?.id;

                if (!professionalId) {
                    return status(401, { message: "Unauthorized" });
                }

                const unitId = getValidatedUnitIdFromRequest(context.request);

                if (!unitId) {
                    return status(400, { message: invalidOrMissingUnitHeaderMessage });
                }

                try {
                    const unit = await unitsService.getUnitById(professionalId, unitId);

                    return status(200, unit);
                } catch (error) {
                    if (error instanceof Error && error.message === "Forbidden") {
                        return status(403, { message: "Forbidden" });
                    }
                    if (error instanceof Error && error.message === "Unit not found") {
                        return status(404, { message: "Unit not found" });
                    }

                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                detail: {
                    summary: "Get unit",
                    description: "Gets the unit selected in x-unit-id header if it's linked to the authenticated professional. The :id param is ignored and kept only for backward compatibility.",
                    tags: ["Units"],
                },
                response: {
                    200: unitProfileSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    400: t.Object({ message: t.Literal("Invalid or missing unit header") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    404: t.Object({ message: t.Literal("Unit not found") }),
                    500: unitsErrorSchema,
                },
            },
        )
        .patch(
            "/",
            async (context) => {
                const { body, status } = context;
                const professionalId = (context as { user?: { id?: string } }).user?.id;

                if (!professionalId) {
                    return status(401, { message: "Unauthorized" });
                }

                const unitId = getValidatedUnitIdFromRequest(context.request);

                if (!unitId) {
                    return status(400, { message: invalidOrMissingUnitHeaderMessage });
                }

                try {
                    const unit = await unitsService.updateUnit(professionalId, unitId, body);

                    return status(200, unit);
                } catch (error) {
                    if (error instanceof Error && error.message === "Forbidden") {
                        return status(403, { message: "Forbidden" });
                    }
                    if (error instanceof Error && error.message === "Unit not found") {
                        return status(404, { message: "Unit not found" });
                    }

                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                body: updateUnitSchema,
                detail: {
                    summary: "Update unit",
                    description: "Updates the unit selected in x-unit-id header if it's linked to the authenticated professional.",
                    tags: ["Units"],
                },
                response: {
                    200: unitProfileSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    400: t.Object({ message: t.Literal("Invalid or missing unit header") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    404: t.Object({ message: t.Literal("Unit not found") }),
                    500: unitsErrorSchema,
                },
            },
        )
        .delete(
            "/",
            async (context) => {
                const { status } = context;
                const professionalId = (context as { user?: { id?: string } }).user?.id;

                if (!professionalId) {
                    return status(401, { message: "Unauthorized" });
                }

                const unitId = getValidatedUnitIdFromRequest(context.request);

                if (!unitId) {
                    return status(400, { message: invalidOrMissingUnitHeaderMessage });
                }

                try {
                    await unitsService.deleteUnit(professionalId, unitId);

                    return status(200, { message: "Unit deleted" });
                } catch (error) {
                    if (error instanceof Error && error.message === "Forbidden") {
                        return status(403, { message: "Forbidden" });
                    }
                    if (error instanceof Error && error.message === "Unit not found") {
                        return status(404, { message: "Unit not found" });
                    }

                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                detail: {
                    summary: "Delete unit",
                    description: "Deletes the unit selected in x-unit-id header if it's linked to the authenticated professional.",
                    tags: ["Units"],
                },
                response: {
                    200: t.Object({ message: t.Literal("Unit deleted") }),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    400: t.Object({ message: t.Literal("Invalid or missing unit header") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    404: t.Object({ message: t.Literal("Unit not found") }),
                    500: unitsErrorSchema,
                },
            },
        );
};
