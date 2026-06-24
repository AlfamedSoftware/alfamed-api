import type {
    CreateScheduleInput,
    ListFullAvailableScheduleSlotsFilters,
    SchedulesRepository,
} from "./schedules.repository.js";


export type CreateScheduleParams = Omit<CreateScheduleInput, "endTime">;

export class ScheduleConflictError extends Error {
    constructor(
        public readonly professionalName: string,
        public readonly unitName: string,
        public readonly conflictStartTime: string,
        public readonly conflictEndTime: string,
    ) {
        super("SCHEDULE_CONFLICT");
        this.name = "ScheduleConflictError";
    }
}

export class ScheduleOverflowError extends Error {
    constructor(public readonly maxSlots: number) {
        super("SCHEDULE_OVERFLOW");
        this.name = "ScheduleOverflowError";
    }
}

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

    async createSchedule(input: CreateScheduleParams) {
        const [hours, minutes] = input.startTime.split(":").map(Number);
        const startMinutes = hours * 60 + minutes;
        const maxSlots = Math.floor((1440 - startMinutes) / input.durationMinutes);

        if (input.slots > maxSlots) {
            throw new ScheduleOverflowError(maxSlots);
        }

        const endTotalMinutes = (startMinutes + input.slots * input.durationMinutes) % 1440;
        const endHours = Math.floor(endTotalMinutes / 60);
        const endMins = endTotalMinutes % 60;
        const endTime = `${String(endHours).padStart(2, "0")}:${String(endMins).padStart(2, "0")}:00`;

        const conflict = await this.schedulesRepository.findConflictingSchedule({
            professionalUnitId: input.professionalUnitId,
            date: input.date,
            startTime: input.startTime,
            endTime,
        });

        if (conflict) {
            throw new ScheduleConflictError(
                conflict.professionalName,
                conflict.unitName,
                conflict.startTime,
                conflict.endTime,
            );
        }

        return this.schedulesRepository.createSchedule({ ...input, endTime });
    }
}
