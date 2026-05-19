import type {
    ListRolesFilters,
    RolesRepository,
} from "./roles.repository.js";

export class RolesService {
    constructor(private readonly rolesRepository: RolesRepository) { }

    async listRoles(filters: ListRolesFilters = {}) {
        return this.rolesRepository.list(filters);
    }
}
