import { DomainError } from "../../http/plugins/domain-error.js";
import { assertUserHasUnitAccess } from "../../http/plugins/unit-access.js";
import type {
    CreateSpecialtyInput,
    SpecialtiesRepository,
    UpdateSpecialtyInput,
} from "./specialties.repository.js";

export class SpecialtiesService {
    constructor(
        private readonly specialtiesRepository: SpecialtiesRepository,
        private readonly hasUserAccessToUnitChecker: (userId: string, unitId: string) => Promise<boolean>,
    ) {}

    async createSpecialty(userId: string, unitId: string, data: CreateSpecialtyInput) {
        await assertUserHasUnitAccess(userId, unitId, this.hasUserAccessToUnitChecker);
        return this.specialtiesRepository.create(data);
    }

    async listSpecialties(userId: string, unitId: string) {
        await assertUserHasUnitAccess(userId, unitId, this.hasUserAccessToUnitChecker);
        return this.specialtiesRepository.list();
    }

    async getSpecialtyById(userId: string, unitId: string, specialtyId: string) {
        await assertUserHasUnitAccess(userId, unitId, this.hasUserAccessToUnitChecker);

        const specialty = await this.specialtiesRepository.findById(specialtyId);

        if (!specialty) {
            throw new DomainError("SPECIALTY_NOT_FOUND", "Specialty not found");
        }

        return specialty;
    }

    async updateSpecialty(userId: string, unitId: string, specialtyId: string, data: UpdateSpecialtyInput) {
        await assertUserHasUnitAccess(userId, unitId, this.hasUserAccessToUnitChecker);

        const existing = await this.specialtiesRepository.findById(specialtyId);

        if (!existing) {
            throw new DomainError("SPECIALTY_NOT_FOUND", "Specialty not found");
        }

        const updated = await this.specialtiesRepository.update(specialtyId, data);

        if (!updated) {
            throw new DomainError("SPECIALTY_NOT_FOUND", "Specialty not found");
        }

        return updated;
    }

    async deleteSpecialty(userId: string, unitId: string, specialtyId: string) {
        await assertUserHasUnitAccess(userId, unitId, this.hasUserAccessToUnitChecker);

        const existing = await this.specialtiesRepository.findById(specialtyId);

        if (!existing) {
            throw new DomainError("SPECIALTY_NOT_FOUND", "Specialty not found");
        }

        await this.specialtiesRepository.delete(specialtyId);
    }

    async assignSpecialtyToProfessional(userId: string, unitId: string, professionalId: string, specialtyId: string) {
        await assertUserHasUnitAccess(userId, unitId, this.hasUserAccessToUnitChecker);

        const specialty = await this.specialtiesRepository.findById(specialtyId);
        if (!specialty) {
            throw new DomainError("SPECIALTY_NOT_FOUND", "Specialty not found");
        }

        const professional = await this.specialtiesRepository.findProfessionalByIdAndUnit(professionalId, unitId);
        if (!professional) {
            throw new DomainError("PROFESSIONAL_NOT_FOUND", "Professional not found");
        }

        await this.specialtiesRepository.linkProfessionalSpecialty(professionalId, unitId, specialtyId);
    }

    async removeSpecialtyFromProfessional(
        userId: string,
        unitId: string,
        professionalId: string,
        specialtyId: string,
    ) {
        await assertUserHasUnitAccess(userId, unitId, this.hasUserAccessToUnitChecker);

        const specialty = await this.specialtiesRepository.findById(specialtyId);
        if (!specialty) {
            throw new DomainError("SPECIALTY_NOT_FOUND", "Specialty not found");
        }

        const professional = await this.specialtiesRepository.findProfessionalByIdAndUnit(professionalId, unitId);
        if (!professional) {
            throw new DomainError("PROFESSIONAL_NOT_FOUND", "Professional not found");
        }

        const unlinked = await this.specialtiesRepository.unlinkProfessionalSpecialty(professionalId, unitId, specialtyId);
        if (!unlinked) {
            throw new DomainError("SPECIALTY_LINK_NOT_FOUND", "Specialty link not found");
        }
    }

    async listProfessionalSpecialties(userId: string, unitId: string, professionalId: string) {
        await assertUserHasUnitAccess(userId, unitId, this.hasUserAccessToUnitChecker);

        const professional = await this.specialtiesRepository.findProfessionalByIdAndUnit(professionalId, unitId);
        if (!professional) {
            throw new DomainError("PROFESSIONAL_NOT_FOUND", "Professional not found");
        }

        return this.specialtiesRepository.listByProfessionalAndUnit(professionalId, unitId);
    }
}
