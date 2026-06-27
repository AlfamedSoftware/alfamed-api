import { assertUserHasUnitAccess } from "../../http/plugins/unit-access.js";
import { DomainError } from "../../http/plugins/domain-error.js";
import type { ProceduresRepository } from "./procedures.repository.js";

export class ProceduresService {
    constructor(
        private readonly proceduresRepository: ProceduresRepository,
        private readonly hasUserAccessToUnitChecker: (userId: string, unitId: string) => Promise<boolean>,
    ) {}

    async listProceduresByUnit(unitId: string, specialtyId?: string, isActive?: boolean, type?: number) {
        //Removido, mobile não valida se unidade está logada
        //await assertUserHasUnitAccess(userId, unitId, this.hasUserAccessToUnitChecker);

        return this.proceduresRepository.listByUnitId(unitId, specialtyId, isActive, type);
    }

    async listProceduresByIds(unitId: string, ids: string[], isActive?: boolean) {
        return this.proceduresRepository.listByIds(unitId, ids, isActive);
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
            throw new DomainError("PROCEDURE_CODE_ALREADY_EXISTS", "O código do procedimento já está cadastrado nessa unidade");
        }
    }

    private assertSpecialtyRequiredForType(type: number, specialtyId: string | null | undefined) {
        if ((type === 1 || type === 2) && !specialtyId) {
            throw new DomainError("SPECIALTY_REQUIRED_FOR_TYPE", "Especialidade é obrigatória para Consultas e Retornos");
        }
    }

    async createProcedureForUnit(userId: string, unitId: string, data: {
        specialtyId?: string | null;
        type: number;
        description: string;
        observation?: string | null;
        code: string;
        price: string;
        isActive?: boolean;
    }) {
        await assertUserHasUnitAccess(userId, unitId, this.hasUserAccessToUnitChecker);
        this.assertSpecialtyRequiredForType(data.type, data.specialtyId);
        await this.assertProcedureCodeIsUnique(unitId, data.code);

        const rawPrice = data.price ?? "";
        const normalizedPrice = String(rawPrice)
            .replace(/\./g, "") // remove thousand separators
            .replace(/,/g, "."); // brazilian decimal comma -> dot

        const payload = {
            specialtyId: data.specialtyId,
            type: data.type,
            description: data.description,
            observation: data.observation,
            code: data.code.trim(),
            price: normalizedPrice,
            isActive: data.isActive,
        };

        return this.proceduresRepository.createForUnit(unitId, payload);
    }

    async updateProcedureForUnit(userId: string, unitId: string, procedureId: string, data: {
        specialtyId?: string | null;
        type?: number;
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

        const effectiveType = data.type ?? existing.type;
        const effectiveSpecialtyId = typeof data.specialtyId !== "undefined" ? data.specialtyId : existing.specialtyId;
        this.assertSpecialtyRequiredForType(effectiveType, effectiveSpecialtyId);

        if (typeof data.code !== "undefined") {
            await this.assertProcedureCodeIsUnique(unitId, data.code, procedureId);
        }

        const normalizedPrice = typeof data.price !== "undefined"
            ? String(data.price).replace(/\./g, "").replace(/,/g, ".")
            : undefined;

        const payload = {
            ...(typeof data.specialtyId !== "undefined" ? { specialtyId: data.specialtyId } : {}),
            ...(typeof data.type !== "undefined" ? { type: data.type } : {}),
            ...(typeof data.description !== "undefined" ? { description: data.description } : {}),
            ...(typeof data.observation !== "undefined" ? { observation: data.observation } : {}),
            ...(typeof data.code !== "undefined" ? { code: data.code.trim() } : {}),
            ...(typeof normalizedPrice !== "undefined" ? { price: normalizedPrice } : {}),
            ...(typeof data.isActive !== "undefined" ? { isActive: data.isActive } : {}),
        };

        return this.proceduresRepository.updateByIdAndUnitId(procedureId, unitId, payload);
    }
}