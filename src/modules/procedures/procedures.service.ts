import { assertUserHasUnitAccess } from "../../http/plugins/unit-access.js";
import { DomainError } from "../../http/plugins/domain-error.js";
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

    async assertProcedureCodeIsUnique(unitId: string, code: string, excludeProcedureId?: string) {
        const normalizedCode = code.trim();
        const existing = await this.proceduresRepository.findByCodeAndUnitId(
            normalizedCode,
            unitId,
            excludeProcedureId,
        );

        if (existing) {
            throw new DomainError("PROCEDURE_CODE_ALREADY_EXISTS", "Procedure code already exists");
        }
    }

    async createProcedureForUnit(userId: string, unitId: string, data: {
        description: string;
        observation?: string | null;
        code: string;
        price: string;
        isActive?: boolean;
    }) {
        await assertUserHasUnitAccess(userId, unitId, this.hasUserAccessToUnitChecker);
        await this.assertProcedureCodeIsUnique(unitId, data.code);

        const rawPrice = data.price ?? "";
        const normalizedPrice = String(rawPrice)
            .replace(/\./g, "") // remove thousand separators
            .replace(/,/g, "."); // brazilian decimal comma -> dot

        const payload = {
            description: data.description,
            observation: data.observation,
            code: data.code.trim(),
            price: normalizedPrice,
            isActive: data.isActive,
        };

        return this.proceduresRepository.createForUnit(unitId, payload);
    }

    async updateProcedureForUnit(userId: string, unitId: string, procedureId: string, data: {
        description?: string;
        observation?: string | null;
        code?: string;
        price?: string;
        isActive?: boolean;
    }) {
        await assertUserHasUnitAccess(userId, unitId, this.hasUserAccessToUnitChecker);

        const existing = await this.proceduresRepository.findByIdAndUnitId(procedureId, unitId);

        if (!existing) {
            return null;
        }

        if (typeof data.code !== "undefined") {
            await this.assertProcedureCodeIsUnique(unitId, data.code, procedureId);
        }

        const normalizedPrice = typeof data.price !== "undefined"
            ? String(data.price).replace(/\./g, "").replace(/,/g, ".")
            : undefined;

        const payload = {
            ...(typeof data.description !== "undefined" ? { description: data.description } : {}),
            ...(typeof data.observation !== "undefined" ? { observation: data.observation } : {}),
            ...(typeof data.code !== "undefined" ? { code: data.code.trim() } : {}),
            ...(typeof normalizedPrice !== "undefined" ? { price: normalizedPrice } : {}),
            ...(typeof data.isActive !== "undefined" ? { isActive: data.isActive } : {}),
        };

        return this.proceduresRepository.updateByIdAndUnitId(procedureId, unitId, payload);
    }
}