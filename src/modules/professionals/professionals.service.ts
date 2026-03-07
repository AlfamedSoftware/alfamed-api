import type {
    CreateProfessionalInput,
    ProfessionalsRepository,
    UpdateProfessionalInput,
} from "./professionals.repository";
import { assertUserHasUnitAccess } from "@/http/plugins/unit-access";

export class ProfessionalsService {
    constructor(private readonly professionalsRepository: ProfessionalsRepository) {}

    async createProfessional(requestUserId: string, unitId: string, data: CreateProfessionalInput) {
        await assertUserHasUnitAccess(
            requestUserId,
            unitId,
            (userId, selectedUnitId) =>
                this.professionalsRepository.hasUserAccessToUnit(userId, selectedUnitId),
        );

        return this.professionalsRepository.createWithUnit(data, unitId);
    }

    async getProfessionalById(requestUserId: string, professionalId: string, unitId: string) {
        await assertUserHasUnitAccess(
            requestUserId,
            unitId,
            (userId, selectedUnitId) =>
                this.professionalsRepository.hasUserAccessToUnit(userId, selectedUnitId),
        );

        const professional = await this.professionalsRepository.findByIdAndUnit(professionalId, unitId);

        if (!professional) {
            throw new Error("Professional not found");
        }

        return professional;
    }

    async listProfessionals(requestUserId: string, unitId: string) {
        await assertUserHasUnitAccess(
            requestUserId,
            unitId,
            (userId, selectedUnitId) =>
                this.professionalsRepository.hasUserAccessToUnit(userId, selectedUnitId),
        );

        return this.professionalsRepository.listByUnit(unitId);
    }

    async updateProfessional(
        requestUserId: string,
        professionalId: string,
        unitId: string,
        data: UpdateProfessionalInput,
    ) {
        await assertUserHasUnitAccess(
            requestUserId,
            unitId,
            (userId, selectedUnitId) =>
                this.professionalsRepository.hasUserAccessToUnit(userId, selectedUnitId),
        );

        const existingProfessional = await this.professionalsRepository.findByIdAndUnit(professionalId, unitId);

        if (!existingProfessional) {
            throw new Error("Professional not found");
        }

        const updatedProfessional = await this.professionalsRepository.update(professionalId, data);

        if (!updatedProfessional) {
            throw new Error("Professional not found");
        }

        return updatedProfessional;
    }

    async deleteProfessional(requestUserId: string, professionalId: string, unitId: string) {
        await assertUserHasUnitAccess(
            requestUserId,
            unitId,
            (userId, selectedUnitId) =>
                this.professionalsRepository.hasUserAccessToUnit(userId, selectedUnitId),
        );

        const existingProfessional = await this.professionalsRepository.findByIdAndUnit(professionalId, unitId);

        if (!existingProfessional) {
            throw new Error("Professional not found");
        }

        await this.professionalsRepository.delete(professionalId);
    }
}
