import { Elysia, t } from "elysia";

const systemStatusSchema = t.Object({
    status: t.Literal("ok"),
    timestamp: t.Date(),
});

const healthResponse = () => ({
    status: "ok" as const,
    timestamp: new Date(),
});

export const systemRoutes = () => {
    return new Elysia({ name: "system-routes" })
        .get(
            "/",
            () => healthResponse(),
            {
                detail: {
                    summary: "Root health check",
                    description: "Returns the application health payload from the root route.",
                    tags: ["System"],
                },
                response: {
                    200: systemStatusSchema,
                },
            },
        )
        .get(
            "/health",
            () => healthResponse(),
            {
                detail: {
                    summary: "Health check",
                    description: "Returns the application health payload.",
                    tags: ["System"],
                },
                response: {
                    200: systemStatusSchema,
                },
            },
        );
};