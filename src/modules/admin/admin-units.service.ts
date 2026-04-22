import { DomainError } from "../../http/plugins/domain-error.js";
import { AdminUnitsRepository } from "./admin-units.repository.js";
import type {
    CreateAdminProfessionalInput,
    CreateAdminUnitInput,
    UpdateAdminUnitInput,
} from "./admin-units.schemas.js";

export class AdminUnitsService {
    constructor(private readonly adminUnitsRepository: AdminUnitsRepository) {}

    async listUnits() {
        return this.adminUnitsRepository.listUnits();
    }

    async getUnitById(unitId: string) {
        const unit = await this.adminUnitsRepository.findUnitById(unitId);

        if (!unit) {
            throw new DomainError("UNIT_NOT_FOUND", "Unit not found");
        }

        return unit;
    }

    async createUnit(data: CreateAdminUnitInput) {
        return this.adminUnitsRepository.createUnit(data);
    }

    async updateUnit(unitId: string, data: UpdateAdminUnitInput) {
        const existing = await this.adminUnitsRepository.findUnitById(unitId);

        if (!existing) {
            throw new DomainError("UNIT_NOT_FOUND", "Unit not found");
        }

        const updated = await this.adminUnitsRepository.updateUnit(unitId, data);

        if (!updated) {
            throw new DomainError("UNIT_NOT_FOUND", "Unit not found");
        }

        return updated;
    }

    async deleteUnit(unitId: string) {
        const existing = await this.adminUnitsRepository.findUnitById(unitId);

        if (!existing) {
            throw new DomainError("UNIT_NOT_FOUND", "Unit not found");
        }

        const hasProfessionals = await this.adminUnitsRepository.hasProfessionalLinkedToUnit(unitId);

        if (hasProfessionals) {
            throw new DomainError("UNIT_HAS_LINKED_PROFESSIONALS", "Unit has linked professionals");
        }

        await this.adminUnitsRepository.deleteUnit(unitId);
    }

    async listUnitProfessionals(unitId: string) {
        const hasUnit = await this.adminUnitsRepository.hasUnit(unitId);

        if (!hasUnit) {
            throw new DomainError("UNIT_NOT_FOUND", "Unit not found");
        }

        return this.adminUnitsRepository.listUnitProfessionals(unitId);
    }

    async createUnitProfessional(unitId: string, data: CreateAdminProfessionalInput) {
        const hasUnit = await this.adminUnitsRepository.hasUnit(unitId);

        if (!hasUnit) {
            throw new DomainError("UNIT_NOT_FOUND", "Unit not found");
        }

        return this.adminUnitsRepository.createUnitProfessional(unitId, data);
    }
}
