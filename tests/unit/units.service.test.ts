import { describe, expect, it } from "vitest";
import { UnitsService } from "../../src/modules/units/units.service";
import type {
    CreateUnitInput,
    UnitProfile,
    UnitsRepository,
    UpdateUnitInput,
} from "../../src/modules/units/units.repository";
import { DomainError } from "../../src/http/plugins/domain-error";

class InMemoryUnitsRepository implements UnitsRepository {
    constructor(
        private readonly units: Record<string, UnitProfile> = {},
        private readonly unitsByUser: Record<string, string[]> = {},
    ) {}

    async create(data: CreateUnitInput): Promise<UnitProfile> {
        const unit: UnitProfile = {
            id: "unit-1",
            name: data.name,
            cnpj: data.cnpj ?? null,
            address: data.address ?? null,
            city: data.city ?? null,
            state: data.state ?? null,
            phone: data.phone ?? null,
            email: data.email ?? null,
            ownerUserId: null,
            isActive: data.isActive ?? true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        this.units["unit-1"] = unit;
        return unit;
    }

    async createForUser(userId: string, data: CreateUnitInput): Promise<UnitProfile> {
        const unit: UnitProfile = {
            id: "unit-user-1",
            name: data.name,
            cnpj: data.cnpj ?? null,
            address: data.address ?? null,
            city: data.city ?? null,
            state: data.state ?? null,
            phone: data.phone ?? null,
            email: data.email ?? null,
            ownerUserId: userId,
            isActive: data.isActive ?? true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        this.units["unit-user-1"] = unit;
        if (!this.unitsByUser[userId]) {
            this.unitsByUser[userId] = [];
        }
        this.unitsByUser[userId]!.push("unit-user-1");
        return unit;
    }

    async findById(unitId: string): Promise<UnitProfile | null> {
        return this.units[unitId] ?? null;
    }

    async listByUserId(userId: string): Promise<UnitProfile[]> {
        const userUnits = this.unitsByUser[userId] ?? [];
        return userUnits.map((id) => this.units[id]!);
    }

    async update(unitId: string, data: UpdateUnitInput): Promise<UnitProfile | null> {
        const unit = this.units[unitId];
        if (!unit) return null;

        const updated: UnitProfile = {
            ...unit,
            ...data,
            updatedAt: new Date().toISOString(),
        };
        this.units[unitId] = updated;
        return updated;
    }

    async delete(unitId: string): Promise<void> {
        delete this.units[unitId];
        Object.keys(this.unitsByUser).forEach((userId) => {
            this.unitsByUser[userId] = this.unitsByUser[userId]!.filter((id) => id !== unitId);
        });
    }
}

describe("UnitsService", () => {
    const hasUserAccessToUnitChecker = async (userId: string, unitId: string) => {
        return userId === "user-1" && unitId === "unit-user-1";
    };

    it("deve criar uma unidade para o usuário", async () => {
        const repository = new InMemoryUnitsRepository();
        const service = new UnitsService(repository, hasUserAccessToUnitChecker);

        const result = await service.createUnit("user-1", {
            name: "Clínica Central",
            isActive: true,
        });

        expect(result.name).toBe("Clínica Central");
        expect(result.isActive).toBe(true);
    });

    it("deve buscar uma unidade por id", async () => {
        const units = {
            "unit-user-1": {
                id: "unit-user-1",
                name: "Clínica Central",
                cnpj: "12.345.678/0001-90",
                address: "Rua A, 123",
                city: "São Paulo",
                state: "SP",
                phone: "11987654321",
                email: "clinica@alfamed.com",
                ownerUserId: "user-1",
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
        };
        const unitsByUser = { "user-1": ["unit-user-1"] };
        const repository = new InMemoryUnitsRepository(units, unitsByUser);
        const service = new UnitsService(repository, hasUserAccessToUnitChecker);

        const result = await service.getUnitById("user-1", "unit-user-1");

        expect(result.id).toBe("unit-user-1");
        expect(result.name).toBe("Clínica Central");
    });

    it("deve lançar erro ao buscar unidade inexistente", async () => {
        const repository = new InMemoryUnitsRepository();
        const service = new UnitsService(repository, hasUserAccessToUnitChecker);

        await expect(service.getUnitById("user-1", "missing")).rejects.toThrow(DomainError);
    });

    it("deve lançar erro ao buscar unidade sem acesso", async () => {
        const units = {
            "unit-user-1": {
                id: "unit-user-1",
                name: "Clínica Central",
                cnpj: null,
                address: null,
                city: null,
                state: null,
                phone: null,
                email: null,
                ownerUserId: "user-1",
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
        };
        const repository = new InMemoryUnitsRepository(units);
        const service = new UnitsService(repository, hasUserAccessToUnitChecker);

        await expect(service.getUnitById("user-2", "unit-user-1")).rejects.toThrow();
    });

    it("deve listar unidades do usuário", async () => {
        const units = {
            "unit-user-1": {
                id: "unit-user-1",
                name: "Clínica Central",
                cnpj: null,
                address: null,
                city: null,
                state: null,
                phone: null,
                email: null,
                ownerUserId: "user-1",
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
        };
        const unitsByUser = { "user-1": ["unit-user-1"] };
        const repository = new InMemoryUnitsRepository(units, unitsByUser);
        const service = new UnitsService(repository, hasUserAccessToUnitChecker);

        const result = await service.listUnitsByUserId("user-1");

        expect(result).toHaveLength(1);
        expect(result[0]!.name).toBe("Clínica Central");
    });

    it("deve atualizar uma unidade", async () => {
        const units = {
            "unit-user-1": {
                id: "unit-user-1",
                name: "Clínica Central",
                cnpj: null,
                address: null,
                city: null,
                state: null,
                phone: null,
                email: null,
                ownerUserId: "user-1",
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
        };
        const unitsByUser = { "user-1": ["unit-user-1"] };
        const repository = new InMemoryUnitsRepository(units, unitsByUser);
        const service = new UnitsService(repository, hasUserAccessToUnitChecker);

        const result = await service.updateUnit("user-1", "unit-user-1", {
            name: "Clínica Centro",
        });

        expect(result.name).toBe("Clínica Centro");
    });

    it("deve lançar erro ao atualizar unidade inexistente", async () => {
        const repository = new InMemoryUnitsRepository();
        const service = new UnitsService(repository, hasUserAccessToUnitChecker);

        await expect(service.updateUnit("user-1", "missing", { name: "Test" })).rejects.toThrow(
            DomainError,
        );
    });

});
