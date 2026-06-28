import type {
    RequestStatusRepository,
    ListRequestStatusFilters,
} from "./request-status.repository.js";

export class RequestStatusService {
    constructor(private readonly requestStatusRepository: RequestStatusRepository) { }

    async listRequestStatus(filters: ListRequestStatusFilters = {}) {
        return this.requestStatusRepository.list(filters);
    }
}
