import type {
    AppointmentStatusRepository,
    ListAppointmentStatusFilters,
} from "./appointment-status.repository.js";

export class AppointmentStatusService {
    constructor(private readonly appointmentStatusRepository: AppointmentStatusRepository) { }

    async listAppointmentStatus(filters: ListAppointmentStatusFilters = {}) {
        return this.appointmentStatusRepository.list(filters);
    }
}
