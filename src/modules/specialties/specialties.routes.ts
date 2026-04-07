import { Elysia, t } from "elysia";
import { isDomainError } from "../../http/plugins/domain-error.js";
import { isUniqueConstraintError } from "../../http/plugins/db-errors.js";
import {
    getAuthenticatedUserId,
    getRequiredUnitIdFromRequest,
    invalidOrMissingUnitHeaderMessage,
} from "../../http/plugins/unit-access.js";
import type { SpecialtiesRepository } from "./specialties.repository.js";
import { SpecialtiesService } from "./specialties.service.js";
import {
    createSpecialtySchema,
    specialtiesErrorSchema,
    specialtyProfileSchema,
    updateSpecialtySchema,
} from "./specialties.schemas.js";

type SpecialtiesRoutesOptions = {
    specialtiesRepository: SpecialtiesRepository;
    hasUserAccessToUnitChecker: (userId: string, unitId: string) => Promise<boolean>;
};

export const specialtiesRoutes = ({
    specialtiesRepository,
    hasUserAccessToUnitChecker,
}: SpecialtiesRoutesOptions) => {
    const specialtiesService = new SpecialtiesService(specialtiesRepository, hasUserAccessToUnitChecker);

    const resolveAuthenticatedUser = (context: { user?: { id?: string } }) =>
        getAuthenticatedUserId(context);

    const resolveScope = (context: { request: Request; user?: { id?: string } }) => {
        const userId = resolveAuthenticatedUser(context);

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

    return new Elysia({ name: "specialties-routes", prefix: "/specialties" })
        .post(
            "/",
            async (context) => {
                const { body, status } = context;
                const scope = resolveScope(context as { request: Request; user?: { id?: string } });

                if ("error" in scope) {
                    if (scope.error === "unauthorized") {
                        return status(401, { message: "Unauthorized" });
                    }
                    return status(400, { message: invalidOrMissingUnitHeaderMessage });
                }

                try {
                    const specialty = await specialtiesService.createSpecialty(scope.userId, scope.unitId, body);
                    return status(201, specialty);
                } catch (error) {
                    if (isDomainError(error, "FORBIDDEN")) {
                        return status(403, { message: "Forbidden" });
                    }
                    if (isUniqueConstraintError(error)) {
                        return status(409, { message: "Specialty already exists" });
                    }
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                body: createSpecialtySchema,
                detail: {
                    summary: "Create specialty",
                    description: "Creates a specialty record.",
                    tags: ["Specialties"],
                },
                response: {
                    201: specialtyProfileSchema,
                    400: t.Object({ message: t.Literal("Invalid or missing unit header") }),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    409: t.Object({ message: t.Literal("Specialty already exists") }),
                    500: specialtiesErrorSchema,
                },
            },
        )
        .get(
            "/",
            async (context) => {
                const { status } = context;
                const scope = resolveScope(context as { request: Request; user?: { id?: string } });

                if ("error" in scope) {
                    if (scope.error === "unauthorized") {
                        return status(401, { message: "Unauthorized" });
                    }
                    return status(400, { message: invalidOrMissingUnitHeaderMessage });
                }

                try {
                    const specialties = await specialtiesService.listSpecialties(scope.userId, scope.unitId);
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
                detail: {
                    summary: "List specialties",
                    description: "Lists all specialties.",
                    tags: ["Specialties"],
                },
                response: {
                    200: specialtyProfileSchema.array(),
                    400: t.Object({ message: t.Literal("Invalid or missing unit header") }),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    500: specialtiesErrorSchema,
                },
            },
        )
        .get(
            "/:id",
            async (context) => {
                const { params, status } = context;
                const scope = resolveScope(context as { request: Request; user?: { id?: string } });

                if ("error" in scope) {
                    if (scope.error === "unauthorized") {
                        return status(401, { message: "Unauthorized" });
                    }
                    return status(400, { message: invalidOrMissingUnitHeaderMessage });
                }

                try {
                    const specialty = await specialtiesService.getSpecialtyById(
                        scope.userId,
                        scope.unitId,
                        params.id,
                    );
                    return status(200, specialty);
                } catch (error) {
                    if (isDomainError(error, "FORBIDDEN")) {
                        return status(403, { message: "Forbidden" });
                    }
                    if (isDomainError(error, "SPECIALTY_NOT_FOUND")) {
                        return status(404, { message: "Specialty not found" });
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
                    summary: "Get specialty by id",
                    description: "Returns a specialty by id.",
                    tags: ["Specialties"],
                },
                response: {
                    200: specialtyProfileSchema,
                    400: t.Object({ message: t.Literal("Invalid or missing unit header") }),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    404: t.Object({ message: t.Literal("Specialty not found") }),
                    500: specialtiesErrorSchema,
                },
            },
        )
        .patch(
            "/:id",
            async (context) => {
                const { params, body, status } = context;
                const scope = resolveScope(context as { request: Request; user?: { id?: string } });

                if ("error" in scope) {
                    if (scope.error === "unauthorized") {
                        return status(401, { message: "Unauthorized" });
                    }
                    return status(400, { message: invalidOrMissingUnitHeaderMessage });
                }

                try {
                    const specialty = await specialtiesService.updateSpecialty(
                        scope.userId,
                        scope.unitId,
                        params.id,
                        body,
                    );
                    return status(200, specialty);
                } catch (error) {
                    if (isDomainError(error, "FORBIDDEN")) {
                        return status(403, { message: "Forbidden" });
                    }
                    if (isDomainError(error, "SPECIALTY_NOT_FOUND")) {
                        return status(404, { message: "Specialty not found" });
                    }
                    if (isUniqueConstraintError(error)) {
                        return status(409, { message: "Specialty already exists" });
                    }
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                params: t.Object({ id: t.String({ format: "uuid" }) }),
                body: updateSpecialtySchema,
                detail: {
                    summary: "Update specialty",
                    description: "Updates a specialty by id.",
                    tags: ["Specialties"],
                },
                response: {
                    200: specialtyProfileSchema,
                    400: t.Object({ message: t.Literal("Invalid or missing unit header") }),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    404: t.Object({ message: t.Literal("Specialty not found") }),
                    409: t.Object({ message: t.Literal("Specialty already exists") }),
                    500: specialtiesErrorSchema,
                },
            },
        )
        .delete(
            "/:id",
            async (context) => {
                const { params, status } = context;
                const scope = resolveScope(context as { request: Request; user?: { id?: string } });

                if ("error" in scope) {
                    if (scope.error === "unauthorized") {
                        return status(401, { message: "Unauthorized" });
                    }
                    return status(400, { message: invalidOrMissingUnitHeaderMessage });
                }

                try {
                    await specialtiesService.deleteSpecialty(scope.userId, scope.unitId, params.id);
                    return status(200, { message: "Specialty deleted" });
                } catch (error) {
                    if (isDomainError(error, "FORBIDDEN")) {
                        return status(403, { message: "Forbidden" });
                    }
                    if (isDomainError(error, "SPECIALTY_NOT_FOUND")) {
                        return status(404, { message: "Specialty not found" });
                    }
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                params: t.Object({ id: t.String({ format: "uuid" }) }),
                detail: {
                    summary: "Delete specialty",
                    description: "Deletes a specialty by id.",
                    tags: ["Specialties"],
                },
                response: {
                    200: t.Object({ message: t.Literal("Specialty deleted") }),
                    400: t.Object({ message: t.Literal("Invalid or missing unit header") }),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    404: t.Object({ message: t.Literal("Specialty not found") }),
                    500: specialtiesErrorSchema,
                },
            },
        )
        .post(
            "/:id/professionals/:professionalId",
            async (context) => {
                const { params, status } = context;
                const scope = resolveScope(context as { request: Request; user?: { id?: string } });

                if ("error" in scope) {
                    if (scope.error === "unauthorized") {
                        return status(401, { message: "Unauthorized" });
                    }
                    return status(400, { message: invalidOrMissingUnitHeaderMessage });
                }

                try {
                    await specialtiesService.assignSpecialtyToProfessional(
                        scope.userId,
                        scope.unitId,
                        params.professionalId,
                        params.id,
                    );
                    return status(201, { message: "Specialty linked to professional" });
                } catch (error) {
                    if (isDomainError(error, "FORBIDDEN")) {
                        return status(403, { message: "Forbidden" });
                    }
                    if (isDomainError(error, "SPECIALTY_NOT_FOUND")) {
                        return status(404, { message: "Specialty not found" });
                    }
                    if (isDomainError(error, "PROFESSIONAL_NOT_FOUND")) {
                        return status(404, { message: "Professional not found" });
                    }
                    if (isUniqueConstraintError(error)) {
                        return status(409, { message: "Specialty already linked to professional" });
                    }
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                params: t.Object({
                    id: t.String({ format: "uuid" }),
                    professionalId: t.String({ format: "uuid" }),
                }),
                detail: {
                    summary: "Link specialty to professional",
                    description: "Links a specialty to a professional in the selected unit.",
                    tags: ["Specialties"],
                },
                response: {
                    201: t.Object({ message: t.Literal("Specialty linked to professional") }),
                    400: t.Object({ message: t.Literal("Invalid or missing unit header") }),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    404: t.Union([
                        t.Object({ message: t.Literal("Specialty not found") }),
                        t.Object({ message: t.Literal("Professional not found") }),
                    ]),
                    409: t.Object({ message: t.Literal("Specialty already linked to professional") }),
                    500: specialtiesErrorSchema,
                },
            },
        )
        .delete(
            "/:id/professionals/:professionalId",
            async (context) => {
                const { params, status } = context;
                const scope = resolveScope(context as { request: Request; user?: { id?: string } });

                if ("error" in scope) {
                    if (scope.error === "unauthorized") {
                        return status(401, { message: "Unauthorized" });
                    }
                    return status(400, { message: invalidOrMissingUnitHeaderMessage });
                }

                try {
                    await specialtiesService.removeSpecialtyFromProfessional(
                        scope.userId,
                        scope.unitId,
                        params.professionalId,
                        params.id,
                    );
                    return status(200, { message: "Specialty unlinked from professional" });
                } catch (error) {
                    if (isDomainError(error, "FORBIDDEN")) {
                        return status(403, { message: "Forbidden" });
                    }
                    if (isDomainError(error, "SPECIALTY_NOT_FOUND")) {
                        return status(404, { message: "Specialty not found" });
                    }
                    if (isDomainError(error, "PROFESSIONAL_NOT_FOUND")) {
                        return status(404, { message: "Professional not found" });
                    }
                    if (isDomainError(error, "SPECIALTY_LINK_NOT_FOUND")) {
                        return status(404, { message: "Specialty link not found" });
                    }
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                params: t.Object({
                    id: t.String({ format: "uuid" }),
                    professionalId: t.String({ format: "uuid" }),
                }),
                detail: {
                    summary: "Unlink specialty from professional",
                    description: "Removes a specialty link from a professional in the selected unit.",
                    tags: ["Specialties"],
                },
                response: {
                    200: t.Object({ message: t.Literal("Specialty unlinked from professional") }),
                    400: t.Object({ message: t.Literal("Invalid or missing unit header") }),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    404: t.Union([
                        t.Object({ message: t.Literal("Specialty not found") }),
                        t.Object({ message: t.Literal("Professional not found") }),
                        t.Object({ message: t.Literal("Specialty link not found") }),
                    ]),
                    500: specialtiesErrorSchema,
                },
            },
        )
        .get(
            "/professionals/:professionalId",
            async (context) => {
                const { params, status } = context;
                const scope = resolveScope(context as { request: Request; user?: { id?: string } });

                if ("error" in scope) {
                    if (scope.error === "unauthorized") {
                        return status(401, { message: "Unauthorized" });
                    }
                    return status(400, { message: invalidOrMissingUnitHeaderMessage });
                }

                try {
                    const specialties = await specialtiesService.listProfessionalSpecialties(
                        scope.userId,
                        scope.unitId,
                        params.professionalId,
                    );
                    return status(200, specialties);
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
                    professionalId: t.String({ format: "uuid" }),
                }),
                detail: {
                    summary: "List professional specialties",
                    description: "Lists specialties linked to a professional in the selected unit.",
                    tags: ["Specialties"],
                },
                response: {
                    200: specialtyProfileSchema.array(),
                    400: t.Object({ message: t.Literal("Invalid or missing unit header") }),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    404: t.Object({ message: t.Literal("Professional not found") }),
                    500: specialtiesErrorSchema,
                },
            },
        );
};
