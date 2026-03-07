import { Elysia, t } from "elysia";
import { z } from "zod";
import type { ProfessionalsRepository } from "./professionals.repository";
import { ProfessionalsService } from "./professionals.service";
import {
    createProfessionalSchema,
    professionalProfileSchema,
    professionalsErrorSchema,
    updateProfessionalSchema,
} from "./professionals.schemas";

type ProfessionalsRoutesOptions = {
    professionalsRepository: ProfessionalsRepository;
};

export const professionalsRoutes = ({ professionalsRepository }: ProfessionalsRoutesOptions) => {
    const professionalsService = new ProfessionalsService(professionalsRepository);
    const getUnitIdFromHeader = (context: { request: Request }) => context.request.headers.get("x-unit-id");

    return new Elysia({ name: "professionals-routes", prefix: "/professionals" })
        .post(
            "/",
            async (context) => {
                const { body, status } = context;
                const userId = (context as { user?: { id?: string } }).user?.id;

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                try {
                    const professional = await professionalsService.createProfessional(body);

                    return status(201, professional);
                } catch {
                    return status(409, { message: "Professional already exists for this user" });
                }
            },
            {
                auth: true,
                body: createProfessionalSchema,
                detail: {
                    summary: "Create professional",
                    description: "Creates a professional linked to a user.",
                    tags: ["Professionals"],
                },
                response: {
                    201: professionalProfileSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    409: t.Object({ message: t.Literal("Professional already exists for this user") }),
                },
            },
        )
        .get(
            "/",
            async (context) => {
                const { status } = context;
                const userId = (context as { user?: { id?: string } }).user?.id;

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                const unitId = getUnitIdFromHeader(context);
                const unitValidation = z.string().uuid().safeParse(unitId);

                if (!unitValidation.success) {
                    return status(400, { message: "Invalid or missing unit header" });
                }

                const professionals = await professionalsService.listProfessionals(unitValidation.data);

                return status(200, professionals);
            },
            {
                auth: true,
                detail: {
                    summary: "List professionals",
                    description: "Returns all professionals.",
                    tags: ["Professionals"],
                },
                response: {
                    200: z.array(professionalProfileSchema),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    400: t.Object({ message: t.Literal("Invalid or missing unit header") }),
                },
            },
        )
        .get(
            "/:id",
            async (context) => {
                const { params, status } = context;
                const userId = (context as { user?: { id?: string } }).user?.id;

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                const unitId = getUnitIdFromHeader(context);
                const unitValidation = z.string().uuid().safeParse(unitId);

                if (!unitValidation.success) {
                    return status(400, { message: "Invalid or missing unit header" });
                }

                try {
                    const professional = await professionalsService.getProfessionalById(params.id, unitValidation.data);

                    return status(200, professional);
                } catch (error) {
                    if (error instanceof Error && error.message === "Professional not found") {
                        return status(404, { message: "Professional not found" });
                    }

                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                params: t.Object({
                    id: t.String({ format: "uuid" }),
                }),
                detail: {
                    summary: "Get professional by id",
                    description: "Returns a professional profile by id.",
                    tags: ["Professionals"],
                },
                response: {
                    200: professionalProfileSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    400: t.Object({ message: t.Literal("Invalid or missing unit header") }),
                    404: t.Object({ message: t.Literal("Professional not found") }),
                    500: professionalsErrorSchema,
                },
            },
        )
        .patch(
            "/:id",
            async (context) => {
                const { params, body, status } = context;
                const userId = (context as { user?: { id?: string } }).user?.id;

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                const unitId = getUnitIdFromHeader(context);
                const unitValidation = z.string().uuid().safeParse(unitId);

                if (!unitValidation.success) {
                    return status(400, { message: "Invalid or missing unit header" });
                }

                try {
                    const professional = await professionalsService.updateProfessional(
                        params.id,
                        unitValidation.data,
                        body,
                    );

                    return status(200, professional);
                } catch (error) {
                    if (error instanceof Error && error.message === "Professional not found") {
                        return status(404, { message: "Professional not found" });
                    }

                    return status(409, { message: "Professional already exists for this user" });
                }
            },
            {
                auth: true,
                params: t.Object({
                    id: t.String({ format: "uuid" }),
                }),
                body: updateProfessionalSchema,
                detail: {
                    summary: "Update professional",
                    description: "Updates a professional profile by id.",
                    tags: ["Professionals"],
                },
                response: {
                    200: professionalProfileSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    400: t.Object({ message: t.Literal("Invalid or missing unit header") }),
                    404: t.Object({ message: t.Literal("Professional not found") }),
                    409: t.Object({ message: t.Literal("Professional already exists for this user") }),
                },
            },
        )
        .delete(
            "/:id",
            async (context) => {
                const { params, status } = context;
                const userId = (context as { user?: { id?: string } }).user?.id;

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                const unitId = getUnitIdFromHeader(context);
                const unitValidation = z.string().uuid().safeParse(unitId);

                if (!unitValidation.success) {
                    return status(400, { message: "Invalid or missing unit header" });
                }

                try {
                    await professionalsService.deleteProfessional(params.id, unitValidation.data);

                    return status(200, { message: "Professional deleted" });
                } catch (error) {
                    if (error instanceof Error && error.message === "Professional not found") {
                        return status(404, { message: "Professional not found" });
                    }

                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                params: t.Object({
                    id: t.String({ format: "uuid" }),
                }),
                detail: {
                    summary: "Delete professional",
                    description: "Deletes a professional by id.",
                    tags: ["Professionals"],
                },
                response: {
                    200: t.Object({ message: t.Literal("Professional deleted") }),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    400: t.Object({ message: t.Literal("Invalid or missing unit header") }),
                    404: t.Object({ message: t.Literal("Professional not found") }),
                    500: professionalsErrorSchema,
                },
            },
        );
};
