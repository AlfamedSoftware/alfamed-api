import { Elysia, t } from "elysia";
import { isDomainError } from "../../http/plugins/domain-error.js";
import { getAuthenticatedUserId } from "../../http/plugins/unit-access.js";
import type { PatientsRepository } from "./patients.repository.js";
import { PatientsService } from "./patients.service.js";
import {
    createPatientForUserSchema,
    patientListItemSchema,
    patientProfileSchema,
    patientsErrorSchema,
} from "./patients.schemas.js";

type PatientsRoutesOptions = {
    patientsRepository: PatientsRepository;
};

export const patientsRoutes = ({ patientsRepository }: PatientsRoutesOptions) => {
    const patientsService = new PatientsService(patientsRepository);

    return new Elysia({ name: "patients-routes", prefix: "/patients" })
        .post(
            "/link-user",
            async (context) => {
                const { body, status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                try {
                    const patient = await patientsService.createPatient({
                        userId: body.userId,
                        isActive: body.isActive,
                    });
                    return status(201, patient);
                } catch (error) {
                    if (isDomainError(error, "PATIENT_ALREADY_EXISTS")) {
                        return status(409, { message: "Patient already exists for this user" });
                    }

                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                body: createPatientForUserSchema,
                detail: {
                    summary: "Create patient for user",
                    description: "Creates a patient linked to the userId provided in the request body.",
                    tags: ["Patients"],
                },
                response: {
                    201: patientProfileSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    409: t.Object({ message: t.Literal("Patient already exists for this user") }),
                    500: patientsErrorSchema,
                },
            },
        )
        .get(
            "/",
            async (context) => {
                const { status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                try {
                    const patients = await patientsRepository.listPatients();
                    return status(200, patients);
                } catch (error) {
                    console.error("[patients.routes] Error listing patients:", error);
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                detail: {
                    summary: "List patients",
                    description: "Returns patients for appointment selection.",
                    tags: ["Patients"],
                },
                response: {
                    200: patientListItemSchema.array(),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    500: patientsErrorSchema,
                },
            },
        )
        .get(
            "/:patientId",
            async (context) => {
                const { params, status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                try {
                    const patient = await patientsService.getPatientById(params.patientId);
                    if (patient.userId !== userId) {
                        return status(403, { message: "Forbidden" });
                    }
                    return status(200, patient);
                } catch (error) {
                    if (isDomainError(error, "PATIENT_NOT_FOUND")) {
                        return status(404, { message: "Patient not found" });
                    }
                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                params: t.Object({
                    patientId: t.String({ format: "uuid" }),
                }),
                detail: {
                    summary: "Get own patient by id",
                    description: "Returns patient details by id when owned by the authenticated user.",
                    tags: ["Patients"],
                },
                response: {
                    200: patientProfileSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    404: t.Object({ message: t.Literal("Patient not found") }),
                    500: patientsErrorSchema,
                },
            },
        );
    };
