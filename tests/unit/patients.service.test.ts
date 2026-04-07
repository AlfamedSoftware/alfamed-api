import { describe, expect, it } from "vitest";
import { DomainError } from "../../src/http/plugins/domain-error";
import { PatientsService } from "../../src/modules/patients/patients.service";
import type { Patient, PatientsRepository } from "../../src/modules/patients/patients.repository";

class InMemoryPatientsRepository implements PatientsRepository {
    constructor(private readonly patients: Record<string, Patient> = {}) {}

    async createPatient(userId: string): Promise<Patient> {
        const now = new Date().toISOString();
        return {
            id: "019c1a3e-e425-7000-8bda-cdfec32c7f01",
            userId,
            isActive: true,
            createdAt: now,
            updatedAt: now,
        };
    }

    async getPatientByUserId(userId: string): Promise<Patient | null> {
        return Object.values(this.patients).find((patient) => patient.userId === userId) ?? null;
    }

    async getPatientById(patientId: string): Promise<Patient | null> {
        return this.patients[patientId] ?? null;
    }
}

describe("PatientsService", () => {
    it("deve criar paciente quando usuário ainda não tem vínculo", async () => {
        const service = new PatientsService(new InMemoryPatientsRepository());

        const result = await service.createPatient("019c1a3e-e425-7000-8bda-cdfec32c8fed");

        expect(result.userId).toBe("019c1a3e-e425-7000-8bda-cdfec32c8fed");
    });

    it("deve bloquear criação duplicada", async () => {
        const existingId = "019c1a3e-e425-7000-8bda-cdfec32c7f11";
        const service = new PatientsService(
            new InMemoryPatientsRepository({
                [existingId]: {
                    id: existingId,
                    userId: "019c1a3e-e425-7000-8bda-cdfec32c8fed",
                    isActive: true,
                    createdAt: "2026-02-01T17:27:35.202Z",
                    updatedAt: "2026-02-01T17:27:35.202Z",
                },
            }),
        );

        await expect(service.createPatient("019c1a3e-e425-7000-8bda-cdfec32c8fed")).rejects.toEqual(
            new DomainError("PATIENT_ALREADY_EXISTS", "Patient already exists for this user"),
        );
    });
});
