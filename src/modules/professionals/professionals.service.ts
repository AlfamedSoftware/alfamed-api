import type {
    CreateProfessionalInput,
    ProfessionalsRepository,
    UpdateProfessionalInput,
} from "./professionals.repository";

export class ProfessionalsService {
    constructor(private readonly professionalsRepository: ProfessionalsRepository) {}

    async createProfessional(data: CreateProfessionalInput) {
        return this.professionalsRepository.create(data);
    }

    async getProfessionalById(professionalId: string, unitId: string) {
        const professional = await this.professionalsRepository.findByIdAndUnit(professionalId, unitId);

        if (!professional) {
            throw new Error("Professional not found");
        }

        return professional;
    }

    async listProfessionals(unitId: string) {
        return this.professionalsRepository.listByUnit(unitId);
    }

    async updateProfessional(professionalId: string, unitId: string, data: UpdateProfessionalInput) {
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

    async deleteProfessional(professionalId: string, unitId: string) {
        const existingProfessional = await this.professionalsRepository.findByIdAndUnit(professionalId, unitId);

        if (!existingProfessional) {
            throw new Error("Professional not found");
        }

        await this.professionalsRepository.delete(professionalId);
    }
}
