import { describe, expect, it } from "vitest";
import Elysia from "elysia";
import { buildApp } from "@/app";
import type { UsersRepository } from "@/modules/users/users.repository";
import type { CreateUnitInput, UnitProfile, UpdateUnitInput } from "@/modules/units/units.repository";
import { unitProfileSchema } from "@/modules/units/units.schemas";

class InMemoryUsersRepository implements UsersRepository {
    async getUserById(_: string) {
        return null;
    }
}

interface UnitsRepositoryContract {
    create(data: CreateUnitInput): Promise<UnitProfile>;
    findById(unitId: string): Promise<UnitProfile | null>;
    update(unitId: string, data: UpdateUnitInput): Promise<UnitProfile | null>;
    delete(unitId: string): Promise<void>;
}

class InMemoryUnitsRepository implements UnitsRepositoryContract {
    private readonly units: Record<string, UnitProfile>;
    private sequence = 1;

    constructor(
        initialUnits: Record<string, UnitProfile> = {},
    ) {
        this.units = { ...initialUnits };
    }

    async create(data: CreateUnitInput): Promise<UnitProfile> {
        const now = new Date().toISOString();
        const id = `019c1a3e-e425-7000-8bda-cdfec32c9f${String(this.sequence).padStart(2, "0")}`;
        this.sequence += 1;

        const unit: UnitProfile = {
            id,
            name: data.name,
            isActive: data.isActive ?? true,
            createdAt: now,
            updatedAt: now,
        };

        this.units[id] = unit;

        return unit;
    }

    async findById(unitId: string): Promise<UnitProfile | null> {
        return this.units[unitId] ?? null;
    }

    async update(unitId: string, data: UpdateUnitInput): Promise<UnitProfile | null> {
        const current = this.units[unitId];

        if (!current) {
            return null;
        }

        const updated: UnitProfile = {
            ...current,
            name: data.name ?? current.name,
            isActive: data.isActive ?? current.isActive,
            updatedAt: new Date().toISOString(),
        };

        this.units[unitId] = updated;

        return updated;
    }

    async delete(unitId: string): Promise<void> {
        delete this.units[unitId];
    }
}

type AllowedUnitsByUser = Record<string, string[]>;

const createInMemoryHasUserAccessToUnitChecker = (map: AllowedUnitsByUser) =>
    async (userId: string, unitId: string) => (map[userId] ?? []).includes(unitId);

const fakeAuthPlugin = new Elysia().macro({
    auth: {
        async resolve({ request, status }) {
            const userId = request.headers.get("x-user-id");

            if (!userId) {
                return status(401, { message: "Unauthorized" });
            }

            return { user: { id: userId } };
        },
    },
});

