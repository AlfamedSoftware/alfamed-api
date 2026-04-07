import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { systemRoutes } from "./http/routes/system.routes.js";
import { trustedOrigins } from "./http/plugins/unit-access.js";
import { usersRoutes } from "./modules/users/users.routes.js";
import type { UsersRepository } from "./modules/users/users.repository.js";
import { professionalsRoutes } from "./modules/professionals/professionals.routes.js";
import type { ProfessionalsRepository } from "./modules/professionals/professionals.repository.js";
import { patientsRoutes } from "./modules/patients/patients.routes.js";
import type { PatientsRepository } from "./modules/patients/patients.repository.js";

type ElysiaPlugin = Parameters<InstanceType<typeof Elysia>["use"]>[0];

type BuildAppOptions = {
    usersRepository: UsersRepository;
    professionalsRepository?: ProfessionalsRepository;
    patientsRepository: PatientsRepository;
    authPlugin: ElysiaPlugin;
    withDocs?: boolean;
};

export async function buildApp({
    usersRepository,
    patientsRepository,
    professionalsRepository,
    authPlugin,
    withDocs = true,
}: BuildAppOptions) {
    const app = new Elysia();

    if (withDocs) {
        const { OpenAPI } = await import("./http/plugins/better-auth.js");

        app.use(
            openapi({
                path: "/openapi",
                documentation: {
                    tags: [
                        {
                            name: "System",
                            description: "Application health and system endpoints",
                        },
                        {
                            name: "Users",
                            description: "Operations about users",
                        },
                        {
                            name: "Professionals",
                            description: "Operations about professionals",
                        },
                        {
                            name: "Patients",
                            description: "Operations about patients",
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
                origin: trustedOrigins,
                methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
                credentials: true,
                allowedHeaders: ["Content-Type", "Authorization", "x-unit-id"],
            }),
        )
        .use(systemRoutes())
        .use(usersRoutes({ usersRepository }))
        .use(patientsRoutes({ patientsRepository }));

    if (!professionalsRepository) {
        return configuredApp;
    }

    return configuredApp.use(professionalsRoutes({ professionalsRepository }));
}
