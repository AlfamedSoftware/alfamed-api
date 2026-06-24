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
        statusCode: number;
    }) {
        // Check for self-booking
        const isSelfBooking = await this.appointmentsRepository.checkSelfBooking(data.patientId, data.professionalUnitId);
        if (isSelfBooking) {
            throw new Error("SELF_BOOKING_FORBIDDEN");
        }

        // Check if current time is less than 1 hour before the slot start time
        const slotDatetime = await this.scheduleRepository.getSlotStartDatetime(data.scheduleSlotId);
        if (slotDatetime) {
            const diffMs = slotDatetime.getTime() - Date.now();
            if (diffMs < 0) {
                throw new Error("SLOT_PAST");
            }
            if (diffMs < 30 * 60 * 1000) {
                throw new Error("SLOT_TOO_SOON");
            }
        }

        const statusUuid = await this.appointmentsRepository.getStatusIdByCode(data.statusCode);

        const created = await this.appointmentsRepository.create({ ...data, statusId: statusUuid });

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
        statusCode?: number;
        isActive?: boolean;
    }) {
        let statusUuid: string | undefined;
        if (data.statusCode !== undefined) {
            statusUuid = await this.appointmentsRepository.getStatusIdByCode(data.statusCode);
        }

        const updated = await this.appointmentsRepository.updateById(appointmentId, {
            ...data,
            statusId: statusUuid,
        });

        if (!updated) {
            throw new Error("Appointment not found");
        }

        if (statusUuid && data.professionalUnitId) {
            await this.appointmentsRepository.createAppointmentLog(
                appointmentId,
                null,
                statusUuid,
                data.professionalUnitId,
            );
        }

        return updated;
    }
}