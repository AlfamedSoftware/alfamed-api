import Elysia from "elysia";
import { describe, expect, it } from "vitest";
import type { SpecialtiesRepository } from "../../src/modules/specialties/specialties.repository";
import { specialtiesRoutes } from "../../src/modules/specialties/specialties.routes";
import { specialtySchema, specialtiesListSchema } from "../../src/modules/specialties/specialties.schemas";

const TEST_IDS = {
    user: "019c1a3e-e425-7000-8bda-cdfec32c8fed",
    unit: "019c1a3e-e425-7000-8bda-cdfec32c8fc1",
    otherUnit: "019c1a3e-e425-7000-8bda-cdfec32c8fc2",
    specialty: "019c1a3e-e425-7000-8bda-cdfec32c8ba1",
    missingSpecialty: "019c1a3e-e425-7000-8bda-cdfec32c8ba9",
} as const;

const createSelectedUnitCookie = (unitId: string) =>
    `${"selectedUnitId"}=${encodeURIComponent(unitId)}`;

type SpecialtyProfile = {
    id: string;
    unitId: string;
    name: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
};

class InMemorySpecialtiesRepository {
    private readonly specialties = new Map<string, SpecialtyProfile>();
    private sequence = 2;

    constructor(initial: SpecialtyProfile[] = []) {
        for (const specialty of initial) {
            this.specialties.set(specialty.id, specialty);
        }
    }

    async findByNameAndUnitId(
        name: string,
        unitId: string,
        excludeSpecialtyId?: string,
    ): Promise<SpecialtyProfile | null> {
        for (const specialty of this.specialties.values()) {
            if (
                specialty.name === name
                && specialty.unitId === unitId
                && (!excludeSpecialtyId || specialty.id !== excludeSpecialtyId)
            ) {
                return specialty;
            }
        }

        return null;
    }

    async findByIdAndUnitId(specialtyId: string, unitId: string): Promise<SpecialtyProfile | null> {
        const specialty = this.specialties.get(specialtyId);

        if (!specialty || specialty.unitId !== unitId) {
            return null;
        }

        return specialty;
    }

    async listByUnitId(unitId: string): Promise<SpecialtyProfile[]> {
        return [...this.specialties.values()]
            .filter((specialty) => specialty.unitId === unitId)
            .sort((left, right) => left.name.localeCompare(right.name));
    }

    async createForUnit(unitId: string, data: {
        name: string;
        isActive?: boolean;
    }): Promise<SpecialtyProfile> {
        const now = new Date().toISOString();
        const id = `019c1a3e-e425-7000-8bda-cdfec32c8bb${String(this.sequence).padStart(1, "0")}`;
        this.sequence += 1;

        const created: SpecialtyProfile = {
            id,
            unitId,
            name: data.name,
            isActive: data.isActive ?? true,
            createdAt: now,
            updatedAt: now,
        };

        this.specialties.set(id, created);

        return created;
    }

