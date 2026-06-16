import { Elysia, t } from "elysia";
import { getAuthenticatedUserId } from "../../http/plugins/unit-access.js";
import { isDomainError } from "../../http/plugins/domain-error.js";
import { getUnitIdFromRequest } from "../../http/plugins/unit-context.js";
import type { ProfessionalUnitSpecialtiesRepository } from "./professional-unit-specialties.repository.js";
import { ProfessionalUnitSpecialtiesService } from "./professional-unit-specialties.service.js";
import {
    professionalUnitSpecialtiesErrorSchema,
    professionalUnitSpecialtyListSchema,
    professionalUnitSpecialtySchema,
    createProfessionalUnitSpecialtySchema,
    updateProfessionalUnitSpecialtySchema,
} from "./professional-unit-specialties.schemas.js";

const unitSelectionRequiredMessage = "Selecione uma unidade para continuar";

type ProfessionalUnitSpecialtiesRoutesOptions = {
    professionalUnitSpecialtiesRepository: ProfessionalUnitSpecialtiesRepository;
    hasUserAccessToUnitChecker: (userId: string, unitId: string) => Promise<boolean>;
};

export const professionalUnitSpecialtiesRoutes = ({
    professionalUnitSpecialtiesRepository,
    hasUserAccessToUnitChecker,
}: ProfessionalUnitSpecialtiesRoutesOptions) => {
    const professionalUnitSpecialtiesService = new ProfessionalUnitSpecialtiesService(
        professionalUnitSpecialtiesRepository,
    );

    return new Elysia({ name: "professional-unit-specialties-routes", prefix: "/professional-unit-specialties" })
        .get(
            "/list-by-professional-unit/:professionalUnitId",
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
                    const specialties = await professionalUnitSpecialtiesService.listByProfessionalUnit(params.professionalUnitId);
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
                    professionalUnitId: t.String({ format: "uuid" }),
                }),
                detail: {
                    summary: "List specialties by professional unit",
                    description: "Returns the specialties for a specified professional unit.",
                    tags: ["Professional Unit Specialties"],
                },
                response: {
                    200: professionalUnitSpecialtyListSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    400: t.Object({ message: t.Literal("Selecione uma unidade para continuar") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    500: professionalUnitSpecialtiesErrorSchema,
                },
            },
        )
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
                    const specialty = await professionalUnitSpecialtiesService.create(body as any);
                    return status(201, specialty);
                } catch (error) {
                    if (isDomainError(error, "FORBIDDEN")) {
                        return status(403, { message: "Forbidden" });
                    }

                    if (isDomainError(error, "PROFESSIONAL_UNIT_SPECIALTY_ALREADY_EXISTS")) {
                        return status(409, { message: "Especialidade já cadastrada para essa unidade profissional" });
                    }

                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                body: createProfessionalUnitSpecialtySchema,
                detail: {
                    summary: "Create professional unit specialty",
                    description: "Creates a specialty association for a professional unit.",
                    tags: ["Professional Unit Specialties"],
                },
                response: {
                    201: professionalUnitSpecialtySchema,
                    400: t.Object({ message: t.Literal("Selecione uma unidade para continuar") }),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    409: t.Object({ message: t.Literal("Especialidade já cadastrada para essa unidade profissional") }),
                    500: professionalUnitSpecialtiesErrorSchema,
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
                    const specialty = await professionalUnitSpecialtiesService.update(body as any);
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
                body: updateProfessionalUnitSpecialtySchema,
                detail: {
                    summary: "Update professional unit specialty",
                    description: "Updates a professional unit specialty association.",
                    tags: ["Professional Unit Specialties"],
                },
                response: {
                    200: professionalUnitSpecialtySchema,
                    400: t.Object({ message: t.Literal("Selecione uma unidade para continuar") }),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    500: professionalUnitSpecialtiesErrorSchema,
                },
            },
        );
};
