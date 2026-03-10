import { describe, expect, it } from "vitest";
import Elysia from "elysia";
import { buildApp } from "@/app";
import type { db as dbType } from "@/db/client";
import type {
    CreateProfessionalInput,
    ProfessionalProfile,
    UpdateProfessionalInput,
} from "@/modules/professionals/professionals.repository";
import { professionalProfileSchema } from "@/modules/professionals/professionals.schemas";
import type { UsersRepository } from "@/modules/users/users.repository";

class InMemoryUsersRepository implements UsersRepository {
    async getUserById(_: string) {
        return null;
    }
}

type AllowedUnitsByUser = Record<string, string[]>;

const createInMemoryHasUserAccessToUnitChecker = (map: AllowedUnitsByUser) =>
    async (userId: string, unitId: string) => (map[userId] ?? []).includes(unitId);

const unusedDb = new Proxy(
    {},
    {
        get() {
            throw new Error("Unexpected db usage in e2e test");
        },
    },
) as unknown as typeof dbType;

interface ProfessionalsRepositoryContract {
    create(data: CreateProfessionalInput): Promise<ProfessionalProfile>;
    createWithUnit(data: CreateProfessionalInput, unitId: string): Promise<ProfessionalProfile>;
    findById(professionalId: string): Promise<ProfessionalProfile | null>;
    findByIdAndUnit(professionalId: string, unitId: string): Promise<ProfessionalProfile | null>;
    list(): Promise<ProfessionalProfile[]>;
    listByUnit(unitId: string): Promise<ProfessionalProfile[]>;
    update(professionalId: string, data: UpdateProfessionalInput): Promise<ProfessionalProfile | null>;
    delete(professionalId: string): Promise<void>;
}

class InMemoryProfessionalsRepository implements ProfessionalsRepositoryContract {
    // O buildApp/professionalsRoutes agora tipam ProfessionalsRepository com `.db`.
    // Nos testes e2e a gente só precisa de um stub.
    readonly db = unusedDb;
    private readonly professionals: Record<string, ProfessionalProfile>;
    private readonly professionalsUnits: Record<string, string[]>;
    private sequence = 1;

    constructor(
        initialProfessionals: Record<string, ProfessionalProfile> = {},
        initialProfessionalsUnits: Record<string, string[]> = {},
    ) {
        this.professionals = { ...initialProfessionals };
        this.professionalsUnits = { ...initialProfessionalsUnits };
    }

    async create(data: CreateProfessionalInput): Promise<ProfessionalProfile> {
        const now = new Date().toISOString();
        const id = `019c1a3e-e425-7000-8bda-cdfec32c8f${String(this.sequence).padStart(2, "0")}`;
        this.sequence += 1;

        const professional: ProfessionalProfile = {
            id,
            userId: data.userId,
            isActive: data.isActive ?? true,
            createdAt: now,
            updatedAt: now,
        };

        this.professionals[id] = professional;

        return professional;
    }

    async createWithUnit(data: CreateProfessionalInput, unitId: string): Promise<ProfessionalProfile> {
        const professional = await this.create(data);
        this.professionalsUnits[professional.id] = [...(this.professionalsUnits[professional.id] ?? []), unitId];

        return professional;
    }

    async findById(professionalId: string): Promise<ProfessionalProfile | null> {
        return this.professionals[professionalId] ?? null;
    }

    async findByIdAndUnit(professionalId: string, unitId: string): Promise<ProfessionalProfile | null> {
        const professional = this.professionals[professionalId] ?? null;

        if (!professional) {
            return null;
        }

        const units = this.professionalsUnits[professionalId] ?? [];

        if (!units.includes(unitId)) {
            return null;
        }

        return professional;
    }

    async list(): Promise<ProfessionalProfile[]> {
        return Object.values(this.professionals);
    }

    async listByUnit(unitId: string): Promise<ProfessionalProfile[]> {
        return Object.values(this.professionals).filter((professional) => {
            const units = this.professionalsUnits[professional.id] ?? [];

            return units.includes(unitId);
        });
    }

