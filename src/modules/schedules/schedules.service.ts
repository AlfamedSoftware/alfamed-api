import type {
    ListFullAvailableScheduleSlotsFilters,
    SchedulesRepository,
} from "./schedules.repository.js";

export class SchedulesService {
    constructor(private readonly schedulesRepository: SchedulesRepository) { }

    async listFullAvailableScheduleSlots(filters: ListFullAvailableScheduleSlotsFilters) {
        return this.schedulesRepository.listFullAvailableScheduleSlots(filters);
    }

    async checkSlotAvailability(slotId: string) {
        return this.schedulesRepository.checkSlotAvailability(slotId);
    }

    async getFullSlotDetailById(slotId: string) {
        const slot = await this.schedulesRepository.getFullSlotDetailById(slotId);
        if (!slot) {
            throw new Error("Vaga não encontrada");
        }
        return slot;
    }
}
