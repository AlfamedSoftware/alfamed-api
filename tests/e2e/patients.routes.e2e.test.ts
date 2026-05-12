import { describe, expect, it } from "vitest";
import { patientProfileSchema } from "../../src/modules/patients/patients.schemas";
import { buildE2EApp, TEST_IDS } from "./helpers/context";
import {
    InMemoryPatientsRepository,
    InMemoryUsersRepository,
} from "./helpers/repositories";

describe("Patients routes", () => {
    it("POST /patients/link-user cria paciente para userId informado", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            patientsRepository: new InMemoryPatientsRepository(),
        });

        const response = await app.handle(
            new Request("http://localhost/patients/link-user", {
                method: "POST",
                headers: {
                    "x-user-id": TEST_IDS.user,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ userId: TEST_IDS.otherUser, isActive: true }),
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(201);
        expect(() => patientProfileSchema.parse(body)).not.toThrow();
        expect(body.userId).toBe(TEST_IDS.otherUser);
    });

    it("POST /patients/link-user retorna 409 quando paciente já existe", async () => {
        const patientId = "019c1a3e-e425-7000-8bda-cdfec32c7f21";
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            patientsRepository: new InMemoryPatientsRepository({
                [patientId]: {
                    id: patientId,
                    userId: TEST_IDS.otherUser,
                    isActive: true,
                    createdAt: "2026-02-01T17:27:35.202Z",
                    updatedAt: "2026-02-01T17:27:35.202Z",
                },
            }),
        });

        const response = await app.handle(
            new Request("http://localhost/patients/link-user", {
                method: "POST",
                headers: {
                    "x-user-id": TEST_IDS.user,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ userId: TEST_IDS.otherUser, isActive: true }),
            }),
        );

        expect(response.status).toBe(409);
    });

    it("GET /patients/:id retorna 403 quando paciente não pertence ao usuário", async () => {
        const patientId = "019c1a3e-e425-7000-8bda-cdfec32c7f31";
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            patientsRepository: new InMemoryPatientsRepository({
                [patientId]: {
                    id: patientId,
                    userId: TEST_IDS.otherUser,
                    isActive: true,
                    createdAt: "2026-02-01T17:27:35.202Z",
                    updatedAt: "2026-02-01T17:27:35.202Z",
                },
            }),
        });

        const response = await app.handle(
            new Request(`http://localhost/patients/${patientId}`, {
                headers: { "x-user-id": TEST_IDS.user },
            }),
        );

        expect(response.status).toBe(403);
    });
});
