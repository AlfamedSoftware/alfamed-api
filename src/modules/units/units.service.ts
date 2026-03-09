import { assertUserHasUnitAccess } from "@/http/plugins/unit-access";
import { UnitsRepository } from "./units.repository";

export class UnitsService {
    constructor(
        private readonly unitsRepository: UnitsRepository,
        private readonly hasUserAccessToUnitChecker: (userId: string, unitId: string) => Promise<boolean>,
    ) {}

    async createUnit(userId: string, data: { name: string; isActive?: boolean }) {
        void userId;
        return this.unitsRepository.create(data);
    }

    async getUnitById(userId: string, unitId: string) {
        await assertUserHasUnitAccess(userId, unitId, this.hasUserAccessToUnitChecker);

        const unit = await this.unitsRepository.findById(unitId);

        if (!unit) {
            throw new Error("Unit not found");
        }

        return unit;
    }

    async updateUnit(userId: string, unitId: string, data: { name?: string; isActive?: boolean }) {
        await assertUserHasUnitAccess(userId, unitId, this.hasUserAccessToUnitChecker);

        const unit = await this.unitsRepository.update(unitId, data);

        if (!unit) {
            throw new Error("Unit not found");
        }

        return unit;
    }

    async deleteUnit(userId: string, unitId: string) {
        await assertUserHasUnitAccess(userId, unitId, this.hasUserAccessToUnitChecker);

        const existing = await this.unitsRepository.findById(unitId);

        if (!existing) {
            throw new Error("Unit not found");
        }

        await this.unitsRepository.delete(unitId);
    }
}
