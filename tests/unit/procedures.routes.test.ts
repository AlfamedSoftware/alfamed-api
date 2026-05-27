import Elysia from "elysia";
import { describe, expect, it } from "vitest";
import type { ProceduresRepository } from "../../src/modules/procedures/procedures.repository";
import { proceduresRoutes } from "../../src/modules/procedures/procedures.routes";
import { procedureSchema, proceduresListSchema } from "../../src/modules/procedures/procedures.schemas";

const TEST_IDS = {
    user: "019c1a3e-e425-7000-8bda-cdfec32c8fed",
    unit: "019c1a3e-e425-7000-8bda-cdfec32c8fc1",
    otherUnit: "019c1a3e-e425-7000-8bda-cdfec32c8fc2",
    procedure: "019c1a3e-e425-7000-8bda-cdfec32c8aa1",
    missingProcedure: "019c1a3e-e425-7000-8bda-cdfec32c8aa9",
} as const;

const createSelectedUnitCookie = (unitId: string) =>
    `${"selectedUnitId"}=${encodeURIComponent(unitId)}`;

type ProcedureProfile = {
    id: string;
    unitId: string;
    description: string;
    observation: string | null;
    code: string;
    price: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
};

class InMemoryProceduresRepository {
    private readonly procedures = new Map<string, ProcedureProfile>();
    private sequence = 2;

    constructor(initial: ProcedureProfile[] = []) {
        for (const procedure of initial) {
            this.procedures.set(procedure.id, procedure);
        }
    }

    async findByCodeAndUnitId(
        code: string,
        unitId: string,
        excludeProcedureId?: string,
    ): Promise<ProcedureProfile | null> {
        for (const procedure of this.procedures.values()) {
            if (
                procedure.code === code
                && procedure.unitId === unitId
                && (!excludeProcedureId || procedure.id !== excludeProcedureId)
            ) {
                return procedure;
            }
        }

        return null;
    }

    async findByIdAndUnitId(procedureId: string, unitId: string): Promise<ProcedureProfile | null> {
        const procedure = this.procedures.get(procedureId);

        if (!procedure || procedure.unitId !== unitId) {
            return null;
        }

        return procedure;
    }

    async listByUnitId(unitId: string): Promise<ProcedureProfile[]> {
        return [...this.procedures.values()]
            .filter((procedure) => procedure.unitId === unitId)
            .sort((left, right) => left.description.localeCompare(right.description));
    }

    async createForUnit(unitId: string, data: {
        description: string;
        observation?: string | null;
        code: string;
        price: string;
        isActive?: boolean;
    }): Promise<ProcedureProfile> {
        const now = new Date().toISOString();
        const id = `019c1a3e-e425-7000-8bda-cdfec32c8ab${String(this.sequence).padStart(1, "0")}`;
        this.sequence += 1;

        const created: ProcedureProfile = {
            id,
            unitId,
            description: data.description,
            observation: data.observation ?? null,
            code: data.code,
            price: data.price,
            isActive: data.isActive ?? true,
            createdAt: now,
            updatedAt: now,
        };

        this.procedures.set(id, created);

        return created;
    }

