import { Elysia, t } from "elysia";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getUniqueConstraintField, isUniqueConstraintError } from "../../http/plugins/db-errors.js";
import { isDomainError } from "../../http/plugins/domain-error.js";
import { AdminUnitsRepository } from "./admin-units.repository.js";
import {
    adminErrorSchema,
    adminProfessionalSchema,
    adminUnitSchema,
    createAdminProfessionalSchema,
    createAdminUnitSchema,
    updateAdminUnitSchema,
} from "./admin-units.schemas.js";
import { AdminUnitsService } from "./admin-units.service.js";
import type { db as dbType } from "../../db/client.js";
import { professionals } from "../../db/schema/professionals.js";
import { professionalUnits } from "../../db/schema/professional-units.js";
import { professionalUnitRoles } from "../../db/schema/professional-unit-roles.js";
import { roles } from "../../db/schema/roles.js";

type DatabaseClient = typeof dbType;

type AdminUnitsRoutesOptions = {
    db: DatabaseClient;
};

export const adminUnitsRoutes = ({ db }: AdminUnitsRoutesOptions) => {
    const adminUnitsRepository = new AdminUnitsRepository(db);
    const adminUnitsService = new AdminUnitsService(adminUnitsRepository);

    const resolveAdminAccess = async (context: any) => {
        const { user } = context;

        if (!user?.id) {
            return false;
        }

        try {
            const [professional] = await db
                .select()
                .from(professionals)
                .where(eq(professionals.userId, user.id))
                .limit(1);

            if (!professional) {
                return false;
            }

            const rows = await db
                .select()
                .from(professionalUnitRoles)
                .innerJoin(professionalUnits, eq(professionalUnitRoles.professionalUnitId, professionalUnits.id))
                .innerJoin(roles, eq(professionalUnitRoles.roleId, roles.id))
                .where(eq(professionalUnits.professionalId, professional.id));

            const hasInternalAlfamed = rows.some((r: any) => {
                try {
                    return r?.roles?.key === "internal_alfamed";
                } catch {
                    return false;
                }
            });

            return hasInternalAlfamed;
        } catch (error) {
            console.error("[admin][access][resolve]", error);
            return false;
        }
    };

    return new Elysia({ name: "admin-units-routes", prefix: "/admin/units" })
        .get(
            "/",
            async (context) => {
                const { status } = context;
                try {
                    const units = await adminUnitsService.listUnits();

                    return status(200, units);
                } catch (error) {
                    console.error("[admin][units][list]", error);
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                detail: {
                    summary: "List internal units",
                    description: "Lists all units for internal @alfamed.com administrators.",
                    tags: ["Units"],
                },
                response: {
                    200: z.array(adminUnitSchema),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    500: adminErrorSchema,
                },
            },
        )
        .post(
            "/",
            async (context) => {
                const { body, status } = context;
                try {
                    const unit = await adminUnitsService.createUnit(body);

                    return status(201, unit);
                } catch (error) {
                    console.error("[admin][units][create]", error);
                    if (isUniqueConstraintError(error)) {
                        const duplicateField = getUniqueConstraintField(error);

                        if (duplicateField === "email") {
                            return status(409, { message: "Owner e-mail already exists" });
                        }

                        if (duplicateField === "cpf") {
                            return status(409, { message: "Owner CPF already exists" });
                        }

                        if (duplicateField === "cnpj") {
                            return status(409, { message: "Unit CNPJ already exists" });
                        }

                        return status(409, { message: "Duplicate user or unit data" });
                    }

                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                body: createAdminUnitSchema,
                detail: {
                    summary: "Create internal unit",
                    description:
                        "Creates an unit with owner user, owner professional profile and professional-unit link.",
                    tags: ["Units"],
                },
                response: {
                    201: adminUnitSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    409: t.Object({ message: t.String() }),
                    500: adminErrorSchema,
                },
            },
        )
        .get(
            "/:id",
            async (context) => {
                const { params, status } = context;
                if (!(await resolveAdminAccess(context))) {
                    return status(403, { message: "Forbidden" });
                }
                try {
                    const unit = await adminUnitsService.getUnitById(params.id);

                    return status(200, unit);
                } catch (error) {
                    console.error("[admin][units][get]", error);
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
                    summary: "Get internal unit",
                    description: "Gets an internal unit by id.",
                    tags: ["Units"],
                },
                response: {
                    200: adminUnitSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    404: t.Object({ message: t.Literal("Unit not found") }),
                    500: adminErrorSchema,
                },
            },
        )
        .patch(
            "/:id",
            async (context) => {
                const { params, body, status } = context;
                if (!(await resolveAdminAccess(context))) {
                    return status(403, { message: "Forbidden" });
                }
                try {
                    const unit = await adminUnitsService.updateUnit(params.id, body);

                    return status(200, unit);
                } catch (error) {
                    console.error("[admin][units][update]", error);
                    if (isDomainError(error, "UNIT_NOT_FOUND")) {
                        return status(404, { message: "Unit not found" });
                    }

                    if (isUniqueConstraintError(error)) {
                        return status(409, { message: "Duplicate user or unit data" });
                    }

                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                params: t.Object({
                    id: t.String({ format: "uuid" }),
                }),
                body: updateAdminUnitSchema,
                detail: {
                    summary: "Update internal unit",
                    description: "Updates an internal unit by id.",
                    tags: ["Units"],
                },
                response: {
                    200: adminUnitSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    404: t.Object({ message: t.Literal("Unit not found") }),
                    409: t.Object({ message: t.Literal("Duplicate user or unit data") }),
                    500: adminErrorSchema,
                },
            },
        )
        .get(
            "/:id/professionals",
            async (context) => {
                const { params, status } = context;
                if (!(await resolveAdminAccess(context))) {
                    return status(403, { message: "Forbidden" });
                }
                try {
                    const professionals = await adminUnitsService.listUnitProfessionals(params.id);

                    return status(200, professionals);
                } catch (error) {
                    console.error("[admin][units][professionals][list]", error);
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
                    summary: "List unit professionals (internal)",
                    description: "Lists professionals linked to an unit.",
                    tags: ["Professionals"],
                },
                response: {
                    200: z.array(adminProfessionalSchema),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    404: t.Object({ message: t.Literal("Unit not found") }),
                    500: adminErrorSchema,
                },
            },
        )
        .post(
            "/:id/professionals",
            async (context) => {
                const { params, body, status } = context;
                if (!(await resolveAdminAccess(context))) {
                    return;
                }
                try {
                    const professional = await adminUnitsService.createUnitProfessional(params.id, body);

                    return status(201, professional);
                } catch (error) {
                    console.error("[admin][units][professionals][create]", error);
                    if (isDomainError(error, "UNIT_NOT_FOUND")) {
                        return status(404, { message: "Unit not found" });
                    }
                    if (isUniqueConstraintError(error)) {
                        return status(409, { message: "Duplicate professional or user data" });
                    }

                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                params: t.Object({
                    id: t.String({ format: "uuid" }),
                }),
                body: createAdminProfessionalSchema,
                detail: {
                    summary: "Create unit professional (internal)",
                    description: "Creates user + professional and links professional to the unit.",
                    tags: ["Professionals"],
                },
                response: {
                    201: adminProfessionalSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    404: t.Object({ message: t.Literal("Unit not found") }),
                    409: t.Object({ message: t.Literal("Duplicate professional or user data") }),
                    500: adminErrorSchema,
                },
            },
        );
};