    async updateByIdAndUnitId(
        specialtyId: string,
        unitId: string,
        data: {
            name?: string;
            isActive?: boolean;
        },
    ): Promise<SpecialtyProfile | null> {
        const specialty = this.specialties.get(specialtyId);

        if (!specialty || specialty.unitId !== unitId) {
            return null;
        }

        const updated: SpecialtyProfile = {
            ...specialty,
            ...(typeof data.name !== "undefined" ? { name: data.name } : {}),
            ...(typeof data.isActive !== "undefined" ? { isActive: data.isActive } : {}),
            updatedAt: new Date().toISOString(),
        };

        this.specialties.set(specialtyId, updated);

        return updated;
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

const buildSpecialtiesApp = (repository: InMemorySpecialtiesRepository) =>
    new Elysia()
        .use(fakeAuthPlugin)
        .use(
            specialtiesRoutes({
                specialtiesRepository: repository as unknown as SpecialtiesRepository,
                hasUserAccessToUnitChecker: async (userId: string, unitId: string) =>
                    userId === TEST_IDS.user && unitId === TEST_IDS.unit,
            }),
        );

const initialSpecialty: SpecialtyProfile = {
    id: TEST_IDS.specialty,
    unitId: TEST_IDS.unit,
    name: "Consulta inicial",
    isActive: true,
    createdAt: "2026-02-01T17:27:35.202Z",
    updatedAt: "2026-02-01T17:27:35.202Z",
};

describe("Specialties routes", () => {
    it("POST /specialties deve criar especialidade", async () => {
        const app = buildSpecialtiesApp(new InMemorySpecialtiesRepository([initialSpecialty]));

        const response = await app.handle(new Request("http://localhost/specialties", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-user-id": TEST_IDS.user,
                cookie: createSelectedUnitCookie(TEST_IDS.unit),
            },
            body: JSON.stringify({
                name: "Retorno",
                isActive: true,
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(201);
        expect(() => specialtySchema.parse(body)).not.toThrow();
        expect(body).toMatchObject({
            unitId: TEST_IDS.unit,
            name: "Retorno",
        });
    });

    it("POST /specialties deve retornar 409 para name duplicado na unidade", async () => {
        const app = buildSpecialtiesApp(new InMemorySpecialtiesRepository([initialSpecialty]));

        const response = await app.handle(new Request("http://localhost/specialties", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-user-id": TEST_IDS.user,
                cookie: createSelectedUnitCookie(TEST_IDS.unit),
            },
            body: JSON.stringify({
                name: "Consulta inicial",
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(409);
        expect(body).toMatchObject({ message: "Specialty name already exists" });
    });

    it("GET /specialties/list-specialties-by-unit/:unitId deve retornar lista", async () => {
        const app = buildSpecialtiesApp(new InMemorySpecialtiesRepository([initialSpecialty]));

        const response = await app.handle(new Request(
            `http://localhost/specialties/list-specialties-by-unit/${TEST_IDS.unit}`,
            {
                headers: {
                    "x-user-id": TEST_IDS.user,
                    cookie: createSelectedUnitCookie(TEST_IDS.unit),
                },
            },
        ));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(() => specialtiesListSchema.parse(body)).not.toThrow();
        expect(body).toHaveLength(1);
        expect(body[0]).toMatchObject({ id: TEST_IDS.specialty });
    });

    it("GET /specialties/:specialtyId deve retornar 404 quando não existir", async () => {
        const app = buildSpecialtiesApp(new InMemorySpecialtiesRepository([initialSpecialty]));

        const response = await app.handle(new Request(
            `http://localhost/specialties/${TEST_IDS.missingSpecialty}`,
            {
                headers: {
                    "x-user-id": TEST_IDS.user,
                    cookie: createSelectedUnitCookie(TEST_IDS.unit),
                },
            },
        ));
        const body = await response.json();

        expect(response.status).toBe(404);
        expect(body).toMatchObject({ message: "Specialty not found" });
    });

    it("PATCH /specialties deve atualizar com specialtyId no body", async () => {
        const app = buildSpecialtiesApp(new InMemorySpecialtiesRepository([initialSpecialty]));

        const response = await app.handle(new Request("http://localhost/specialties", {
            method: "PATCH",
            headers: {
                "content-type": "application/json",
                "x-user-id": TEST_IDS.user,
                cookie: createSelectedUnitCookie(TEST_IDS.unit),
            },
            body: JSON.stringify({
                specialtyId: TEST_IDS.specialty,
                name: "Consulta revisada",
                isActive: false,
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(() => specialtySchema.parse(body)).not.toThrow();
        expect(body).toMatchObject({
            id: TEST_IDS.specialty,
            name: "Consulta revisada",
            isActive: false,
        });
    });

    it("PATCH /specialties deve retornar 400 sem selectedUnitId", async () => {
        const app = buildSpecialtiesApp(new InMemorySpecialtiesRepository([initialSpecialty]));

        const response = await app.handle(new Request("http://localhost/specialties", {
            method: "PATCH",
            headers: {
                "content-type": "application/json",
                "x-user-id": TEST_IDS.user,
            },
            body: JSON.stringify({
                specialtyId: TEST_IDS.specialty,
                name: "Consulta revisada",
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body).toMatchObject({ message: "Selecione uma unidade para continuar" });
    });

    it("GET /specialties/list-specialties-by-unit/:unitId deve retornar 403 sem acesso", async () => {
        const app = buildSpecialtiesApp(new InMemorySpecialtiesRepository([initialSpecialty]));

        const response = await app.handle(new Request(
            `http://localhost/specialties/list-specialties-by-unit/${TEST_IDS.otherUnit}`,
            {
                headers: {
                    "x-user-id": TEST_IDS.user,
                    cookie: createSelectedUnitCookie(TEST_IDS.unit),
                },
            },
        ));
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body).toMatchObject({ message: "Forbidden" });
    });
});