import { ProfessionalUnitSpecialtiesRepository } from "./professional-unit-specialties.repository.js"

export class ProfessionalUnitSpecialtiesService {
    constructor(
        private readonly professionalUnitSpecialtiesRepository: ProfessionalUnitSpecialtiesRepository,
    ) {}

    async listByProfessionalUnit(professionalUnitId: string) {
        return this.professionalUnitSpecialtiesRepository.listByProfessionalUnit(professionalUnitId)
    }

    async create(data: { professionalUnitId: string; specialtyId: string }) {
        return this.professionalUnitSpecialtiesRepository.create(data)
    }

    async update(data: { id: string; isActive?: boolean }) {
        return this.professionalUnitSpecialtiesRepository.update(data)
    }
}