    async update(professionalId: string, data: UpdateProfessionalInput): Promise<ProfessionalProfile | null> {
        const current = this.professionals[professionalId];

        if (!current) {
            return null;
        }

        const updated: ProfessionalProfile = {
            ...current,
            userId: data.userId ?? current.userId,
            isActive: data.isActive ?? current.isActive,
            updatedAt: new Date().toISOString(),
        };

        this.professionals[professionalId] = updated;

        return updated;
    }

    async delete(professionalId: string): Promise<void> {
        delete this.professionals[professionalId];
    }
}

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

describe("Professionals routes", () => {
    const requesterUserId = "019c1a3e-e425-7000-8bda-cdfec32c8fed";
    const selectedUnitId = "019c1a3e-e425-7000-8bda-cdfec32c8fc1";
    const requesterUnits = {
        [requesterUserId]: [selectedUnitId],
    };

    it("POST /professionals deve criar um profissional", async () => {
        const repository = new InMemoryProfessionalsRepository({}, {});
        const app = await buildApp({
            db: unusedDb,
            authPlugin: fakeAuthPlugin,
            withDocs: false,
            usersRepository: new InMemoryUsersRepository(),
            professionalsRepository: repository,
            hasUserAccessToUnitChecker: createInMemoryHasUserAccessToUnitChecker(requesterUnits),
        });

        const response = await app.handle(
            new Request("http://localhost/professionals", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-user-id": requesterUserId,
                    "x-unit-id": selectedUnitId,
                },
                body: JSON.stringify({
                    isActive: true,
                }),
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(201);
        expect(() => professionalProfileSchema.parse(body)).not.toThrow();
        expect(body).toMatchObject({
            userId: requesterUserId,
            isActive: true,
        });

        const createdProfessionalId = body.id as string;
        const listResponse = await app.handle(
            new Request("http://localhost/professionals", {
                headers: {
                    "x-user-id": requesterUserId,
                    "x-unit-id": selectedUnitId,
                },
            }),
        );
        const listBody = await listResponse.json();

        expect(listResponse.status).toBe(200);
        expect(Array.isArray(listBody)).toBe(true);
        expect(listBody).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: createdProfessionalId,
                }),
            ]),
        );
    });

    it("POST /professionals deve rejeitar userId enviado no body", async () => {
        const repository = new InMemoryProfessionalsRepository({}, {});
        const app = await buildApp({
            db: unusedDb,
            authPlugin: fakeAuthPlugin,
            withDocs: false,
            usersRepository: new InMemoryUsersRepository(),
            professionalsRepository: repository,
            hasUserAccessToUnitChecker: createInMemoryHasUserAccessToUnitChecker(requesterUnits),
        });

        const response = await app.handle(
            new Request("http://localhost/professionals", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-user-id": requesterUserId,
                    "x-unit-id": selectedUnitId,
                },
                body: JSON.stringify({
                    userId: "019c1a3e-e425-7000-8bda-cdfec32c8fea",
                    isActive: true,
                }),
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(422);
        expect(body).toMatchObject({});
    });

    it("GET /professionals deve listar profissionais", async () => {
        const app = await buildApp({
            db: unusedDb,
            authPlugin: fakeAuthPlugin,
            withDocs: false,
            usersRepository: new InMemoryUsersRepository(),
            professionalsRepository: new InMemoryProfessionalsRepository({
                "019c1a3e-e425-7000-8bda-cdfec32c8fa1": {
                    id: "019c1a3e-e425-7000-8bda-cdfec32c8fa1",
                    userId: "019c1a3e-e425-7000-8bda-cdfec32c8fb1",
                    isActive: true,
                    createdAt: "2026-02-01T17:27:35.202Z",
                    updatedAt: "2026-02-01T17:27:35.202Z",
                },
                "019c1a3e-e425-7000-8bda-cdfec32c8fa2": {
                    id: "019c1a3e-e425-7000-8bda-cdfec32c8fa2",
                    userId: "019c1a3e-e425-7000-8bda-cdfec32c8fb2",
                    isActive: false,
                    createdAt: "2026-02-01T17:27:35.202Z",
                    updatedAt: "2026-02-01T17:27:35.202Z",
                },
            }, {
                "019c1a3e-e425-7000-8bda-cdfec32c8fa1": [selectedUnitId],
                "019c1a3e-e425-7000-8bda-cdfec32c8fa2": ["019c1a3e-e425-7000-8bda-cdfec32c8fc2"],
            }),
            hasUserAccessToUnitChecker: createInMemoryHasUserAccessToUnitChecker(requesterUnits),
        });

        const response = await app.handle(
            new Request("http://localhost/professionals", {
                headers: {
                    "x-user-id": requesterUserId,
                    "x-unit-id": selectedUnitId,
                },
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(body)).toBe(true);
        expect(body).toHaveLength(1);
        expect(() => professionalProfileSchema.parse(body[0])).not.toThrow();
        expect(body[0]?.id).toBe("019c1a3e-e425-7000-8bda-cdfec32c8fa1");
    });

    it("GET /professionals/:id deve retornar profissional por id", async () => {
        const existingProfessionalId = "019c1a3e-e425-7000-8bda-cdfec32c8fa1";

        const app = await buildApp({
            db: unusedDb,
            authPlugin: fakeAuthPlugin,
            withDocs: false,
            usersRepository: new InMemoryUsersRepository(),
            professionalsRepository: new InMemoryProfessionalsRepository(
                {
                    [existingProfessionalId]: {
                        id: existingProfessionalId,
                        userId: "019c1a3e-e425-7000-8bda-cdfec32c8fb1",
                        isActive: true,
                        createdAt: "2026-02-01T17:27:35.202Z",
                        updatedAt: "2026-02-01T17:27:35.202Z",
                    },
                },
                {
                    [existingProfessionalId]: [selectedUnitId],
                },
            ),
            hasUserAccessToUnitChecker: createInMemoryHasUserAccessToUnitChecker(requesterUnits),
        });

        const response = await app.handle(
            new Request(`http://localhost/professionals/${existingProfessionalId}`, {
                headers: {
                    "x-user-id": requesterUserId,
                    "x-unit-id": selectedUnitId,
                },
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(() => professionalProfileSchema.parse(body)).not.toThrow();
        expect(body).toMatchObject({
            id: existingProfessionalId,
        });
    });

    it("PATCH /professionals/:id deve atualizar profissional", async () => {
        const existingProfessionalId = "019c1a3e-e425-7000-8bda-cdfec32c8fa1";

        const app = await buildApp({
            db: unusedDb,
            authPlugin: fakeAuthPlugin,
            withDocs: false,
            usersRepository: new InMemoryUsersRepository(),
            professionalsRepository: new InMemoryProfessionalsRepository(
                {
                    [existingProfessionalId]: {
                        id: existingProfessionalId,
                        userId: "019c1a3e-e425-7000-8bda-cdfec32c8fb1",
                        isActive: true,
                        createdAt: "2026-02-01T17:27:35.202Z",
                        updatedAt: "2026-02-01T17:27:35.202Z",
                    },
                },
                {
                    [existingProfessionalId]: [selectedUnitId],
                },
            ),
            hasUserAccessToUnitChecker: createInMemoryHasUserAccessToUnitChecker(requesterUnits),
        });

        const response = await app.handle(
            new Request(`http://localhost/professionals/${existingProfessionalId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "x-user-id": requesterUserId,
                    "x-unit-id": selectedUnitId,
                },
                body: JSON.stringify({
                    isActive: false,
                }),
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(() => professionalProfileSchema.parse(body)).not.toThrow();
        expect(body).toMatchObject({
            id: existingProfessionalId,
            isActive: false,
        });
    });

    it("DELETE /professionals/:id deve remover profissional", async () => {
        const existingProfessionalId = "019c1a3e-e425-7000-8bda-cdfec32c8fa1";

        const app = await buildApp({
            db: unusedDb,
            authPlugin: fakeAuthPlugin,
            withDocs: false,
            usersRepository: new InMemoryUsersRepository(),
            professionalsRepository: new InMemoryProfessionalsRepository(
                {
                    [existingProfessionalId]: {
                        id: existingProfessionalId,
                        userId: "019c1a3e-e425-7000-8bda-cdfec32c8fb1",
                        isActive: true,
                        createdAt: "2026-02-01T17:27:35.202Z",
                        updatedAt: "2026-02-01T17:27:35.202Z",
                    },
                },
                {
                    [existingProfessionalId]: [selectedUnitId],
                },
            ),
            hasUserAccessToUnitChecker: createInMemoryHasUserAccessToUnitChecker(requesterUnits),
        });

        const response = await app.handle(
            new Request(`http://localhost/professionals/${existingProfessionalId}`, {
                method: "DELETE",
                headers: {
                    "x-user-id": requesterUserId,
                    "x-unit-id": selectedUnitId,
                },
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toMatchObject({ message: "Professional deleted" });
    });

    it("GET /professionals/:id deve retornar 404 quando profissional não existir", async () => {
        const missingProfessionalId = "019c1a3e-e425-7000-8bda-cdfec32c8fa9";

        const app = await buildApp({
            db: unusedDb,
            authPlugin: fakeAuthPlugin,
            withDocs: false,
            usersRepository: new InMemoryUsersRepository(),
            professionalsRepository: new InMemoryProfessionalsRepository({}, {}),
            hasUserAccessToUnitChecker: createInMemoryHasUserAccessToUnitChecker(requesterUnits),
        });

        const response = await app.handle(
            new Request(`http://localhost/professionals/${missingProfessionalId}`, {
                headers: {
                    "x-user-id": requesterUserId,
                    "x-unit-id": selectedUnitId,
                },
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(404);
        expect(body).toMatchObject({ message: "Professional not found" });
    });

    it("GET /professionals/:id deve retornar 404 quando profissional for de outra unidade", async () => {
        const existingProfessionalId = "019c1a3e-e425-7000-8bda-cdfec32c8fa1";

        const app = await buildApp({
            db: unusedDb,
            authPlugin: fakeAuthPlugin,
            withDocs: false,
            usersRepository: new InMemoryUsersRepository(),
            professionalsRepository: new InMemoryProfessionalsRepository(
                {
                    [existingProfessionalId]: {
                        id: existingProfessionalId,
                        userId: "019c1a3e-e425-7000-8bda-cdfec32c8fb1",
                        isActive: true,
                        createdAt: "2026-02-01T17:27:35.202Z",
                        updatedAt: "2026-02-01T17:27:35.202Z",
                    },
                },
                {
                    [existingProfessionalId]: ["019c1a3e-e425-7000-8bda-cdfec32c8fc2"],
                },
            ),
            hasUserAccessToUnitChecker: createInMemoryHasUserAccessToUnitChecker(requesterUnits),
        });

        const response = await app.handle(
            new Request(`http://localhost/professionals/${existingProfessionalId}`, {
                headers: {
                    "x-user-id": requesterUserId,
                    "x-unit-id": selectedUnitId,
                },
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(404);
        expect(body).toMatchObject({ message: "Professional not found" });
    });

    it("GET /professionals deve retornar 400 quando x-unit-id estiver ausente", async () => {
        const app = await buildApp({
            db: unusedDb,
            authPlugin: fakeAuthPlugin,
            withDocs: false,
            usersRepository: new InMemoryUsersRepository(),
            professionalsRepository: new InMemoryProfessionalsRepository(),
            hasUserAccessToUnitChecker: createInMemoryHasUserAccessToUnitChecker(requesterUnits),
        });

        const response = await app.handle(
            new Request("http://localhost/professionals", {
                headers: { "x-user-id": requesterUserId },
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body).toMatchObject({ message: "Invalid or missing unit header" });
    });

    it("GET /professionals deve retornar 403 quando usuário não pertence à unidade", async () => {
        const app = await buildApp({
            db: unusedDb,
            authPlugin: fakeAuthPlugin,
            withDocs: false,
            usersRepository: new InMemoryUsersRepository(),
            professionalsRepository: new InMemoryProfessionalsRepository(),
            hasUserAccessToUnitChecker: createInMemoryHasUserAccessToUnitChecker({}),
        });

        const response = await app.handle(
            new Request("http://localhost/professionals", {
                headers: {
                    "x-user-id": requesterUserId,
                    "x-unit-id": selectedUnitId,
                },
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body).toMatchObject({ message: "Forbidden" });
    });

    it("POST /professionals deve retornar 403 quando usuário não pertence à unidade", async () => {
        const app = await buildApp({
            db: unusedDb,
            authPlugin: fakeAuthPlugin,
            withDocs: false,
            usersRepository: new InMemoryUsersRepository(),
            professionalsRepository: new InMemoryProfessionalsRepository(),
            hasUserAccessToUnitChecker: createInMemoryHasUserAccessToUnitChecker({}),
        });

        const response = await app.handle(
            new Request("http://localhost/professionals", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-user-id": requesterUserId,
                    "x-unit-id": selectedUnitId,
                },
                body: JSON.stringify({
                    isActive: true,
                }),
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body).toMatchObject({ message: "Forbidden" });
    });

    it("PATCH /professionals/:id deve retornar 404 quando profissional for de outra unidade", async () => {
        const existingProfessionalId = "019c1a3e-e425-7000-8bda-cdfec32c8fa1";

        const app = await buildApp({
            db: unusedDb,
            authPlugin: fakeAuthPlugin,
            withDocs: false,
            usersRepository: new InMemoryUsersRepository(),
            professionalsRepository: new InMemoryProfessionalsRepository(
                {
                    [existingProfessionalId]: {
                        id: existingProfessionalId,
                        userId: "019c1a3e-e425-7000-8bda-cdfec32c8fb1",
                        isActive: true,
                        createdAt: "2026-02-01T17:27:35.202Z",
                        updatedAt: "2026-02-01T17:27:35.202Z",
                    },
                },
                {
                    [existingProfessionalId]: ["019c1a3e-e425-7000-8bda-cdfec32c8fc2"],
                },
            ),
            hasUserAccessToUnitChecker: createInMemoryHasUserAccessToUnitChecker(requesterUnits),
        });

        const response = await app.handle(
            new Request(`http://localhost/professionals/${existingProfessionalId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "x-user-id": requesterUserId,
                    "x-unit-id": selectedUnitId,
                },
                body: JSON.stringify({
                    isActive: false,
                }),
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(404);
        expect(body).toMatchObject({ message: "Professional not found" });
    });

    it("DELETE /professionals/:id deve retornar 404 quando profissional for de outra unidade", async () => {
        const existingProfessionalId = "019c1a3e-e425-7000-8bda-cdfec32c8fa1";

        const app = await buildApp({
            db: unusedDb,
            authPlugin: fakeAuthPlugin,
            withDocs: false,
            usersRepository: new InMemoryUsersRepository(),
            professionalsRepository: new InMemoryProfessionalsRepository(
                {
                    [existingProfessionalId]: {
                        id: existingProfessionalId,
                        userId: "019c1a3e-e425-7000-8bda-cdfec32c8fb1",
                        isActive: true,
                        createdAt: "2026-02-01T17:27:35.202Z",
                        updatedAt: "2026-02-01T17:27:35.202Z",
                    },
                },
                {
                    [existingProfessionalId]: ["019c1a3e-e425-7000-8bda-cdfec32c8fc2"],
                },
            ),
            hasUserAccessToUnitChecker: createInMemoryHasUserAccessToUnitChecker(requesterUnits),
        });

        const response = await app.handle(
            new Request(`http://localhost/professionals/${existingProfessionalId}`, {
                method: "DELETE",
                headers: {
                    "x-user-id": requesterUserId,
                    "x-unit-id": selectedUnitId,
                },
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(404);
        expect(body).toMatchObject({ message: "Professional not found" });
    });
});
