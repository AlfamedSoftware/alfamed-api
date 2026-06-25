import { Elysia, t } from "elysia";
import { MedicalRecordsRepository } from "./medical-records.repository.js";
import { MedicalRecordsService, PatientNotFoundError } from "./medical-records.service.js";
import { getAuthenticatedUserId } from "../../http/plugins/unit-access.js";
import type { db as dbType } from "../../db/client.js";
import {
    medicalRecordsErrorSchema,
    listPatientMedicalRecordsResponseSchema,
} from "./medical-records.schemas.js";

type DatabaseClient = typeof dbType;

type MedicalRecordsRoutesOptions = {
    db: DatabaseClient;
};

export const medicalRecordsRoutes = ({ db }: MedicalRecordsRoutesOptions) => {
    const medicalRecordsRepository = new MedicalRecordsRepository(db);
    const medicalRecordsService = new MedicalRecordsService(medicalRecordsRepository);

    return new Elysia({ name: "medical-records-routes", prefix: "/medical-records" })
        .get(
            "/list-patient-medical-records",
            async (context) => {
                const { query, status } = context;
                const requesterId = getAuthenticatedUserId(context as { user?: { id?: string } });

                if (!requesterId) {
                    return status(401, { message: "Não autorizado" });
                }

                try {
                    const records = await medicalRecordsService.listPatientMedicalRecords(query.userId);
                    return status(200, records);
                } catch (error) {
                    if (error instanceof PatientNotFoundError) {
                        return status(404, { message: "Paciente não encontrado ou inativo" });
                    }
                    console.error("[medical-records.routes] Error listing patient medical records:", error);
                    return status(500, { message: "Erro interno do servidor" });
                }
            },
            {
                auth: true,
                query: t.Object({
                    userId: t.String({ format: "uuid" }),
                }),
                detail: {
                    summary: "List patient medical records",
                    description: "Returns all appointments for a patient, including user, schedule and slot data. Patient must exist and be active.",
                    tags: ["Medical Records"],
                },
                response: {
                    200: listPatientMedicalRecordsResponseSchema,
                    401: t.Object({ message: t.Literal("Não autorizado") }),
                    404: t.Object({ message: t.Literal("Paciente não encontrado ou inativo") }),
                    500: medicalRecordsErrorSchema,
                },
            },
        );
};
