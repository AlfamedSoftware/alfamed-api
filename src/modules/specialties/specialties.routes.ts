import { Elysia, t } from "elysia";
import { getAuthenticatedUserId } from "../../http/plugins/unit-access.js";
import { isDomainError } from "../../http/plugins/domain-error.js";
import { getUnitIdFromRequest } from "../../http/plugins/unit-context.js";
import type { SpecialtiesRepository } from "./specialties.repository.js";
import { SpecialtiesService } from "./specialties.service.js";
import {
    specialtiesErrorSchema,
    specialtiesListSchema,
    createSpecialtySchema,
    updateSpecialtySchema,
    specialtySchema,
} from "./specialties.schemas.js";

const unitSelectionRequiredMessage = "Selecione uma unidade para continuar";

type SpecialtiesRoutesOptions = {
    specialtiesRepository: SpecialtiesRepository;
    hasUserAccessToUnitChecker: (userId: string, unitId: string) => Promise<boolean>;
};

export const specialtiesRoutes = ({
    specialtiesRepository,
    hasUserAccessToUnitChecker,
}: SpecialtiesRoutesOptions) => {
    const specialtiesService = new SpecialtiesService(
        specialtiesRepository,
        hasUserAccessToUnitChecker,
    );

    return new Elysia({ name: "specialties-routes", prefix: "/specialties" })
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
                    const created = await specialtiesService.createSpecialtyForUnit(userId, selectedUnitId, body as any);

                    return status(201, created);
                } catch (error) {
                    if (isDomainError(error, "FORBIDDEN")) {
                        return status(403, { message: "Forbidden" });
                    }

                    if (isDomainError(error, "SPECIALTY_NAME_ALREADY_EXISTS")) {
                        return status(409, { message: "Essa especialidade já está cadastrada nessa unidade" });
                    }

                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                body: createSpecialtySchema,
                detail: {
                    summary: "Create specialty",
                    description: "Creates a specialty for the selected unit.",
                    tags: ["Specialties"],
                },
                response: {
                    201: specialtySchema,
                    400: t.Object({ message: t.Literal("Selecione uma unidade para continuar") }),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    409: t.Object({ message: t.Literal("Essa especialidade já está cadastrada nessa unidade") }),
                    500: specialtiesErrorSchema,
                },
            },
        )
        .get(
            "/list-specialties-by-unit/:unitId",
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
                    const specialties = await specialtiesService.listSpecialtiesByUnit(userId, params.unitId);

                    return status(200, specialties);
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
                    unitId: t.String({ format: "uuid" }),
                }),
                detail: {
                    summary: "List specialties by unit",
                    description: "Returns the specialties for a specified unit.",
                    tags: ["Specialties"],
                },
                response: {
                    200: specialtiesListSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    400: t.Object({ message: t.Literal("Selecione uma unidade para continuar") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    500: specialtiesErrorSchema,
                },
            },
        )
        .get(
            "/:specialtyId",
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
                    const specialty = await specialtiesService.getSpecialtyById(
                        userId,
                        selectedUnitId,
                        params.specialtyId,
                    );

                    if (!specialty) {
                        return status(404, { message: "Specialty not found" });
                    }

                    return status(200, specialty);
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
                    specialtyId: t.String({ format: "uuid" }),
                }),
                detail: {
                    summary: "Get specialty by id",
                    description: "Returns all data for a specialty by id within the selected unit.",
                    tags: ["Specialties"],
                },
                response: {
                    200: specialtySchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    400: t.Object({ message: t.Literal("Selecione uma unidade para continuar") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    404: t.Object({ message: t.Literal("Specialty not found") }),
                    500: specialtiesErrorSchema,
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
                    const { specialtyId, ...payload } = body as {
                        specialtyId: string;
                        name?: string;
                        isActive?: boolean;
                    };

                    const updated = await specialtiesService.updateSpecialtyForUnit(
                        userId,
                        selectedUnitId,
                        specialtyId,
                        payload,
                    );

                    if (!updated) {
                        return status(404, { message: "Specialty not found" });
                    }

                    return status(200, updated);
                } catch (error) {
                    if (isDomainError(error, "FORBIDDEN")) {
                        return status(403, { message: "Forbidden" });
                    }

                    if (isDomainError(error, "SPECIALTY_NAME_ALREADY_EXISTS")) {
                        return status(409, { message: "Essa especialidade já está cadastrada nessa unidade" });
                    }

                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                body: updateSpecialtySchema,
                detail: {
                    summary: "Update specialty",
                    description: "Updates a specialty by id (sent in body) within the selected unit.",
                    tags: ["Specialties"],
                },
                response: {
                    200: specialtySchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    400: t.Object({ message: t.Literal("Selecione uma unidade para continuar") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    404: t.Object({ message: t.Literal("Specialty not found") }),
                    409: t.Object({ message: t.Literal("Essa especialidade já está cadastrada nessa unidade") }),
                    500: specialtiesErrorSchema,
                },
            },
        );
};