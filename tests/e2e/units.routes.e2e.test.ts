import { describe, expect, it } from "vitest";
import { unitProfileSchema } from "@/modules/units/units.schemas";
import { buildE2EApp, TEST_IDS } from "./helpers/context";
import { InMemoryUnitsRepository, InMemoryUsersRepository } from "./helpers/repositories";

describe("Units routes", () => {
    const accessMap = {
        [TEST_IDS.user]: [TEST_IDS.unit, TEST_IDS.missingUnit],
    };

    const unitFixture = {
        [TEST_IDS.unit]: {
            id: TEST_IDS.unit,
            name: "Unidade A",
            isActive: true,
            createdAt: "2026-02-01T17:27:35.202Z",
            updatedAt: "2026-02-01T17:27:35.202Z",
        },
    };

    it("POST /units cria unidade", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            unitsRepository: new InMemoryUnitsRepository(),
            accessMap: {},
        });

        const response = await app.handle(
            new Request("http://localhost/units", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-user-id": TEST_IDS.user,
                },
                body: JSON.stringify({
                    name: "Unidade Centro",
                    isActive: true,
                }),
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(201);
        expect(() => unitProfileSchema.parse(body)).not.toThrow();
        expect(body).toMatchObject({
            name: "Unidade Centro",
            isActive: true,
        });
    });

    it("POST /units retorna 401 sem autenticação", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            unitsRepository: new InMemoryUnitsRepository(),
        });

        const response = await app.handle(
            new Request("http://localhost/units", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: "Unidade Centro",
                    isActive: true,
                }),
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body).toMatchObject({ message: "Unauthorized" });
    });

    it("POST /units retorna 403 quando usuário não é profissional", async () => {
        const repository = new InMemoryUnitsRepository();
        repository.createForUser = async () => {
            throw new Error("Forbidden");
        };

        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            unitsRepository: repository,
        });

        const response = await app.handle(
            new Request("http://localhost/units", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-user-id": TEST_IDS.user,
                },
                body: JSON.stringify({
                    name: "Unidade Centro",
                    isActive: true,
                }),
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body).toMatchObject({ message: "Forbidden" });
    });

    it("GET /units/:id retorna unidade", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            unitsRepository: new InMemoryUnitsRepository(unitFixture),
            accessMap,
        });

        const response = await app.handle(
            new Request(`http://localhost/units/${TEST_IDS.unit}`, {
                headers: {
                    "x-user-id": TEST_IDS.user,
                    "x-unit-id": TEST_IDS.unit,
                },
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(() => unitProfileSchema.parse(body)).not.toThrow();
        expect(body).toMatchObject({ id: TEST_IDS.unit });
    });

    it("GET /units/:id retorna 404 para unidade inexistente", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            unitsRepository: new InMemoryUnitsRepository(),
            accessMap,
        });

        const response = await app.handle(
            new Request(`http://localhost/units/${TEST_IDS.missingUnit}`, {
                headers: {
                    "x-user-id": TEST_IDS.user,
                },
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(404);
        expect(body).toMatchObject({ message: "Unit not found" });
    });

    it("GET /units/:id retorna 403 sem acesso", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            unitsRepository: new InMemoryUnitsRepository(unitFixture),
            accessMap: { [TEST_IDS.otherUser]: [TEST_IDS.unit] },
        });

        const response = await app.handle(
            new Request(`http://localhost/units/${TEST_IDS.unit}`, {
                headers: {
                    "x-user-id": TEST_IDS.user,
                },
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body).toMatchObject({ message: "Forbidden" });
    });

    it("PATCH /units atualiza unidade", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            unitsRepository: new InMemoryUnitsRepository(unitFixture),
            accessMap,
        });

        const response = await app.handle(
            new Request(`http://localhost/units/${TEST_IDS.unit}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "x-user-id": TEST_IDS.user,
                },
                body: JSON.stringify({
                    name: "Unidade A - Atualizada",
                }),
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(() => unitProfileSchema.parse(body)).not.toThrow();
        expect(body).toMatchObject({
            id: TEST_IDS.unit,
            name: "Unidade A - Atualizada",
        });
    });

    it("PATCH /units retorna 403 sem acesso", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            unitsRepository: new InMemoryUnitsRepository(unitFixture),
            accessMap: { [TEST_IDS.otherUser]: [TEST_IDS.unit] },
        });

        const response = await app.handle(
            new Request(`http://localhost/units/${TEST_IDS.unit}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "x-user-id": TEST_IDS.user,
                },
                body: JSON.stringify({ name: "X" }),
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body).toMatchObject({ message: "Forbidden" });
    });

    it("PATCH /units retorna 404 para unidade inexistente", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            unitsRepository: new InMemoryUnitsRepository(),
            accessMap,
        });

        const response = await app.handle(
            new Request(`http://localhost/units/${TEST_IDS.missingUnit}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "x-user-id": TEST_IDS.user,
                },
                body: JSON.stringify({ name: "X" }),
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(404);
        expect(body).toMatchObject({ message: "Unit not found" });
    });

    it("DELETE /units remove unidade", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            unitsRepository: new InMemoryUnitsRepository(unitFixture),
            accessMap,
        });

        const response = await app.handle(
            new Request(`http://localhost/units/${TEST_IDS.unit}`, {
                method: "DELETE",
                headers: {
                    "x-user-id": TEST_IDS.user,
                },
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toMatchObject({ message: "Unit deleted" });
    });

    it("DELETE /units/:id retorna 403 sem acesso", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            unitsRepository: new InMemoryUnitsRepository(unitFixture),
            accessMap: { [TEST_IDS.otherUser]: [TEST_IDS.unit] },
        });

        const response = await app.handle(
            new Request(`http://localhost/units/${TEST_IDS.unit}`, {
                method: "DELETE",
                headers: {
                    "x-user-id": TEST_IDS.user,
                },
            }),
        );

        expect(response.status).toBe(403);
    });

    it("DELETE /units/:id retorna 404 para unidade inexistente", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            unitsRepository: new InMemoryUnitsRepository(),
            accessMap,
        });

        const response = await app.handle(
            new Request(`http://localhost/units/${TEST_IDS.missingUnit}`, {
                method: "DELETE",
                headers: {
                    "x-user-id": TEST_IDS.user,
                },
            }),
        );

        expect(response.status).toBe(404);
    });
});
