import { assertUserHasUnitAccess } from "../../http/plugins/unit-access.js";
import { DomainError } from "../../http/plugins/domain-error.js";
import type { SpecialtiesRepository } from "./specialties.repository.js";

export class SpecialtiesService {
    constructor(
        private readonly specialtiesRepository: SpecialtiesRepository,
        private readonly hasUserAccessToUnitChecker: (userId: string, unitId: string) => Promise<boolean>,
    ) {}

    async listSpecialtiesByUnit(userId: string, unitId: string) {
        await assertUserHasUnitAccess(userId, unitId, this.hasUserAccessToUnitChecker);

        return this.specialtiesRepository.listByUnitId(unitId);
    }

    async getSpecialtyById(userId: string, unitId: string, specialtyId: string) {
        await assertUserHasUnitAccess(userId, unitId, this.hasUserAccessToUnitChecker);

        return this.specialtiesRepository.findByIdAndUnitId(specialtyId, unitId);
    }

    async assertSpecialtyNameIsUnique(unitId: string, name: string, excludeSpecialtyId?: string) {
        const normalizedName = name.trim();
        const existing = await this.specialtiesRepository.findByNameAndUnitId(
            normalizedName,
            unitId,
            excludeSpecialtyId,
        );

        if (existing) {
            throw new DomainError("SPECIALTY_NAME_ALREADY_EXISTS", "Essa especialidade já está cadastrada nessa unidade");
        }
    }

    async createSpecialtyForUnit(userId: string, unitId: string, data: {
        name: string;
        isActive?: boolean;
    }) {
        await assertUserHasUnitAccess(userId, unitId, this.hasUserAccessToUnitChecker);
        await this.assertSpecialtyNameIsUnique(unitId, data.name);

        const payload = {
            name: data.name.trim(),
            isActive: data.isActive,
        };

        return this.specialtiesRepository.createForUnit(unitId, payload);
    }

    async updateSpecialtyForUnit(userId: string, unitId: string, specialtyId: string, data: {
        name?: string;
        isActive?: boolean;
    }) {
        await assertUserHasUnitAccess(userId, unitId, this.hasUserAccessToUnitChecker);

        const existing = await this.specialtiesRepository.findByIdAndUnitId(specialtyId, unitId);

        if (!existing) {
            return null;
        }

        if (typeof data.name !== "undefined") {
            await this.assertSpecialtyNameIsUnique(unitId, data.name, specialtyId);
        }

        const payload = {
            ...(typeof data.name !== "undefined" ? { name: data.name.trim() } : {}),
            ...(typeof data.isActive !== "undefined" ? { isActive: data.isActive } : {}),
        };

        return this.specialtiesRepository.updateByIdAndUnitId(specialtyId, unitId, payload);
    }
}