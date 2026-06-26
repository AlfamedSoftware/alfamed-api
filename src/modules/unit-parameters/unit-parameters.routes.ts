import { Elysia, t } from "elysia";
import { getAuthenticatedUserId } from "../../http/plugins/unit-access.js";
import { UnitParametersService } from "./unit-parameters.service.js";
import { UnitParametersRepository } from "./unit-parameters.repository.js";
import { unitParametersErrorSchema } from "./unit-parameters.schemas.js";
import type { db as dbType } from "../../db/client.js";

type DatabaseClient = typeof dbType;

export const unitParametersRoutes = ({ db }: { db: DatabaseClient }) => {
    const unitParametersRepository = new UnitParametersRepository(db);
    const unitParametersService = new UnitParametersService(unitParametersRepository);

    return new Elysia({ name: "unit-parameters-routes", prefix: "/unit-parameters" })
        .get(
            "/get-parameters/:unitId",
            async (context) => {
                const { params, status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                try {
                    const parameters = await unitParametersService.getParametersByUnitId(params.unitId);

                    if (!parameters) {
                        return status(404, { message: "Unit parameters not found" });
                    }

                    return status(200, parameters);
                } catch (error) {
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                params: t.Object({
                    unitId: t.String({ format: "uuid" }),
                }),
                detail: {
                    summary: "Get unit parameters",
                    description: "Returns the parameters for a given unit.",
                    tags: ["Unit Parameters"],
                },
                response: {
                    200: t.Object({
                        id: t.String({ format: "uuid" }),
                        unitId: t.String({ format: "uuid" }),
                        modulo1GestaoExames: t.Boolean(),
                    }),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    404: t.Object({ message: t.Literal("Unit parameters not found") }),
                    500: unitParametersErrorSchema,
                },
            },
        );
};
