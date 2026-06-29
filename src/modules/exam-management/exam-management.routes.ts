import { Elysia, t } from "elysia";
import { z } from "zod";
import type { ExamManagementRepository } from "./exam-management.repository.js";
import { ExamManagementService } from "./exam-management.service.js";
import { examManagementListSchema, examManagementItemSchema, examManagementErrorSchema } from "./exam-management.schemas.js";

type ExamManagementRoutesOptions = {
    examManagementRepository: ExamManagementRepository;
};

export const examManagementRoutes = ({ examManagementRepository }: ExamManagementRoutesOptions) => {
    const examManagementService = new ExamManagementService(examManagementRepository);

    return new Elysia({ name: "exam-management-routes", prefix: "/exam-management" })
        .get(
            "/",
            async ({ query, status }) => {
                try {
                    const items = await examManagementService.listExamManagements({
                        professionalUserId: query.professionalUserId,
                        date: query.date,
                        statusCode: query.statusCode,
                    });

                    return status(200, items);
                } catch (error) {
                    console.error("[exam-management][list]", error);
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                query: t.Object({
                    professionalUserId: t.Optional(t.String()),
                    date: t.Optional(t.String()),
                    statusCode: t.Optional(t.Numeric()),
                }),
                detail: {
                    summary: "List exam managements",
                    description: "Returns appointments that have at least one active request, with patient, professional and request data. Ordered by schedule date and slot start time.",
                    tags: ["Exam Management"],
                },
                response: {
                    200: examManagementListSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    500: examManagementErrorSchema,
                },
            },
        )
        .get(
            "/:appointmentId",
            async ({ params, status }) => {
                try {
                    const item = await examManagementService.getExamManagementDetails(params.appointmentId);

                    if (!item) return status(404, { message: "Not found" });

                    return status(200, item);
                } catch (error) {
                    console.error("[exam-management][details]", error);
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                params: t.Object({
                    appointmentId: t.String(),
                }),
                detail: {
                    summary: "Get exam management details",
                    description: "Returns the full exam management data for a specific appointment.",
                    tags: ["Exam Management"],
                },
                response: {
                    200: examManagementItemSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    404: t.Object({ message: t.Literal("Not found") }),
                    500: examManagementErrorSchema,
                },
            },
        );
};
