import { Elysia, t } from "elysia";
import { z } from "zod";
import { getUniqueConstraintField, isUniqueConstraintError } from "../../http/plugins/db-errors.js";
import { isDomainError } from "../../http/plugins/domain-error.js";
import { assertInternalAdminAccess } from "../../http/plugins/admin-access.js";
import { AdminUpmRepository } from "./admin-upm.repository.js";
import {
    adminUpmErrorSchema,
    adminUpmUserSchema,
    createAdminUpmUserSchema,
} from "./admin-upm.schemas.js";
import { AdminUpmService } from "./admin-upm.service.js";
import type { db as dbType } from "../../db/client.js";

type DatabaseClient = typeof dbType;

type AdminUpmRoutesOptions = {
    db: DatabaseClient;
};

export const adminUpmRoutes = ({ db }: AdminUpmRoutesOptions) => {
    const adminUpmRepository = new AdminUpmRepository(db);
    const adminUpmService = new AdminUpmService(adminUpmRepository);
    const resolveAdminAccess = (context: { user?: { email?: string }; status: (code: number, body: { message: string }) => unknown }) => {
        try {
            assertInternalAdminAccess(context as { user?: { email?: string } });
            return true;
        } catch {
            context.status(403, { message: "Forbidden" });
            return false;
        }
    };

    return new Elysia({ name: "admin-upm-routes", prefix: "/admin/upm" })
        .get(
            "/users",
            async (context) => {
                const { status } = context;
                if (!resolveAdminAccess(context)) {
                    return;
                }

                try {
                    const users = await adminUpmService.listInternalAlfamedUsers();

                    return status(200, users);
                } catch (error) {
                    console.error("[admin][upm][users][list]", error);
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                detail: {
                    summary: "List internal Alfamed users",
                    description: "Lists all internal professionals that have role internal_alfamed.",
                    tags: ["Admin"],
                },
                response: {
                    200: z.array(adminUpmUserSchema),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    500: adminUpmErrorSchema,
                },
            },
        )
        .post(
            "/users",
            async (context) => {
                const { body, status } = context;
                if (!resolveAdminAccess(context)) {
                    return;
                }

                try {
                    const created = await adminUpmService.createInternalAlfamedUser(body);

                    return status(201, created);
                } catch (error) {
                    console.error("[admin][upm][users][create]", error);
                    if (isDomainError(error, "UNIT_NOT_FOUND")) {
                        return status(404, { message: "Unit not found" });
                    }

                    if (isUniqueConstraintError(error)) {
                        const duplicateField = getUniqueConstraintField(error);

                        if (duplicateField === "email") {
                            return status(409, { message: "User e-mail already exists" });
                        }

                        if (duplicateField === "cpf") {
                            return status(409, { message: "User CPF already exists" });
                        }

                        return status(409, { message: "Duplicate user or professional data" });
                    }

                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                body: createAdminUpmUserSchema,
                detail: {
                    summary: "Create internal Alfamed user",
                    description: "Creates user + professional + professional-unit and applies internal_alfamed role.",
                    tags: ["Admin"],
                },
                response: {
                    201: adminUpmUserSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    404: t.Object({ message: t.Literal("Unit not found") }),
                    409: t.Object({ message: t.String() }),
                    500: adminUpmErrorSchema,
                },
            },
        );
};
