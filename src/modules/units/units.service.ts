import { assertUserHasUnitAccess } from "../../http/plugins/unit-access.js";
import { DomainError } from "../../http/plugins/domain-error.js";
import type { UnitsRepository } from "./units.repository.js";

export class UnitsService {
    constructor(
        private readonly unitsRepository: UnitsRepository,
        private readonly hasUserAccessToUnitChecker: (userId: string, unitId: string) => Promise<boolean>,
    ) {}

    async createUnit(userId: string, data: { name: string; isActive?: boolean }) {
        return this.unitsRepository.createForUser(userId, data);
    }

    async getUnitById(userId: string, unitId: string) {
        const unit = await this.unitsRepository.findById(unitId);

        if (!unit) {
            throw new DomainError("UNIT_NOT_FOUND", "Unit not found");
        }

        await assertUserHasUnitAccess(userId, unitId, this.hasUserAccessToUnitChecker);

        return unit;
    }

    async listUnitsByUserId(userId: string) {
        return this.unitsRepository.listByUserId(userId);
    }

    async updateUnit(userId: string, unitId: string, data: { name?: string; isActive?: boolean }) {
        const existing = await this.unitsRepository.findById(unitId);

        if (!existing) {
            throw new DomainError("UNIT_NOT_FOUND", "Unit not found");
        }

        await assertUserHasUnitAccess(userId, unitId, this.hasUserAccessToUnitChecker);

        const unit = await this.unitsRepository.update(unitId, data);

        if (!unit) {
            throw new DomainError("UNIT_NOT_FOUND", "Unit not found");
        }

        return unit;
    }

}