describe("Units routes", () => {
    const userId = "019c1a3e-e425-7000-8bda-cdfec32c8fed";
    const otherUserId = "019c1a3e-e425-7000-8bda-cdfec32c8fea";

    it("POST /units deve criar uma unidade", async () => {
        const repository = new InMemoryUnitsRepository();
        const app = await buildApp({
            db: null as never,
            authPlugin: fakeAuthPlugin,
            withDocs: false,
            usersRepository: new InMemoryUsersRepository(),
            unitsRepository: repository as never,
            hasUserAccessToUnitChecker: createInMemoryHasUserAccessToUnitChecker({}),
        });

        const response = await app.handle(
            new Request("http://localhost/units", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-user-id": userId,
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

    it("GET /units/:id deve retornar a unidade do x-unit-id", async () => {
        const unitId = "019c1a3e-e425-7000-8bda-cdfec32c8fc1";

        const repository = new InMemoryUnitsRepository({
            [unitId]: {
                id: unitId,
                name: "Unidade A",
                isActive: true,
                createdAt: "2026-02-01T17:27:35.202Z",
                updatedAt: "2026-02-01T17:27:35.202Z",
            },
        });

        const app = await buildApp({
            db: null as never,
            authPlugin: fakeAuthPlugin,
            withDocs: false,
            usersRepository: new InMemoryUsersRepository(),
            unitsRepository: repository as never,
            hasUserAccessToUnitChecker: createInMemoryHasUserAccessToUnitChecker({
                [userId]: [unitId],
            }),
        });

        const response = await app.handle(
            new Request(`http://localhost/units/${unitId}`, {
                headers: {
                    "x-user-id": userId,
                    "x-unit-id": unitId,
                },
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(() => unitProfileSchema.parse(body)).not.toThrow();
        expect(body).toMatchObject({ id: unitId });
    });

    it("GET /units/:id deve retornar 400 quando x-unit-id estiver ausente", async () => {
        const repository = new InMemoryUnitsRepository();

        const app = await buildApp({
            db: null as never,
            authPlugin: fakeAuthPlugin,
            withDocs: false,
            usersRepository: new InMemoryUsersRepository(),
            unitsRepository: repository as never,
            hasUserAccessToUnitChecker: createInMemoryHasUserAccessToUnitChecker({}),
        });

        const response = await app.handle(
            new Request("http://localhost/units/qualquer-id", {
                headers: {
                    "x-user-id": userId,
                },
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body).toMatchObject({ message: "Invalid or missing unit header" });
    });

    it("GET /units/:id deve retornar 403 quando unidade não pertence ao usuário", async () => {
        const unitId = "019c1a3e-e425-7000-8bda-cdfec32c8fc1";

        const repository = new InMemoryUnitsRepository({
            [unitId]: {
                id: unitId,
                name: "Unidade A",
                isActive: true,
                createdAt: "2026-02-01T17:27:35.202Z",
                updatedAt: "2026-02-01T17:27:35.202Z",
            },
        });

        const app = await buildApp({
            db: null as never,
            authPlugin: fakeAuthPlugin,
            withDocs: false,
            usersRepository: new InMemoryUsersRepository(),
            unitsRepository: repository as never,
            hasUserAccessToUnitChecker: createInMemoryHasUserAccessToUnitChecker({
                [otherUserId]: [unitId],
            }),
        });

        const response = await app.handle(
            new Request(`http://localhost/units/${unitId}`, {
                headers: {
                    "x-user-id": userId,
                    "x-unit-id": unitId,
                },
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body).toMatchObject({ message: "Forbidden" });
    });

    it("PATCH /units deve atualizar a unidade do x-unit-id", async () => {
        const unitId = "019c1a3e-e425-7000-8bda-cdfec32c8fc1";

        const repository = new InMemoryUnitsRepository({
            [unitId]: {
                id: unitId,
                name: "Unidade A",
                isActive: true,
                createdAt: "2026-02-01T17:27:35.202Z",
                updatedAt: "2026-02-01T17:27:35.202Z",
            },
        });

        const app = await buildApp({
            db: null as never,
            authPlugin: fakeAuthPlugin,
            withDocs: false,
            usersRepository: new InMemoryUsersRepository(),
            unitsRepository: repository as never,
            hasUserAccessToUnitChecker: createInMemoryHasUserAccessToUnitChecker({
                [userId]: [unitId],
            }),
        });

        const response = await app.handle(
            new Request("http://localhost/units", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "x-user-id": userId,
                    "x-unit-id": unitId,
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
            id: unitId,
            name: "Unidade A - Atualizada",
        });
    });

    it("PATCH /units deve retornar 400 quando x-unit-id estiver ausente", async () => {
        const repository = new InMemoryUnitsRepository();

        const app = await buildApp({
            db: null as never,
            authPlugin: fakeAuthPlugin,
            withDocs: false,
            usersRepository: new InMemoryUsersRepository(),
            unitsRepository: repository as never,
            hasUserAccessToUnitChecker: createInMemoryHasUserAccessToUnitChecker({}),
        });

        const response = await app.handle(
            new Request("http://localhost/units", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "x-user-id": userId,
                },
                body: JSON.stringify({ name: "X" }),
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body).toMatchObject({ message: "Invalid or missing unit header" });
    });

    it("PATCH /units deve retornar 403 quando unidade não pertence ao usuário", async () => {
        const unitId = "019c1a3e-e425-7000-8bda-cdfec32c8fc1";

        const repository = new InMemoryUnitsRepository({
            [unitId]: {
                id: unitId,
                name: "Unidade A",
                isActive: true,
                createdAt: "2026-02-01T17:27:35.202Z",
                updatedAt: "2026-02-01T17:27:35.202Z",
            },
        });

        const app = await buildApp({
            db: null as never,
            authPlugin: fakeAuthPlugin,
            withDocs: false,
            usersRepository: new InMemoryUsersRepository(),
            unitsRepository: repository as never,
            hasUserAccessToUnitChecker: createInMemoryHasUserAccessToUnitChecker({
                [otherUserId]: [unitId],
            }),
        });

        const response = await app.handle(
            new Request("http://localhost/units", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "x-user-id": userId,
                    "x-unit-id": unitId,
                },
                body: JSON.stringify({ name: "X" }),
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body).toMatchObject({ message: "Forbidden" });
    });

    it("DELETE /units deve deletar a unidade do x-unit-id", async () => {
        const unitId = "019c1a3e-e425-7000-8bda-cdfec32c8fc1";

        const repository = new InMemoryUnitsRepository({
            [unitId]: {
                id: unitId,
                name: "Unidade A",
                isActive: true,
                createdAt: "2026-02-01T17:27:35.202Z",
                updatedAt: "2026-02-01T17:27:35.202Z",
            },
        });

        const app = await buildApp({
            db: null as never,
            authPlugin: fakeAuthPlugin,
            withDocs: false,
            usersRepository: new InMemoryUsersRepository(),
            unitsRepository: repository as never,
            hasUserAccessToUnitChecker: createInMemoryHasUserAccessToUnitChecker({
                [userId]: [unitId],
            }),
        });

        const response = await app.handle(
            new Request("http://localhost/units", {
                method: "DELETE",
                headers: {
                    "x-user-id": userId,
                    "x-unit-id": unitId,
                },
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toMatchObject({ message: "Unit deleted" });
    });

    it("DELETE /units deve retornar 400 quando x-unit-id estiver ausente", async () => {
        const repository = new InMemoryUnitsRepository();

        const app = await buildApp({
            db: null as never,
            authPlugin: fakeAuthPlugin,
            withDocs: false,
            usersRepository: new InMemoryUsersRepository(),
            unitsRepository: repository as never,
            hasUserAccessToUnitChecker: createInMemoryHasUserAccessToUnitChecker({}),
        });

        const response = await app.handle(
            new Request("http://localhost/units", {
                method: "DELETE",
                headers: {
                    "x-user-id": userId,
                },
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body).toMatchObject({ message: "Invalid or missing unit header" });
    });

    it("DELETE /units deve retornar 403 quando unidade não pertence ao usuário", async () => {
        const unitId = "019c1a3e-e425-7000-8bda-cdfec32c8fc1";

        const repository = new InMemoryUnitsRepository({
            [unitId]: {
                id: unitId,
                name: "Unidade A",
                isActive: true,
                createdAt: "2026-02-01T17:27:35.202Z",
                updatedAt: "2026-02-01T17:27:35.202Z",
            },
        });

        const app = await buildApp({
            db: null as never,
            authPlugin: fakeAuthPlugin,
            withDocs: false,
            usersRepository: new InMemoryUsersRepository(),
            unitsRepository: repository as never,
            hasUserAccessToUnitChecker: createInMemoryHasUserAccessToUnitChecker({
                [otherUserId]: [unitId],
            }),
        });

        const response = await app.handle(
            new Request("http://localhost/units", {
                method: "DELETE",
                headers: {
                    "x-user-id": userId,
                    "x-unit-id": unitId,
                },
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body).toMatchObject({ message: "Forbidden" });
    });
});
