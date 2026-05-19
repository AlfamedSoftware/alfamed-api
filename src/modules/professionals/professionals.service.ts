import type {
    CreateProfessionalInput,
    LinkProfessionalUnitRoleInput,
    ProfessionalsRepository,
    UpdateProfessionalUnitRoleInput,
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

    async listCurrentProfessionalUnitRoles(
        requestUserId: string,
        unitId: string,
        professionalUnitId: string,
    ) {
        await assertUserHasUnitAccess(requestUserId, unitId, this.hasUserAccessToUnitChecker);

        return this.professionalsRepository.listActiveRolesByProfessionalUnit(
            requestUserId,
            unitId,
            professionalUnitId,
        );
    }

    async linkProfessionalUnitRole(
        requestUserId: string,
        unitId: string,
        data: LinkProfessionalUnitRoleInput,
    ) {
        await assertUserHasUnitAccess(requestUserId, unitId, this.hasUserAccessToUnitChecker);

        const professionalUnit = await this.professionalsRepository.findProfessionalUnitByIdAndUnit(
            data.professionalUnitId,
            unitId,
        );

        if (!professionalUnit) {
            throw new DomainError("PROFESSIONAL_UNIT_NOT_FOUND", "Professional unit not found");
        }

        const hasRole = await this.professionalsRepository.hasActiveRole(data.roleId);

        if (!hasRole) {
            throw new DomainError("ROLE_NOT_FOUND", "Role not found");
        }

        return this.professionalsRepository.linkProfessionalUnitRole(data);
    }

    async updateProfessionalUnitRole(
        requestUserId: string,
        unitId: string,
        data: UpdateProfessionalUnitRoleInput,
    ) {
        await assertUserHasUnitAccess(requestUserId, unitId, this.hasUserAccessToUnitChecker);

        const existingLink = await this.professionalsRepository.findProfessionalUnitRoleByIdAndUnit(
            data.professionalUnitRoleId,
            unitId,
        );

        if (!existingLink) {
            throw new DomainError("PROFESSIONAL_UNIT_ROLE_NOT_FOUND", "Professional unit role not found");
        }

        if (data.roleId) {
            const hasRole = await this.professionalsRepository.hasActiveRole(data.roleId);

            if (!hasRole) {
                throw new DomainError("ROLE_NOT_FOUND", "Role not found");
            }
        }

        const updated = await this.professionalsRepository.updateProfessionalUnitRole(
            data.professionalUnitRoleId,
            {
                roleId: data.roleId,
                isActive: data.isActive,
            },
        );

        if (!updated) {
            throw new DomainError("PROFESSIONAL_UNIT_ROLE_NOT_FOUND", "Professional unit role not found");
        }

        return updated;
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

}
