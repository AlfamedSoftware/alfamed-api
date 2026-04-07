import { Elysia, t } from "elysia";
import type { PatientsRepository } from "./patients.repository.js";
import { PatientsService } from "./patients.service.js";
import { patientResponseSchema, createPatientSchema } from "./patients.schemas.js";

type PatientsRoutesOptions = {
    patientsRepository: PatientsRepository;
};

export const patientsRoutes = ({ patientsRepository }: PatientsRoutesOptions) => {
    const patientsService = new PatientsService(patientsRepository);

    return new Elysia({ name: "patients-routes", prefix: "/patients" })
        .post(
            "/createPatient",
            async (context) => {
                const { body, status } = context;

                try {
                    const patient = await patientsService.createPatient(body.userId);
                    return status(201, patient as any);
                } catch (error) {
                    const message = error instanceof Error ? error.message : "Failed to create patient";

                    if (message.includes("already exists")) {
                        return status(409, { message: "Patient already exists for this user" });
                    }

                    return status(400, { message });
                }
            },
            {
                body: createPatientSchema,
                detail: {
                    summary: "Link a user to patient",
                    description: "Creates a patient record for an existing user, identifying them as a patient in the system.",
                    tags: ["Patients"],
                },
                response: {
                    201: patientResponseSchema,
                    400: t.Object({ message: t.String() }),
                    409: t.Object({ message: t.Literal("Patient already exists for this user") }),
                },
            },
        )
        .get(
            "/:patientId",
            async (context) => {
                const { params, status } = context;

                const patient = await patientsService.getPatientById(params.patientId);

                if (!patient) {
                    return status(404, { message: "Patient not found" });
                }

                return status(200, patient as any);
            },
            {
                detail: {
                    summary: "Get patient by id",
                    description: "Returns patient details by patient id.",
                    tags: ["Patients"],
                },
                response: {
                    200: patientResponseSchema,
                    404: t.Object({ message: t.Literal("Patient not found") }),
                },
            },
        )
        .get(
            "/user/:userId",
            async (context) => {
                const { params, status } = context;

                const patient = await patientsService.getPatientByUserId(params.userId);

                if (!patient) {
                    return status(404, { message: "Patient not found" });
                }

                return status(200, patient as any);
            },
            {
                detail: {
                    summary: "Get patient by user id",
                    description: "Returns patient details associated with a specific user.",
                    tags: ["Patients"],
                },
                response: {
                    200: patientResponseSchema,
                    404: t.Object({ message: t.Literal("Patient not found") }),
                },
            },
        );
};
