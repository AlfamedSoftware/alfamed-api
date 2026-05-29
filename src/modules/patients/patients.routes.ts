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
        .get(
            "/",
            async (context) => {
                const { status } = context;
                const userId = getAuthenticatedUserId(context as { user?: { id?: string } });

                if (!userId) return status(401, { message: "Não autorizado" });

                try {
                    const list = await patientsService.list();
                    return status(200, list);
                } catch (error) {
                    console.error("[patients.routes] Error listing patients:", error);
                    return status(500, { message: "Erro interno do servidor" });
                }
            },
            {
                auth: true,
                detail: {
                    summary: "List patients",
                    description: "Returns a list of patients with basic user info.",
                    tags: ["Patients"],
                },
                response: {
                    200: t.Array(
                        t.Object({
                            // accept generic string ids because fixtures may use non-UUID values
                            id: t.String(),
                            userId: t.String(),
                            name: t.String(),
                            email: t.String(),
                            cpf: t.String(),
                            phone: t.String(),
                            isActive: t.Boolean(),
                        }),
                    ),
                    401: t.Object({ message: t.Literal("Não autorizado") }),
                    500: t.Object({ message: t.String() }),
                },
            },
        )
        .post(
            "/full-create",
            async (context) => {
                const { body, status } = context;

                try {
                    const patient = await patientsService.createPatientFullCreate(body);
                    return status(201, patient);
                } catch (error) {
                    if (isDomainError(error, "EMAIL_ALREADY_EXISTS")) {
                        return status(409, { message: "E-mail já cadastrado" });
                    }

                    if (isDomainError(error, "CPF_ALREADY_EXISTS")) {
                        return status(409, { message: "CPF já cadastrado" });
                    }

                    return status(500, { message: "Erro interno do servidor" });
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
                            t.Literal("E-mail já cadastrado"),
                            t.Literal("CPF já cadastrado"),
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
                    return status(401, { message: "Não autorizado" });
                }

                try {
                    const patient = await patientsService.createPatient({
                        userId: body.userId,
                        isActive: body.isActive,
                    });
                    return status(201, patient);
                } catch (error) {
                    if (isDomainError(error, "PATIENT_ALREADY_EXISTS")) {
                        return status(409, { message: "Paciente já existe para este usuário" });
                    }

                    return status(500, { message: "Erro interno do servidor" });
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
                    401: t.Object({ message: t.Literal("Não autorizado") }),
                    409: t.Object({ message: t.Literal("Paciente já existe para este usuário") }),
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
                    return status(401, { message: "Não autorizado" });
                }

                try {
                    const patient = await patientsService.getPatientById(params.patientId);
                    if (patient.userId !== userId) {
                        return status(403, { message: "Acesso negado" });
                    }
                    return status(200, patient);
                } catch (error) {
                    if (isDomainError(error, "PATIENT_NOT_FOUND")) {
                        return status(404, { message: "Paciente não encontrado" });
                    }
                    return status(500, { message: "Erro interno do servidor" });
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
                    401: t.Object({ message: t.Literal("Não autorizado") }),
                    403: t.Object({ message: t.Literal("Acesso negado") }),
                    404: t.Object({ message: t.Literal("Paciente não encontrado") }),
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
                    return status(401, { message: "Não autorizado" });
                }

                if (params.userId !== userId) {
                    return status(403, { message: "Acesso negado" });
                }

                try {
                    const patient = await patientsService.getPatientFullDataByUserId(params.userId);
                    return status(200, patient);
                } catch (error) {
                    if (isDomainError(error, "PATIENT_NOT_FOUND")) {
                        return status(404, { message: "Paciente não encontrado" });
                    }

                    return status(500, { message: "Erro interno do servidor" });
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
                    401: t.Object({ message: t.Literal("Não autorizado") }),
                    403: t.Object({ message: t.Literal("Acesso negado") }),
                    404: t.Object({ message: t.Literal("Paciente não encontrado") }),
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
                    return status(401, { message: "Não autorizado" });
                }

                try {
                    if (userId !== (body as any).userId) {
                        return status(403, { message: "Acesso negado" });
                    }

                    const updated = await patientsService.fullUpdate(userId, body as any);

                    return status(200, updated);
                } catch (error) {
                    if (isDomainError(error, "EMAIL_ALREADY_EXISTS")) {
                        return status(409, { message: "E-mail já cadastrado" });
                    }

                    if (isDomainError(error, "CPF_ALREADY_EXISTS")) {
                        return status(409, { message: "CPF já cadastrado" });
                    }

                    if (isDomainError(error, "PATIENT_NOT_FOUND")) {
                        return status(404, { message: "Paciente não encontrado" });
                    }

                    return status(500, { message: "Erro interno do servidor" });
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
                    401: t.Object({ message: t.Literal("Não autorizado") }),
                    403: t.Object({ message: t.Literal("Acesso negado") }),
                    404: t.Object({ message: t.Literal("Paciente não encontrado") }),
                    409: t.Object({ message: t.Union([t.Literal("E-mail já cadastrado"), t.Literal("CPF já cadastrado")]) }),
                    500: patientsErrorSchema,
                },
            },
        );
};
