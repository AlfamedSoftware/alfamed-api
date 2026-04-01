import { describe, expect, it } from "vitest";
import { professionalProfileSchema } from "@/modules/professionals/professionals.schemas";
import { buildE2EApp, TEST_IDS } from "./helpers/context";
import { InMemoryProfessionalsRepository, InMemoryUsersRepository } from "./helpers/repositories";

describe("Professionals routes", () => {
    const accessMap = {
        [TEST_IDS.user]: [TEST_IDS.unit],
    };

    const requestHeaders = {
        "x-user-id": TEST_IDS.user,
        "x-unit-id": TEST_IDS.unit,
    };

    it("POST /professionals cria profissional", async () => {
        const repository = new InMemoryProfessionalsRepository();
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            professionalsRepository: repository,
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
            professionalsRepository: repository,
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
            professionalsRepository: new InMemoryProfessionalsRepository(),
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
            professionalsRepository: repository,
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
            professionalsRepository: repository,
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
            professionalsRepository: new InMemoryProfessionalsRepository(),
            accessMap: {},
        });

        const response = await app.handle(
            new Request("http://localhost/professionals", { headers: requestHeaders }),
        );

        expect(response.status).toBe(403);
    });

    it("retorna 400 quando x-unit-id ausente", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            professionalsRepository: new InMemoryProfessionalsRepository(),
            accessMap,
        });

        const response = await app.handle(
            new Request("http://localhost/professionals", {
                headers: { "x-user-id": TEST_IDS.user },
            }),
        );

        expect(response.status).toBe(400);
    });
});
