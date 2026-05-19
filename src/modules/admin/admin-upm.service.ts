import { DomainError } from "../../http/plugins/domain-error.js";
import type { CreateAdminUpmUserInput, UpdateAdminUpmUserInput } from "./admin-upm.schemas.js";
import { AdminUpmRepository } from "./admin-upm.repository.js";

const INTERNAL_ALFAMED_ROLE_KEY = "internal_alfamed";

export class AdminUpmService {
    constructor(private readonly adminUpmRepository: AdminUpmRepository) { }

    async listInternalAlfamedUsers() {
        return this.adminUpmRepository.listUsersByRoleKey(INTERNAL_ALFAMED_ROLE_KEY);
    }

    async createInternalAlfamedUser(data: CreateAdminUpmUserInput) {
        const hasUnit = await this.adminUpmRepository.hasUnit(data.unitId);

        if (!hasUnit) {
            throw new DomainError("UNIT_NOT_FOUND", "Unit not found");
        }

        return this.adminUpmRepository.createUserWithRoleKey(INTERNAL_ALFAMED_ROLE_KEY, data);
    }

    async updateInternalAlfamedUser(professionalUnitId: string, data: UpdateAdminUpmUserInput) {
        const updated = await this.adminUpmRepository.updateUserByProfessionalUnitId(
            INTERNAL_ALFAMED_ROLE_KEY,
            professionalUnitId,
            data.user,
        );

        if (!updated) {
            throw new DomainError("UPM_USER_NOT_FOUND", "User not found");
        }

        return updated;
    }
}
