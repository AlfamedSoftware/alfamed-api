import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { systemRoutes } from "./http/routes/system.routes.js";
import { usersRoutes } from "./modules/users/users.routes.js";
import type { UsersRepository } from "./modules/users/users.repository.js";
import { professionalsRoutes } from "./modules/professionals/professionals.routes.js";
import type { ProfessionalsRepository } from "./modules/professionals/professionals.repository.js";

type ElysiaPlugin = Parameters<InstanceType<typeof Elysia>["use"]>[0];

type BuildAppOptions = {
    usersRepository: UsersRepository;
    professionalsRepository?: ProfessionalsRepository;
    authPlugin: ElysiaPlugin;
    withDocs?: boolean;
};

export async function buildApp({
    usersRepository,
    professionalsRepository,
    authPlugin,
    withDocs = true,
}: BuildAppOptions) {
    const app = new Elysia();
    const trustedOrigins = (process.env.TRUSTED_ORIGINS ?? "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);

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
        .use(usersRoutes({ usersRepository }));

    if (!professionalsRepository) {
        return configuredApp;
    }

    return configuredApp.use(professionalsRoutes({ professionalsRepository }));
}
