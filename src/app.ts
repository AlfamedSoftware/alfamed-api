import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { usersRoutes } from "./modules/users/users.routes";
import type { UsersRepository } from "./modules/users/users.repository";
import { professionalsRoutes } from "./modules/professionals/professionals.routes";
import type { ProfessionalsRepository } from "./modules/professionals/professionals.repository";
import { unitsRoutes } from "./modules/units/units.routes";
import type { UnitsRepository } from "./modules/units/units.repository";
import { createHasUserAccessToUnitChecker } from "@/http/plugins/unit-access";
import type { db as dbType } from "@/db/client";

type ElysiaPlugin = Parameters<InstanceType<typeof Elysia>["use"]>[0];

type DatabaseClient = typeof dbType;

type BuildAppOptions = {
    db: DatabaseClient;
    usersRepository: UsersRepository;
    professionalsRepository?: ProfessionalsRepository;
    unitsRepository?: UnitsRepository;
    hasUserAccessToUnitChecker?: (userId: string, unitId: string) => Promise<boolean>;
    authPlugin: ElysiaPlugin;
    withDocs?: boolean;
};

export async function buildApp({
    db,
    usersRepository,
    professionalsRepository,
    unitsRepository,
    hasUserAccessToUnitChecker,
    authPlugin,
    withDocs = true,
}: BuildAppOptions) {
    const app = new Elysia();

    if (withDocs) {
        const { OpenAPI } = await import("./http/plugins/better-auth");

        app.use(
            openapi({
                path: "/openapi",
                documentation: {
                    tags: [
                        {
                            name: "Users",
                            description: "Operations about users",
                        },
                        {
                            name: "Units",
                            description: "Operations about units",
                        },
                        {
                            name: "Professionals",
                            description: "Operations about professionals",
                        },
                        {
                            name: "Better Auth",
                            description: "Authentication and session operations",
                        },
                    ],
                    components: await OpenAPI.components,
                    paths: await OpenAPI.getPaths(),
                },
            }),
        );
    }

    const configuredApp = app
        .use(authPlugin)
        .use(
            cors({
                origin: process.env.CORS_ORIGIN || "http://localhost:5173",
                methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
                credentials: true,
                allowedHeaders: ["Content-Type", "Authorization", "x-unit-id"],
            }),
        )
        .get("/health", () => ({
            status: "ok",
            timestamp: new Date(),
        }))
        .use(usersRoutes({ usersRepository }));

    const resolvedHasUserAccessToUnitChecker =
        hasUserAccessToUnitChecker ?? createHasUserAccessToUnitChecker(db);

    const configuredAppWithUnits = unitsRepository
        ? configuredApp.use(
              unitsRoutes({
                  unitsRepository,
                  hasUserAccessToUnitChecker: resolvedHasUserAccessToUnitChecker,
              }),
          )
        : configuredApp;

    if (!professionalsRepository) {
        return configuredAppWithUnits;
    }

    return configuredAppWithUnits.use(
        professionalsRoutes({
            professionalsRepository,
            hasUserAccessToUnitChecker: resolvedHasUserAccessToUnitChecker,
        }),
    );
}
