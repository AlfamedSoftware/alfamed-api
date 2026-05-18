import { describe, expect, it } from "vitest";
import { ProfessionalsService } from "../../src/modules/professionals/professionals.service";
import type {
    CreateProfessionalInput,
    ProfessionalProfile,
    ProfessionalsRepository,
    UpdateProfessionalInput,
} from "../../src/modules/professionals/professionals.repository";
import { DomainError } from "../../src/http/plugins/domain-error";

class InMemoryProfessionalsRepository implements ProfessionalsRepository {
    constructor(
        private readonly professionals: Record<string, ProfessionalProfile> = {},
        private readonly professionalsByUnit: Record<string, string[]> = {},
    ) { }

    async create(data: CreateProfessionalInput): Promise<ProfessionalProfile> {
        const professional: ProfessionalProfile = {
            id: "prof-1",
            userId: data.userId,
            name: data.name,
            email: data.email,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        this.professionals["prof-1"] = professional;
        return professional;
    }

    async createWithUnit(data: CreateProfessionalInput, unitId: string): Promise<ProfessionalProfile> {
        const professional: ProfessionalProfile = {
            id: "prof-unit-1",
            userId: data.userId,
            name: data.name,
            email: data.email,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        this.professionals["prof-unit-1"] = professional;
        if (!this.professionalsByUnit[unitId]) {
            this.professionalsByUnit[unitId] = [];
        }
        this.professionalsByUnit[unitId].push("prof-unit-1");
        return professional;
    }

    async findById(professionalId: string): Promise<ProfessionalProfile | null> {
        return this.professionals[professionalId] ?? null;
    }

    async findDetailById(professionalId: string): Promise<any | null> {
        const professional = this.professionals[professionalId];
        if (!professional) return null;

        return {
            ...professional,
            cpf: undefined,
            birthdate: undefined,
            unit: null,
            users: [
                {
                    id: professional.userId,
                    name: professional.name,
                    email: professional.email,
                    phone: undefined,
                    cpf: undefined,
                    birthdate: undefined,
                },
            ],
        };
    }

    async findByIdAndUnit(professionalId: string, unitId: string): Promise<ProfessionalProfile | null> {
        const professional = this.professionals[professionalId];
        if (!professional) return null;
        const unitsProfs = this.professionalsByUnit[unitId] ?? [];
        return unitsProfs.includes(professionalId) ? professional : null;
    }

    async findDetailById(professionalId: string): Promise<any | null> {
        const professional = this.professionals[professionalId];

        if (!professional) return null;

        return {
            ...professional,
            users: [
                {
                    id: professional.userId,
                    name: professional.name ?? "Mock User",
                    email: professional.email ?? "mock@example.com",
                },
            ],
        };
    }

    async list(): Promise<ProfessionalProfile[]> {
        return Object.values(this.professionals);
    }

    async listByUnit(unitId: string): Promise<ProfessionalProfile[]> {
        const unitsProfs = this.professionalsByUnit[unitId] ?? [];
        return unitsProfs.map((id) => this.professionals[id]!);
    }

    async update(professionalId: string, data: UpdateProfessionalInput): Promise<ProfessionalProfile | null> {
        const professional = this.professionals[professionalId];
        if (!professional) return null;

        const updated: ProfessionalProfile = {
            ...professional,
            ...data,
            updatedAt: new Date().toISOString(),
        };
        this.professionals[professionalId] = updated;
        return updated;
    }

    async delete(professionalId: string): Promise<void> {
        delete this.professionals[professionalId];
        Object.keys(this.professionalsByUnit).forEach((unitId) => {
            this.professionalsByUnit[unitId] = this.professionalsByUnit[unitId]!.filter(
                (id) => id !== professionalId,
            );
        });
    }

    async listUnitIdsByUserId(userId: string): Promise<string[]> {
        return Object.entries(this.professionalsByUnit)
            .filter(([, profIds]) => profIds.some((id) => this.professionals[id]?.userId === userId))
            .map(([unitId]) => unitId);
    }

    async listActiveRolesByProfessionalUnit(
        userId: string,
        unitId: string,
        professionalUnitId: string,
    ): Promise<any[]> {
        return [];
    }
}

describe("ProfessionalsService", () => {
    const hasUserAccessToUnitChecker = async (userId: string, unitId: string) => {
        return userId === "user-1" && unitId === "unit-1";
    };

    it("deve criar um profissional com acesso à unidade", async () => {
        const repository = new InMemoryProfessionalsRepository();
        const service = new ProfessionalsService(repository, hasUserAccessToUnitChecker);

        const result = await service.createProfessional("user-1", "unit-1", {
            userId: "user-2",
            name: "Dr. João",
            email: "joao@alfamed.com",
        });

        expect(result.name).toBe("Dr. João");
        expect(result.email).toBe("joao@alfamed.com");
    });

    it("deve lançar erro ao criar profissional sem acesso à unidade", async () => {
        const repository = new InMemoryProfessionalsRepository();
        const service = new ProfessionalsService(repository, hasUserAccessToUnitChecker);

        await expect(
            service.createProfessional("user-2", "unit-2", {
                userId: "user-3",
                name: "Dr. Maria",
                email: "maria@alfamed.com",
            }),
        ).rejects.toThrow();
    });

    it("deve buscar profissional por id e unidade", async () => {
        const professionalsByUnit = { "unit-1": ["prof-unit-1"] };
        const professionals = {
            "prof-unit-1": {
                id: "prof-unit-1",
                userId: "user-2",
                name: "Dr. João",
                email: "joao@alfamed.com",
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
        };
        const repository = new InMemoryProfessionalsRepository(professionals, professionalsByUnit);
        const service = new ProfessionalsService(repository, hasUserAccessToUnitChecker);

        const result = await service.getProfessionalById("user-1", "prof-unit-1", "unit-1");

        expect(result.id).toBe("prof-unit-1");
        expect(result.name).toBe("Dr. João");
    });

    it("deve lançar erro ao buscar profissional inexistente", async () => {
        const repository = new InMemoryProfessionalsRepository();
        const service = new ProfessionalsService(repository, hasUserAccessToUnitChecker);

        await expect(service.getProfessionalById("user-1", "missing", "unit-1")).rejects.toThrow(
            DomainError,
        );
    });

    it("deve listar profissionais da unidade", async () => {
        const professionalsByUnit = { "unit-1": ["prof-unit-1"] };
        const professionals = {
            "prof-unit-1": {
                id: "prof-unit-1",
                userId: "user-2",
                name: "Dr. João",
                email: "joao@alfamed.com",
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
        };
        const repository = new InMemoryProfessionalsRepository(professionals, professionalsByUnit);
        const service = new ProfessionalsService(repository, hasUserAccessToUnitChecker);

        const result = await service.listProfessionals("user-1", "unit-1");

        expect(result).toHaveLength(1);
        expect(result[0]!.name).toBe("Dr. João");
    });

    it("deve atualizar um profissional", async () => {
        const professionalsByUnit = { "unit-1": ["prof-unit-1"] };
        const professionals = {
            "prof-unit-1": {
                id: "prof-unit-1",
                userId: "user-2",
                name: "Dr. João",
                email: "joao@alfamed.com",
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
        };
        const repository = new InMemoryProfessionalsRepository(professionals, professionalsByUnit);
        const service = new ProfessionalsService(repository, hasUserAccessToUnitChecker);

        const result = await service.updateProfessional("user-1", "prof-unit-1", "unit-1", {
            name: "Dr. João Silva",
        });

        expect(result.name).toBe("Dr. João Silva");
    });

    it("deve lançar erro ao atualizar profissional inexistente", async () => {
        const repository = new InMemoryProfessionalsRepository();
        const service = new ProfessionalsService(repository, hasUserAccessToUnitChecker);

        await expect(
            service.updateProfessional("user-1", "missing", "unit-1", { name: "Dr. Test" }),
        ).rejects.toThrow(DomainError);
    });

});
