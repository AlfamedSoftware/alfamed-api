import { describe, expect, it } from "vitest";
import { DomainError } from "../../src/http/plugins/domain-error";
import { SpecialtiesService } from "../../src/modules/specialties/specialties.service";
import type {
    CreateSpecialtyInput,
    SpecialtiesRepository,
    SpecialtyProfile,
    UpdateSpecialtyInput,
} from "../../src/modules/specialties/specialties.repository";

class InMemorySpecialtiesRepository implements SpecialtiesRepository {
    constructor(
        private readonly specialties: Record<string, SpecialtyProfile> = {},
        private readonly professionalsByUnit: Record<string, string[]> = {},
    ) {}

    async create(data: CreateSpecialtyInput): Promise<SpecialtyProfile> {
        const now = new Date().toISOString();
        return {
            id: "019c1a3e-e425-7000-8bda-cdfec32e9fa1",
            name: data.name,
            isActive: data.isActive ?? true,
            createdAt: now,
            updatedAt: now,
        };
    }

    async findById(specialtyId: string): Promise<SpecialtyProfile | null> {
        return this.specialties[specialtyId] ?? null;
    }

    async list(): Promise<SpecialtyProfile[]> {
        return Object.values(this.specialties);
    }

    async update(specialtyId: string, data: UpdateSpecialtyInput): Promise<SpecialtyProfile | null> {
        const current = this.specialties[specialtyId];
        if (!current) return null;
        return {
            ...current,
            name: data.name ?? current.name,
            isActive: data.isActive ?? current.isActive,
            updatedAt: new Date().toISOString(),
        };
    }

    async delete(): Promise<void> {}

    async findProfessionalByIdAndUnit(professionalId: string, unitId: string): Promise<{ id: string } | null> {
        return (this.professionalsByUnit[unitId] ?? []).includes(professionalId)
            ? { id: professionalId }
            : null;
    }

    async linkProfessionalSpecialty(): Promise<void> {}

    async unlinkProfessionalSpecialty(): Promise<boolean> {
        return true;
    }

    async listByProfessionalAndUnit(): Promise<SpecialtyProfile[]> {
        return Object.values(this.specialties);
    }
}

describe("SpecialtiesService", () => {
    it("deve retornar especialidade por id", async () => {
        const specialtyId = "019c1a3e-e425-7000-8bda-cdfec32e9fa9";
        const repository = new InMemorySpecialtiesRepository({
            [specialtyId]: {
                id: specialtyId,
                name: "Cardiologia",
                isActive: true,
                createdAt: "2026-02-01T17:27:35.202Z",
                updatedAt: "2026-02-01T17:27:35.202Z",
            },
        });
        const service = new SpecialtiesService(repository, async () => true);

        const result = await service.getSpecialtyById("user-1", "unit-1", specialtyId);

        expect(result.id).toBe(specialtyId);
        expect(result.name).toBe("Cardiologia");
    });

    it("deve lançar erro quando especialidade não existe", async () => {
        const repository = new InMemorySpecialtiesRepository();
        const service = new SpecialtiesService(repository, async () => true);

        await expect(service.getSpecialtyById("user-1", "unit-1", "019c1a3e-e425-7000-8bda-cdfec32e9fff")).rejects.toEqual(
            new DomainError("SPECIALTY_NOT_FOUND", "Specialty not found"),
        );
    });
});
