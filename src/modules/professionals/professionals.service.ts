import type {
    CreateProfessionalInput,
    ProfessionalsRepository,
    UpdateProfessionalInput,
} from "./professionals.repository.js";
import { assertUserHasUnitAccess } from "../../http/plugins/unit-access.js";
import { DomainError } from "../../http/plugins/domain-error.js";

export class ProfessionalsService {
    constructor(
        private readonly professionalsRepository: ProfessionalsRepository,
        private readonly hasUserAccessToUnitChecker: (userId: string, unitId: string) => Promise<boolean>,
    ) { }

    async createProfessional(requestUserId: string, unitId: string, data: CreateProfessionalInput) {
        await assertUserHasUnitAccess(requestUserId, unitId, this.hasUserAccessToUnitChecker);

        return this.professionalsRepository.createWithUnit(data, unitId);
    }

    async createProfessionalForUser(data: CreateProfessionalInput) {
        return this.professionalsRepository.create(data);
    }

    async getProfessionalById(requestUserId: string, professionalId: string, unitId: string) {
        await assertUserHasUnitAccess(requestUserId, unitId, this.hasUserAccessToUnitChecker);

        const existsInUnit = await this.professionalsRepository.findByIdAndUnit(professionalId, unitId);

        if (!existsInUnit) {
            throw new DomainError("PROFESSIONAL_NOT_FOUND", "Professional not found");
        }

        const professional = await this.professionalsRepository.findDetailById(professionalId);

        if (!professional) {
            throw new DomainError("PROFESSIONAL_NOT_FOUND", "Professional not found");
        }

        return professional;
    }

    async listProfessionals(requestUserId: string, unitId: string) {
        await assertUserHasUnitAccess(requestUserId, unitId, this.hasUserAccessToUnitChecker);

        return this.professionalsRepository.listByUnit(unitId);
    }

    async updateProfessional(
        requestUserId: string,
        professionalId: string,
        unitId: string,
        data: UpdateProfessionalInput,
    ) {
        await assertUserHasUnitAccess(requestUserId, unitId, this.hasUserAccessToUnitChecker);

        const existingProfessional = await this.professionalsRepository.findByIdAndUnit(professionalId, unitId);

        if (!existingProfessional) {
            throw new DomainError("PROFESSIONAL_NOT_FOUND", "Professional not found");
        }

        const updatedProfessional = await this.professionalsRepository.update(professionalId, data);

        if (!updatedProfessional) {
            throw new DomainError("PROFESSIONAL_NOT_FOUND", "Professional not found");
        }

        return updatedProfessional;
    }

    async deleteProfessional(requestUserId: string, professionalId: string, unitId: string) {
        await assertUserHasUnitAccess(requestUserId, unitId, this.hasUserAccessToUnitChecker);

        const existingProfessional = await this.professionalsRepository.findByIdAndUnit(professionalId, unitId);

        if (!existingProfessional) {
            throw new DomainError("PROFESSIONAL_NOT_FOUND", "Professional not found");
        }

        await this.professionalsRepository.delete(professionalId);
    }
}
