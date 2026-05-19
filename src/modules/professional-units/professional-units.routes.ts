import { Elysia, t } from "elysia";
import { isDomainError } from "../../http/plugins/domain-error.js";
import { getAuthenticatedUserId } from "../../http/plugins/unit-access.js";
import { getUnitIdFromRequest } from "../../http/plugins/unit-context.js";
import type { ProfessionalUnitsRepository } from "./professional-units.repository.js";
import { ProfessionalUnitsService } from "./professional-units.service.js";
import {
    createProfessionalUnitSchema,
    professionalUnitFullUpdateSchema,
    professionalUnitFullDataByUnitListSchema,
    professionalUnitFullDataSchema,
    professionalUnitProfileUpdateSchema,
    professionalUnitProfileSchema,
    professionalUnitsErrorSchema,
} from "./professional-units.schemas.js";

const unitSelectionRequiredMessage = "Selecione uma unidade para continuar";

type ProfessionalUnitsRoutesOptions = {
    professionalUnitsRepository: ProfessionalUnitsRepository;
    hasUserAccessToUnitChecker: (userId: string, unitId: string) => Promise<boolean>;
};

export const professionalUnitsRoutes = ({
    professionalUnitsRepository,
    hasUserAccessToUnitChecker,
}: ProfessionalUnitsRoutesOptions) => {
    const professionalUnitsService = new ProfessionalUnitsService(
        professionalUnitsRepository,
        hasUserAccessToUnitChecker,
    );

    return new Elysia({ name: "professional-units-routes", prefix: "/professional-units" })
        .post(
            "/",
            async (context) => {
                const { body, status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                try {
                    const professionalUnit = await professionalUnitsService.createProfessionalUnit(userId, body);

                    return status(201, professionalUnit);
                } catch (error) {
                    if (isDomainError(error, "FORBIDDEN")) {
                        return status(403, { message: "Forbidden" });
                    }

                    if (isDomainError(error, "PROFESSIONAL_NOT_FOUND")) {
                        return status(404, { message: "Professional not found" });
                    }

                    if (isDomainError(error, "PROFESSIONAL_UNIT_ALREADY_EXISTS")) {
                        return status(409, { message: "Professional unit already exists" });
                    }

                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                body: createProfessionalUnitSchema,
                detail: {
                    summary: "Create professional unit",
                    description:
                        "Creates a professional unit.",
                    tags: ["Professional Units"],
                },
                response: {
                    201: professionalUnitProfileSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    404: t.Object({ message: t.Literal("Professional not found") }),
                    409: t.Object({ message: t.Literal("Professional unit already exists") }),
                    500: professionalUnitsErrorSchema,
                },
            },
        )
        .get(
            "/list-professional-unit-full-data-by-unit/:unitId",
            async (context) => {
                const { params, status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                try {
                    const professionalUnits = await professionalUnitsService.listProfessionalUnitFullDataByUnit(
                        userId,
                        params.unitId,
                    );

                    return status(200, professionalUnits);
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
                    summary: "List professional unit full data by unit",
                    description:
                        "Returns professional unit full data for professionals linked to the specified unit.",
                    tags: ["Professional Units"],
                },
                response: {
                    200: professionalUnitFullDataByUnitListSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    500: professionalUnitsErrorSchema,
                },
            },
        )
        .get(
            "/professional-unit-full-data/:professionalUnitId",
            async (context) => {
                const { params, status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                const unitId = getUnitIdFromRequest(context.request);

                if (!unitId) {
                    return status(400, { message: unitSelectionRequiredMessage });
                }

                try {
                    const professionalUnit = await professionalUnitsService.getProfessionalUnitFullDataById(
                        userId,
                        unitId,
                        params.professionalUnitId,
                    );

                    return status(200, professionalUnit);
                } catch (error) {
                    if (isDomainError(error, "FORBIDDEN")) {
                        return status(403, { message: "Forbidden" });
                    }

                    if (isDomainError(error, "PROFESSIONAL_UNIT_NOT_FOUND")) {
                        return status(404, { message: "Professional unit not found" });
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
                    summary: "Get professional unit full data",
                    description:
                        "Returns professional unit full data scoped by the selected unit, including user, professional, roles and patients linked through the professional user.",
                    tags: ["Professional Units"],
                },
                response: {
                    200: professionalUnitFullDataSchema,
                    400: t.Object({ message: t.Literal("Selecione uma unidade para continuar") }),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    404: t.Object({ message: t.Literal("Professional unit not found") }),
                    500: professionalUnitsErrorSchema,
                },
            },
        )
        .get(
            "/:professionalUnitId",
            async (context) => {
                const { params, status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                const unitId = getUnitIdFromRequest(context.request);

                if (!unitId) {
                    return status(400, { message: unitSelectionRequiredMessage });
                }

                try {
                    const professionalUnit = await professionalUnitsService.getProfessionalUnitById(
                        userId,
                        unitId,
                        params.professionalUnitId,
                    );

                    return status(200, professionalUnit);
                } catch (error) {
                    if (isDomainError(error, "FORBIDDEN")) {
                        return status(403, { message: "Forbidden" });
                    }

                    if (isDomainError(error, "PROFESSIONAL_UNIT_NOT_FOUND")) {
                        return status(404, { message: "Professional unit not found" });
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
                    summary: "Get professional unit by id",
                    description:
                        "Returns all rows for the specified professional unit.",
                    tags: ["Professional Units"],
                },
                response: {
                    200: professionalUnitProfileSchema,
                    400: t.Object({ message: t.Literal("Selecione uma unidade para continuar") }),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    404: t.Object({ message: t.Literal("Professional unit not found") }),
                    500: professionalUnitsErrorSchema,
                },
            },
        )
        .patch(
            "/profile-update",
            async (context) => {
                const { body, status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                const unitId = getUnitIdFromRequest(context.request);

                if (!unitId) {
                    return status(400, { message: unitSelectionRequiredMessage });
                }

                try {
                    const updated = await professionalUnitsService.profileUpdate(userId, unitId, body);

                    return status(200, updated);
                } catch (error) {
                    if (isDomainError(error, "FORBIDDEN")) {
                        return status(403, { message: "Forbidden" });
                    }

                    if (isDomainError(error, "PROFESSIONAL_UNIT_NOT_FOUND")) {
                        return status(404, { message: "Professional unit not found" });
                    }

                    if (isDomainError(error, "EMAIL_ALREADY_EXISTS")) {
                        return status(409, { message: "Email already exists" });
                    }

                    if (isDomainError(error, "CPF_ALREADY_EXISTS")) {
                        return status(409, { message: "CPF already exists" });
                    }

                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                body: professionalUnitProfileUpdateSchema,
                detail: {
                    summary: "Profile update",
                    description:
                        "Updates user and professional data for the selected professional-unit relation. Only changed fields are persisted and cpf/email uniqueness is validated.",
                    tags: ["Professional Units"],
                },
                response: {
                    200: professionalUnitFullDataSchema,
                    400: t.Object({ message: t.Literal("Selecione uma unidade para continuar") }),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    404: t.Object({ message: t.Literal("Professional unit not found") }),
                    409: t.Object({ message: t.Union([t.Literal("Email already exists"), t.Literal("CPF already exists")]) }),
                    500: professionalUnitsErrorSchema,
                },
            },
        )
        .patch(
            "/full-update",
            async (context) => {
                const { body, status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                const unitId = getUnitIdFromRequest(context.request);

                if (!unitId) {
                    return status(400, { message: unitSelectionRequiredMessage });
                }

                try {
                    const updated = await professionalUnitsService.fullUpdate(userId, unitId, body);

                    return status(200, updated);
                } catch (error) {
                    if (isDomainError(error, "FORBIDDEN")) {
                        return status(403, { message: "Forbidden" });
                    }

                    if (isDomainError(error, "PROFESSIONAL_UNIT_NOT_FOUND")) {
                        return status(404, { message: "Professional unit not found" });
                    }

                    if (isDomainError(error, "ROLE_NOT_FOUND")) {
                        return status(404, { message: "Role not found" });
                    }

                    if (isDomainError(error, "EMAIL_ALREADY_EXISTS")) {
                        return status(409, { message: "Email already exists" });
                    }

                    if (isDomainError(error, "CPF_ALREADY_EXISTS")) {
                        return status(409, { message: "CPF already exists" });
                    }

                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                body: professionalUnitFullUpdateSchema,
                detail: {
                    summary: "Full update",
                    description:
                        "Updates user, professional, professional-unit, professional-unit-role and patient status data for the selected unit. Only changed fields are persisted and cpf/email uniqueness is validated.",
                    tags: ["Professional Units"],
                },
                response: {
                    200: professionalUnitFullDataSchema,
                    400: t.Object({ message: t.Literal("Selecione uma unidade para continuar") }),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    404: t.Object({ message: t.Union([t.Literal("Professional unit not found"), t.Literal("Role not found")]) }),
                    409: t.Object({ message: t.Union([t.Literal("Email already exists"), t.Literal("CPF already exists")]) }),
                    500: professionalUnitsErrorSchema,
                },
            },
        );
};
