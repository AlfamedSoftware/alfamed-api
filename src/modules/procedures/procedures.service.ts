import { assertUserHasUnitAccess } from "../../http/plugins/unit-access.js";
import type { ProceduresRepository } from "./procedures.repository.js";

export class ProceduresService {
    constructor(
        private readonly proceduresRepository: ProceduresRepository,
        private readonly hasUserAccessToUnitChecker: (userId: string, unitId: string) => Promise<boolean>,
    ) {}

    async listProceduresByUnit(userId: string, unitId: string) {
        await assertUserHasUnitAccess(userId, unitId, this.hasUserAccessToUnitChecker);

        return this.proceduresRepository.listByUnitId(unitId);
    }

    async getProcedureById(userId: string, unitId: string, procedureId: string) {
        await assertUserHasUnitAccess(userId, unitId, this.hasUserAccessToUnitChecker);

        return this.proceduresRepository.findByIdAndUnitId(procedureId, unitId);
    }

    async createProcedureForUnit(userId: string, unitId: string, data: {
        description: string;
        observation?: string | null;
        code: string;
        price: string;
        isActive?: boolean;
    }) {
        await assertUserHasUnitAccess(userId, unitId, this.hasUserAccessToUnitChecker);

        const rawPrice = data.price ?? "";
        const normalizedPrice = String(rawPrice)
            .replace(/\./g, "") // remove thousand separators
            .replace(/,/g, "."); // brazilian decimal comma -> dot

        const payload = {
            description: data.description,
            observation: data.observation,
            code: data.code,
            price: normalizedPrice,
            isActive: data.isActive,
        };

        return this.proceduresRepository.createForUnit(unitId, payload);
    }
}