import type {
    ListFullAvailableScheduleSlotsFilters,
    SchedulesRepository,
} from "./schedules.repository.js";

export class SchedulesService {
    constructor(private readonly schedulesRepository: SchedulesRepository) { }

    async listFullAvailableScheduleSlots(filters: ListFullAvailableScheduleSlotsFilters) {
        return this.schedulesRepository.listFullAvailableScheduleSlots(filters);
    }
}
