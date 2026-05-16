import { DomainError } from "../../http/plugins/domain-error.js";
import { assertUserHasUnitAccess } from "../../http/plugins/unit-access.js";
import type {
    CreateProfessionalUnitInput,
    ProfessionalUnitsRepository,
} from "./professional-units.repository.js";

export class ProfessionalUnitsService {
    constructor(
        private readonly professionalUnitsRepository: ProfessionalUnitsRepository,
        private readonly hasUserAccessToUnitChecker: (userId: string, unitId: string) => Promise<boolean>,
    ) {}

    async createProfessionalUnit(
        requestUserId: string,
        data: CreateProfessionalUnitInput,
    ) {
        await assertUserHasUnitAccess(requestUserId, data.unitId, this.hasUserAccessToUnitChecker);

        const professionalExists = await this.professionalUnitsRepository.professionalExists(data.professionalId);

        if (!professionalExists) {
            throw new DomainError("PROFESSIONAL_NOT_FOUND", "Professional not found");
        }

        const existingProfessionalUnit = await this.professionalUnitsRepository.findByProfessionalIdAndUnitId(
            data.professionalId,
            data.unitId,
        );

        if (existingProfessionalUnit) {
            throw new DomainError("PROFESSIONAL_UNIT_ALREADY_EXISTS", "Professional unit already exists");
        }

        return this.professionalUnitsRepository.create(data);
    }

    async getProfessionalUnitById(
        requestUserId: string,
        unitId: string,
        professionalUnitId: string,
    ) {
        await assertUserHasUnitAccess(requestUserId, unitId, this.hasUserAccessToUnitChecker);

        const professionalUnit = await this.professionalUnitsRepository.findByIdAndUnit(
            professionalUnitId,
            unitId,
        );

        if (!professionalUnit) {
            throw new DomainError("PROFESSIONAL_UNIT_NOT_FOUND", "Professional unit not found");
        }

        return professionalUnit;
    }

    async getProfessionalUnitFullDataById(
        requestUserId: string,
        unitId: string,
        professionalUnitId: string,
    ) {
        await assertUserHasUnitAccess(requestUserId, unitId, this.hasUserAccessToUnitChecker);

        const professionalUnit = await this.professionalUnitsRepository.findFullDataByIdAndUnit(
            professionalUnitId,
            unitId,
        );

        if (!professionalUnit) {
            throw new DomainError("PROFESSIONAL_UNIT_NOT_FOUND", "Professional unit not found");
        }

        return professionalUnit;
    }

    async listProfessionalUnitFullDataByUnit(requestUserId: string, unitId: string) {
        await assertUserHasUnitAccess(requestUserId, unitId, this.hasUserAccessToUnitChecker);

        return this.professionalUnitsRepository.listFullDataByUnit(unitId);
    }
}
