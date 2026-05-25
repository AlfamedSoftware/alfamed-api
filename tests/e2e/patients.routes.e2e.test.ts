import { describe, expect, it } from "vitest";
import { patientFullDataByUserSchema, patientProfileSchema } from "../../src/modules/patients/patients.schemas";
import { buildE2EApp, TEST_IDS } from "./helpers/context";
import {
    InMemoryPatientsRepository,
    InMemoryUsersRepository,
} from "./helpers/repositories";

describe("Patients routes", () => {
    it("POST /patients cria paciente para userId informado", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            patientsRepository: new InMemoryPatientsRepository(),
        });

        const response = await app.handle(
            new Request("http://localhost/patients", {
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

    it("POST /patients retorna 409 quando paciente já existe", async () => {
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
            new Request("http://localhost/patients", {
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

    it("GET /patients/patient-full-data-by-user/:UserId retorna os dados completos do paciente", async () => {
        const patientId = "019c1a3e-e425-7000-8bda-cdfec32c7f41";
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            patientsRepository: new InMemoryPatientsRepository({
                [patientId]: {
                    id: patientId,
                    userId: TEST_IDS.user,
                    isActive: true,
                    createdAt: "2026-02-01T17:27:35.202Z",
                    updatedAt: "2026-02-01T17:27:35.202Z",
                },
            }, {
                [TEST_IDS.user]: {
                    id: TEST_IDS.user,
                    name: "Test User",
                    socialName: null,
                    email: "test@example.com",
                    phone: "11999999999",
                    cpf: "12345678901",
                    birthdate: "2026-02-01T17:27:35.202Z",
                    sex: "F",
                    isActive: true,
                },
            }),
        });

        const response = await app.handle(
            new Request(`http://localhost/patients/patient-full-data-by-user/${TEST_IDS.user}`, {
                headers: { "x-user-id": TEST_IDS.user },
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(() => patientFullDataByUserSchema.parse(body)).not.toThrow();
        expect(body.id).toBe(patientId);
        expect(body.users.id).toBe(TEST_IDS.user);
    });

    it("POST /patients/full-create cria user, account e patient", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            patientsRepository: new InMemoryPatientsRepository(),
        });

        const response = await app.handle(
            new Request("http://localhost/patients/full-create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: "Maria Silva",
                    socialName: "",
                    email: "maria@example.com",
                    cpf: "12345678901",
                    birthdate: "1998-05-10T00:00:00.000Z",
                    phone: "11999999999",
                    sex: "F",
                    password: "secret123",
                }),
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(201);
        expect(() => patientFullDataByUserSchema.parse(body)).not.toThrow();
        expect(body.isActive).toBe(true);
        expect(body.users.name).toBe("Maria Silva");
        expect(body.users.socialName).toBeNull();
        expect(body.users.email).toBe("maria@example.com");
    });

    it("POST /patients/full-create retorna 409 quando email já existe", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            patientsRepository: new InMemoryPatientsRepository({}, {
                [TEST_IDS.otherUser]: {
                    id: TEST_IDS.otherUser,
                    name: "Existing User",
                    socialName: null,
                    email: "maria@example.com",
                    phone: "11999999999",
                    cpf: "99999999999",
                    birthdate: "1990-01-01T00:00:00.000Z",
                    sex: "F",
                    isActive: true,
                },
            }),
        });

        const response = await app.handle(
            new Request("http://localhost/patients/full-create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: "Maria Silva",
                    socialName: "",
                    email: "maria@example.com",
                    cpf: "12345678901",
                    birthdate: "1998-05-10T00:00:00.000Z",
                    phone: "11999999999",
                    sex: "F",
                    password: "secret123",
                }),
            }),
        );

        expect(response.status).toBe(409);
    });

    it("POST /patients/full-create retorna 409 quando cpf já existe", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            patientsRepository: new InMemoryPatientsRepository({}, {
                [TEST_IDS.otherUser]: {
                    id: TEST_IDS.otherUser,
                    name: "Existing User",
                    socialName: null,
                    email: "other@example.com",
                    phone: "11999999999",
                    cpf: "12345678901",
                    birthdate: "1990-01-01T00:00:00.000Z",
                    sex: "F",
                    isActive: true,
                },
            }),
        });

        const response = await app.handle(
            new Request("http://localhost/patients/full-create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: "Maria Silva",
                    socialName: "",
                    email: "maria@example.com",
                    cpf: "12345678901",
                    birthdate: "1998-05-10T00:00:00.000Z",
                    phone: "11999999999",
                    sex: "F",
                    password: "secret123",
                }),
            }),
        );

        expect(response.status).toBe(409);
    });
});
