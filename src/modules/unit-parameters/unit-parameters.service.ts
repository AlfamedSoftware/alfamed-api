import type { UnitParametersRepository } from "./unit-parameters.repository.js";

export class UnitParametersService {
    constructor(private readonly unitParametersRepository: UnitParametersRepository) {}

    async getParametersByUnitId(unitId: string) {
        return this.unitParametersRepository.findByUnitId(unitId);
    }
}
