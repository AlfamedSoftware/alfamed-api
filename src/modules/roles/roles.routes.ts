import { Elysia, t } from "elysia";
import { z } from "zod";
import type { RolesRepository } from "./roles.repository.js";
import { RolesService } from "./roles.service.js";
import {
    roleSchema,
    rolesErrorSchema,
} from "./roles.schemas.js";

type RolesRoutesOptions = {
    rolesRepository: RolesRepository;
};

export const rolesRoutes = ({ rolesRepository }: RolesRoutesOptions) => {
    const rolesService = new RolesService(rolesRepository);

    return new Elysia({ name: "roles-routes", prefix: "/roles" })
        .get(
            "/",
            async ({ query, status }) => {
                try {
                    const roles = await rolesService.listRoles({
                        isActive: query.isActive,
                        internal: query.internal,
                    });

                    return status(200, roles);
                } catch (error) {
                    console.error("[roles][list]", error);

                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                query: t.Object({
                    isActive: t.Optional(t.BooleanString()),
                    internal: t.Optional(t.BooleanString()),
                }),
                detail: {
                    summary: "List roles",
                    description: "Returns roles, optionally filtered by active status and internal flag.",
                    tags: ["Roles"],
                },
                response: {
                    200: z.array(roleSchema),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    500: rolesErrorSchema,
                },
            },
        );
};
