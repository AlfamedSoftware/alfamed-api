import type { AppointmentsRepository } from "./appointments.repository.js";
import type { SchedulesRepository } from "../schedules/schedules.repository.js";

export class AppointmentsService {
    constructor(
        private readonly appointmentsRepository: AppointmentsRepository,
        private readonly scheduleRepository: SchedulesRepository,
    ) {}

    async createAppointment(data: {
        patientId: string;
        professionalUnitId: string;
        scheduleSlotId: string;
        startAt?: Date | null;
        endAt?: Date | null;
        diagnostics?: string | null;
        evolution?: string | null;
        statusId: number;
    }) {
        const created = await this.appointmentsRepository.create(data);

        // Create appointment log - use the status UUID from the created appointment
        await this.appointmentsRepository.createAppointmentLog(
            created.id,
            null,
            created.statusId,
            data.professionalUnitId,
        );
        
        // Set the slot as unavailable
        await this.scheduleRepository.setSlotAvailability(data.scheduleSlotId, false);
        
        // Decrement empty slots and increment allocated slots
        await this.scheduleRepository.decrementEmptySlotsAndIncrementAllocatedSlots(data.scheduleSlotId, 1);

        return created;
    }

    async updateAppointment(appointmentId: string, data: {
        patientId?: string;
        professionalUnitId?: string;
        scheduleSlotId?: string;
        startAt?: Date | null;
        endAt?: Date | null;
        diagnostics?: string | null;
        evolution?: string | null;
        statusId?: string;
        isActive?: boolean;
    }) {
        const updated = await this.appointmentsRepository.updateById(appointmentId, data);

        if (!updated) {
            throw new Error("Appointment not found");
        }

        return updated;
    }
}