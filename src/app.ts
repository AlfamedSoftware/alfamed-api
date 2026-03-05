import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { usersRoutes } from "./modules/users/users.routes";
import type { UsersRepository } from "./modules/users/users.repository";

type BuildAppOptions = {
    usersRepository: UsersRepository;
    authPlugin: any;
    withDocs?: boolean;
};

export async function buildApp({ usersRepository, authPlugin, withDocs = true }: BuildAppOptions) {
    const app = new Elysia();

    if (withDocs) {
        const { OpenAPI } = await import("./http/plugins/better-auth");

        app.use(
            openapi({
                path: "/openapi",
                documentation: {
                    components: await OpenAPI.components,
                    paths: await OpenAPI.getPaths(),
                },
            }),
        );
    }

    return app
        .use(authPlugin)
        .use(
            cors({
                origin: "http://localhost:5173",
                methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                credentials: true,
                allowedHeaders: ["Content-Type", "Authorization"],
            }),
        )
        .get("/health", () => ({
            status: "ok",
            timestamp: new Date(),
        }))
        .use(usersRoutes({ usersRepository }));
}
