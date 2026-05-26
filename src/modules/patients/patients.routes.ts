import { Elysia, t } from "elysia";
import { isDomainError } from "../../http/plugins/domain-error.js";
import { getAuthenticatedUserId } from "../../http/plugins/unit-access.js";
import type { PatientsRepository } from "./patients.repository.js";
import { PatientsService } from "./patients.service.js";
import {
    createPatientFullCreateSchema,
    createPatientForUserSchema,
    patientFullDataByUserSchema,
    patientFullUpdateSchema,
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
            "/full-create",
            async (context) => {
                const { body, status } = context;

                try {
                    const patient = await patientsService.createPatientFullCreate(body);
                    return status(201, patient);
                } catch (error) {
                    if (isDomainError(error, "EMAIL_ALREADY_EXISTS")) {
                        return status(409, { message: "Email already exists" });
                    }

                    if (isDomainError(error, "CPF_ALREADY_EXISTS")) {
                        return status(409, { message: "CPF already exists" });
                    }

                    return status(500, { message: "Internal server error" });
                }
            },
            {
                body: createPatientFullCreateSchema,
                detail: {
                    summary: "Full create patient",
                    description: "Creates the user, account and patient in a single transaction.",
                    tags: ["Patients"],
                },
                response: {
                    201: patientFullDataByUserSchema,
                    409: t.Object({
                        message: t.Union([
                            t.Literal("Email already exists"),
                            t.Literal("CPF already exists"),
                        ]),
                    }),
                    500: patientsErrorSchema,
                },
            },
        )
        .post(
            "/",
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
                    summary: "Create patient",
                    description: "Creates a patient.",
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
                    summary: "Get patient by id",
                    description: "Returns all rows for the specified patient.",
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
        )
        .get(
            "/patient-full-data-by-user/:userId",
            async (context) => {
                const { params, status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                if (params.userId !== userId) {
                    return status(403, { message: "Forbidden" });
                }

                try {
                    const patient = await patientsService.getPatientFullDataByUserId(params.userId);
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
                    userId: t.String({ format: "uuid" }),
                }),
                detail: {
                    summary: "Get patient full data by user",
                    description: "Returns the patient and related user data for the specified user.",
                    tags: ["Patients"],
                },
                response: {
                    200: patientFullDataByUserSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    404: t.Object({ message: t.Literal("Patient not found") }),
                    500: patientsErrorSchema,
                },
            },
        )
        .patch(
            "/full-update",
            async (context) => {
                const { body, status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });

                if (!userId) {
                    return status(401, { message: "Unauthorized" });
                }

                try {
                    if (userId !== (body as any).userId) {
                        return status(403, { message: "Forbidden" });
                    }

                    const updated = await patientsService.fullUpdate(userId, body as any);

                    return status(200, updated);
                } catch (error) {
                    if (isDomainError(error, "EMAIL_ALREADY_EXISTS")) {
                        return status(409, { message: "Email already exists" });
                    }

                    if (isDomainError(error, "CPF_ALREADY_EXISTS")) {
                        return status(409, { message: "CPF already exists" });
                    }

                    if (isDomainError(error, "PATIENT_NOT_FOUND")) {
                        return status(404, { message: "Patient not found" });
                    }

                    return status(500, { message: "Internal server error" });
                }
            },
            {
                auth: true,
                body: patientFullUpdateSchema,
                detail: {
                    summary: "Full update",
                    description: "Updates patient and user data. Only changed fields are persisted and cpf/email uniqueness is validated.",
                    tags: ["Patients"],
                },
                response: {
                    200: patientFullDataByUserSchema,
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({ message: t.Literal("Forbidden") }),
                    404: t.Object({ message: t.Literal("Patient not found") }),
                    409: t.Object({ message: t.Union([t.Literal("Email already exists"), t.Literal("CPF already exists")]) }),
                    500: patientsErrorSchema,
                },
            },
        );
};
