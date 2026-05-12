import { describe, expect, it } from "vitest";
import { professionalProfileSchema } from "../../src/modules/professionals/professionals.schemas";
import { buildE2EApp, createSelectedUnitCookie, TEST_IDS } from "./helpers/context";
import {
    InMemoryPatientsRepository,
    InMemoryProfessionalsRepository,
    InMemoryUsersRepository,
} from "./helpers/repositories";

describe("Professionals routes", () => {
    const accessMap = {
        [TEST_IDS.user]: [TEST_IDS.unit],
    };

    const requestHeaders = {
        "x-user-id": TEST_IDS.user,
        Cookie: createSelectedUnitCookie(TEST_IDS.unit),
    };

    it("POST /professionals cria profissional", async () => {
        const repository = new InMemoryProfessionalsRepository();
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            professionalsRepository: repository as any,
            accessMap,
        });

        const response = await app.handle(
            new Request("http://localhost/professionals", {
                method: "POST",
                headers: { ...requestHeaders, "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: true }),
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(201);
        expect(() => professionalProfileSchema.parse(body)).not.toThrow();
    });

    it("POST /professionals retorna 401 sem autenticação", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            professionalsRepository: new InMemoryProfessionalsRepository() as any,
            accessMap,
        });

        const response = await app.handle(
            new Request("http://localhost/professionals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: true }),
            }),
        );

        expect(response.status).toBe(401);
    });

    it("POST /professionals retorna 409 em conflito de unicidade", async () => {
        const repository = new InMemoryProfessionalsRepository();
        repository.createWithUnit = async () => {
            const error = new Error("duplicate") as Error & { code?: string };
            error.code = "23505";
            throw error;
        };

        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            professionalsRepository: repository as any,
            accessMap,
        });

        const response = await app.handle(
            new Request("http://localhost/professionals", {
                method: "POST",
                headers: { ...requestHeaders, "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: true }),
            }),
        );

        expect(response.status).toBe(409);
    });

    it("POST /professionals/link-user cria profissional para userId informado", async () => {
        const repository = new InMemoryProfessionalsRepository();
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            professionalsRepository: repository as any,
            accessMap,
        });

        const response = await app.handle(
            new Request("http://localhost/professionals/link-user", {
                method: "POST",
                headers: {
                    "x-user-id": TEST_IDS.user,
                    Cookie: createSelectedUnitCookie(TEST_IDS.unit),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ userId: TEST_IDS.otherUser, isActive: true }),
            }),
        );

        expect(response.status).toBe(201);
    });

    it("POST /professionals/link-user permite user já vinculado a patient", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            professionalsRepository: new InMemoryProfessionalsRepository() as any,
            patientsRepository: new InMemoryPatientsRepository({
                [TEST_IDS.patient]: {
                    id: TEST_IDS.patient,
                    userId: TEST_IDS.otherUser,
                    isActive: true,
                    createdAt: "2026-02-01T17:27:35.202Z",
                    updatedAt: "2026-02-01T17:27:35.202Z",
                },
            }),
            accessMap,
        });

        const response = await app.handle(
            new Request("http://localhost/professionals/link-user", {
                method: "POST",
                headers: {
                    "x-user-id": TEST_IDS.user,
                    Cookie: createSelectedUnitCookie(TEST_IDS.unit),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ userId: TEST_IDS.otherUser, isActive: true }),
            }),
        );

        expect(response.status).toBe(201);
    });

    it("GET /professionals lista por unidade", async () => {
        const repository = new InMemoryProfessionalsRepository(
            {
                [TEST_IDS.professional]: {
                    id: TEST_IDS.professional,
                    userId: TEST_IDS.user,
                    isActive: true,
                    createdAt: "2026-02-01T17:27:35.202Z",
                    updatedAt: "2026-02-01T17:27:35.202Z",
                },
            },
            {
                [TEST_IDS.professional]: [TEST_IDS.unit],
            },
        );
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            professionalsRepository: repository as any,
            accessMap,
        });

        const response = await app.handle(
            new Request("http://localhost/professionals", { headers: requestHeaders }),
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toHaveLength(1);
        expect(() => professionalProfileSchema.parse(body[0])).not.toThrow();
    });

    it("GET /professionals/:id retorna 404 quando não existe", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            professionalsRepository: new InMemoryProfessionalsRepository() as any,
            accessMap,
        });

        const response = await app.handle(
            new Request(`http://localhost/professionals/${TEST_IDS.missingProfessional}`, {
                headers: requestHeaders,
            }),
        );

        expect(response.status).toBe(404);
    });

    it("PATCH /professionals/:id atualiza", async () => {
        const repository = new InMemoryProfessionalsRepository(
            {
                [TEST_IDS.professional]: {
                    id: TEST_IDS.professional,
                    userId: TEST_IDS.user,
                    isActive: true,
                    createdAt: "2026-02-01T17:27:35.202Z",
                    updatedAt: "2026-02-01T17:27:35.202Z",
                },
            },
            {
                [TEST_IDS.professional]: [TEST_IDS.unit],
            },
        );
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            professionalsRepository: repository as any,
            accessMap,
        });

        const response = await app.handle(
            new Request(`http://localhost/professionals/${TEST_IDS.professional}`, {
                method: "PATCH",
                headers: { ...requestHeaders, "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: false }),
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.isActive).toBe(false);
    });

    it("PATCH /professionals/:id retorna 409 em conflito de unicidade", async () => {
        const repository = new InMemoryProfessionalsRepository(
            {
                [TEST_IDS.professional]: {
                    id: TEST_IDS.professional,
                    userId: TEST_IDS.user,
                    isActive: true,
                    createdAt: "2026-02-01T17:27:35.202Z",
                    updatedAt: "2026-02-01T17:27:35.202Z",
                },
            },
            {
                [TEST_IDS.professional]: [TEST_IDS.unit],
            },
        );
        repository.update = async () => {
            const error = new Error("duplicate") as Error & { code?: string };
            error.code = "23505";
            throw error;
        };

        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            professionalsRepository: repository as any,
            accessMap,
        });

        const response = await app.handle(
            new Request(`http://localhost/professionals/${TEST_IDS.professional}`, {
                method: "PATCH",
                headers: { ...requestHeaders, "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: false }),
            }),
        );

        expect(response.status).toBe(409);
    });

    it("DELETE /professionals/:id remove", async () => {
        const repository = new InMemoryProfessionalsRepository(
            {
                [TEST_IDS.professional]: {
                    id: TEST_IDS.professional,
                    userId: TEST_IDS.user,
                    isActive: true,
                    createdAt: "2026-02-01T17:27:35.202Z",
                    updatedAt: "2026-02-01T17:27:35.202Z",
                },
            },
            {
                [TEST_IDS.professional]: [TEST_IDS.unit],
            },
        );
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            professionalsRepository: repository as any,
            accessMap,
        });

        const response = await app.handle(
            new Request(`http://localhost/professionals/${TEST_IDS.professional}`, {
                method: "DELETE",
                headers: requestHeaders,
            }),
        );

        expect(response.status).toBe(200);
    });

    it("retorna 403 quando usuário não tem acesso à unidade", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            professionalsRepository: new InMemoryProfessionalsRepository() as any,
            accessMap: {},
        });

        const response = await app.handle(
            new Request("http://localhost/professionals", { headers: requestHeaders }),
        );

        expect(response.status).toBe(403);
    });

    it("retorna 400 quando clínica não está selecionada", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            professionalsRepository: new InMemoryProfessionalsRepository() as any,
            accessMap,
        });

        const response = await app.handle(
            new Request("http://localhost/professionals", {
                headers: { "x-user-id": TEST_IDS.user },
            }),
        );

        expect(response.status).toBe(400);
    });

    it("PATCH /professionals/:id retorna 400 sem clínica selecionada", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            professionalsRepository: new InMemoryProfessionalsRepository() as any,
            accessMap,
        });

        const response = await app.handle(
            new Request(`http://localhost/professionals/${TEST_IDS.professional}`, {
                method: "PATCH",
                headers: {
                    "x-user-id": TEST_IDS.user,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ isActive: false }),
            }),
        );

        expect(response.status).toBe(400);
    });

    it("DELETE /professionals/:id retorna 400 sem clínica selecionada", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            professionalsRepository: new InMemoryProfessionalsRepository() as any,
            accessMap,
        });

        const response = await app.handle(
            new Request(`http://localhost/professionals/${TEST_IDS.professional}`, {
                method: "DELETE",
                headers: {
                    "x-user-id": TEST_IDS.user,
                },
            }),
        );

        expect(response.status).toBe(400);
    });
});