    async updateByIdAndUnitId(
        procedureId: string,
        unitId: string,
        data: {
            description?: string;
            observation?: string | null;
            code?: string;
            price?: string;
            isActive?: boolean;
        },
    ): Promise<ProcedureProfile | null> {
        const procedure = this.procedures.get(procedureId);

        if (!procedure || procedure.unitId !== unitId) {
            return null;
        }

        const updated: ProcedureProfile = {
            ...procedure,
            ...(typeof data.description !== "undefined" ? { description: data.description } : {}),
            ...(typeof data.observation !== "undefined" ? { observation: data.observation } : {}),
            ...(typeof data.code !== "undefined" ? { code: data.code } : {}),
            ...(typeof data.price !== "undefined" ? { price: data.price } : {}),
            ...(typeof data.isActive !== "undefined" ? { isActive: data.isActive } : {}),
            updatedAt: new Date().toISOString(),
        };

        this.procedures.set(procedureId, updated);

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

const buildProceduresApp = (repository: InMemoryProceduresRepository) =>
    new Elysia()
        .use(fakeAuthPlugin)
        .use(
            proceduresRoutes({
                proceduresRepository: repository as unknown as ProceduresRepository,
                hasUserAccessToUnitChecker: async (userId: string, unitId: string) =>
                    userId === TEST_IDS.user && unitId === TEST_IDS.unit,
            }),
        );

const initialProcedure: ProcedureProfile = {
    id: TEST_IDS.procedure,
    unitId: TEST_IDS.unit,
    description: "Consulta inicial",
    observation: "Atendimento padrão",
    code: "PROC-001",
    price: "120.00",
    isActive: true,
    createdAt: "2026-02-01T17:27:35.202Z",
    updatedAt: "2026-02-01T17:27:35.202Z",
};

describe("Procedures routes", () => {
    it("POST /procedures deve criar procedimento", async () => {
        const app = buildProceduresApp(new InMemoryProceduresRepository([initialProcedure]));

        const response = await app.handle(new Request("http://localhost/procedures", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-user-id": TEST_IDS.user,
                cookie: createSelectedUnitCookie(TEST_IDS.unit),
            },
            body: JSON.stringify({
                description: "Retorno",
                observation: "Até 30 dias",
                code: "PROC-002",
                price: "60,00",
                isActive: true,
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(201);
        expect(() => procedureSchema.parse(body)).not.toThrow();
        expect(body).toMatchObject({
            unitId: TEST_IDS.unit,
            description: "Retorno",
            code: "PROC-002",
            price: "60.00",
        });
    });

    it("POST /procedures deve retornar 409 para code duplicado na unidade", async () => {
        const app = buildProceduresApp(new InMemoryProceduresRepository([initialProcedure]));

        const response = await app.handle(new Request("http://localhost/procedures", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-user-id": TEST_IDS.user,
                cookie: createSelectedUnitCookie(TEST_IDS.unit),
            },
            body: JSON.stringify({
                description: "Outro",
                code: "PROC-001",
                price: "90.00",
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(409);
        expect(body).toMatchObject({ message: "Procedure code already exists" });
    });

    it("GET /procedures/list-procedures-by-unit/:unitId deve retornar lista", async () => {
        const app = buildProceduresApp(new InMemoryProceduresRepository([initialProcedure]));

        const response = await app.handle(new Request(
            `http://localhost/procedures/list-procedures-by-unit/${TEST_IDS.unit}`,
            {
                headers: {
                    "x-user-id": TEST_IDS.user,
                    cookie: createSelectedUnitCookie(TEST_IDS.unit),
                },
            },
        ));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(() => proceduresListSchema.parse(body)).not.toThrow();
        expect(body).toHaveLength(1);
        expect(body[0]).toMatchObject({ id: TEST_IDS.procedure });
    });

    it("GET /procedures/:procedureId deve retornar 404 quando não existir", async () => {
        const app = buildProceduresApp(new InMemoryProceduresRepository([initialProcedure]));

        const response = await app.handle(new Request(
            `http://localhost/procedures/${TEST_IDS.missingProcedure}`,
            {
                headers: {
                    "x-user-id": TEST_IDS.user,
                    cookie: createSelectedUnitCookie(TEST_IDS.unit),
                },
            },
        ));
        const body = await response.json();

        expect(response.status).toBe(404);
        expect(body).toMatchObject({ message: "Procedure not found" });
    });

    it("PATCH /procedures deve atualizar com procedureId no body", async () => {
        const app = buildProceduresApp(new InMemoryProceduresRepository([initialProcedure]));

        const response = await app.handle(new Request("http://localhost/procedures", {
            method: "PATCH",
            headers: {
                "content-type": "application/json",
                "x-user-id": TEST_IDS.user,
                cookie: createSelectedUnitCookie(TEST_IDS.unit),
            },
            body: JSON.stringify({
                procedureId: TEST_IDS.procedure,
                description: "Consulta revisada",
                code: "PROC-099",
                price: "75,50",
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(() => procedureSchema.parse(body)).not.toThrow();
        expect(body).toMatchObject({
            id: TEST_IDS.procedure,
            description: "Consulta revisada",
            code: "PROC-099",
            price: "75.50",
        });
    });

    it("PATCH /procedures deve retornar 400 sem selectedUnitId", async () => {
        const app = buildProceduresApp(new InMemoryProceduresRepository([initialProcedure]));

        const response = await app.handle(new Request("http://localhost/procedures", {
            method: "PATCH",
            headers: {
                "content-type": "application/json",
                "x-user-id": TEST_IDS.user,
            },
            body: JSON.stringify({
                procedureId: TEST_IDS.procedure,
                description: "Consulta revisada",
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body).toMatchObject({ message: "Selecione uma unidade para continuar" });
    });

    it("GET /procedures/list-procedures-by-unit/:unitId deve retornar 403 sem acesso", async () => {
        const app = buildProceduresApp(new InMemoryProceduresRepository([initialProcedure]));

        const response = await app.handle(new Request(
            `http://localhost/procedures/list-procedures-by-unit/${TEST_IDS.otherUnit}`,
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