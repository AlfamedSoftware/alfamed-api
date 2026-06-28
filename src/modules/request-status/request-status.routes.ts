import { Elysia, t } from "elysia";
import { z } from "zod";
import type { RequestStatusRepository } from "./request-status.repository.js";
import { RequestStatusService } from "./request-status.service.js";
import {
    requestStatusSchema,
    requestStatusErrorSchema,
} from "./request-status.schemas.js";

type RequestStatusRoutesOptions = {
    requestStatusRepository: RequestStatusRepository;
};

export const requestStatusRoutes = ({ requestStatusRepository }: RequestStatusRoutesOptions) => {
    const requestStatusService = new RequestStatusService(requestStatusRepository);

    return new Elysia({ name: "request-status-routes", prefix: "/request-status" })
        .get(
            "/",
            async ({ query, status }) => {
                try {
                    const statuses = await requestStatusService.listRequestStatus({
                        isActive: query.isActive,
                    });

                    return status(200, statuses);
                } catch (error) {
                    console.error("[request-status][list]", error);

                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                query: t.Object({
                    isActive: t.Optional(t.BooleanString()),
                }),
                detail: {
                    summary: "List request statuses",
                    description: "Returns request statuses, optionally filtered by active status.",
                    tags: ["Request Status"],
                },
                response: {
                    200: z.array(requestStatusSchema),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    500: requestStatusErrorSchema,
                },
            },
        );
};
