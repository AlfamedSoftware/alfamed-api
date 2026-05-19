import { describe, expect, it } from "vitest";
import { unitProfileSchema } from "../../src/modules/units/units.schemas";
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
            cnpj: null,
            address: null,
            city: null,
            state: null,
            phone: null,
            email: null,
            ownerUserId: null,
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

    it("GET /units/by-user lista unidades do usuário", async () => {
        const userUnits = {
            [TEST_IDS.user]: [TEST_IDS.unit],
        };

        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            unitsRepository: new InMemoryUnitsRepository(unitFixture, userUnits),
        });

        const response = await app.handle(
            new Request("http://localhost/units/by-user", {
                headers: {
                    "x-user-id": TEST_IDS.user,
                },
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBe(1);
        expect(() => body.forEach((unit: unknown) => unitProfileSchema.parse(unit))).not.toThrow();
        expect(body[0]).toMatchObject({ id: TEST_IDS.unit });
    });

    it("GET /units/by-user retorna array vazio quando usuário não tem unidades", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            unitsRepository: new InMemoryUnitsRepository(unitFixture),
        });

        const response = await app.handle(
            new Request("http://localhost/units/by-user", {
                headers: {
                    "x-user-id": TEST_IDS.user,
                },
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBe(0);
    });

    it("GET /units/by-user ignora unidade inativa", async () => {
        const inactiveUnitFixture = {
            [TEST_IDS.unit]: {
                id: TEST_IDS.unit,
                name: "Unidade A",
                cnpj: null,
                address: null,
                city: null,
                state: null,
                phone: null,
                email: null,
                ownerUserId: null,
                isActive: false,
                createdAt: "2026-02-01T17:27:35.202Z",
                updatedAt: "2026-02-01T17:27:35.202Z",
            },
        };
        const userUnits = {
            [TEST_IDS.user]: [TEST_IDS.unit],
        };

        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            unitsRepository: new InMemoryUnitsRepository(inactiveUnitFixture, userUnits),
        });

        const response = await app.handle(
            new Request("http://localhost/units/by-user", {
                headers: {
                    "x-user-id": TEST_IDS.user,
                },
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBe(0);
    });

    it("GET /units/by-user retorna array vazio quando usuário está inativo", async () => {
        const userUnits = {
            [TEST_IDS.user]: [TEST_IDS.unit],
        };
        const userIsActive = {
            [TEST_IDS.user]: false,
        };

        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            unitsRepository: new InMemoryUnitsRepository(unitFixture, userUnits, userIsActive),
        });

        const response = await app.handle(
            new Request("http://localhost/units/by-user", {
                headers: {
                    "x-user-id": TEST_IDS.user,
                },
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBe(0);
    });

    it("GET /units/by-user retorna array vazio quando profissional está inativo", async () => {
        const userUnits = {
            [TEST_IDS.user]: [TEST_IDS.unit],
        };
        const professionalIsActiveByUser = {
            [TEST_IDS.user]: false,
        };

        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            unitsRepository: new InMemoryUnitsRepository(
                unitFixture,
                userUnits,
                {},
                professionalIsActiveByUser,
            ),
        });

        const response = await app.handle(
            new Request("http://localhost/units/by-user", {
                headers: {
                    "x-user-id": TEST_IDS.user,
                },
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBe(0);
    });

    it("GET /units/by-user retorna 401 sem autenticação", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            unitsRepository: new InMemoryUnitsRepository(),
        });

        const response = await app.handle(
            new Request("http://localhost/units/by-user"),
        );
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body).toMatchObject({ message: "Unauthorized" });
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

});
