import type { AttendimentsRepository } from "./attendiments.repository.js";
import type { SchedulesRepository } from "../schedules/schedules.repository.js";

export class AttendimentsService {
    constructor(
        private readonly attendimentsRepository: AttendimentsRepository,
        private readonly schedulesRepository: SchedulesRepository,
    ) {}

    async listAppointmentsBySpecialty(filters: {
        date: string;
        professionalUnitId?: string;
        statusId?: string;
    }) {
        return this.attendimentsRepository.listAppointmentsBySpecialty(filters);
    }

    async getAppointmentFullData(appointmentId: string) {
        return this.attendimentsRepository.getAppointmentFullData(appointmentId);
    }

    async iniciarAtendimento(appointmentId: string) {
        return this.attendimentsRepository.transitionAppointmentStatus(appointmentId, 2, {
            startAt: new Date(),
        });
    }

    async finalizarAtendimento(appointmentId: string, data: {
        diagnostics?: string | null;
        clinicNotes?: string | null;
    }) {
        return this.attendimentsRepository.transitionAppointmentStatus(appointmentId, 3, {
            endAt: new Date(),
            diagnostics: data.diagnostics,
            clinicNotes: data.clinicNotes,
        });
    }

    async faltaAtendimento(appointmentId: string) {
        const now = new Date();
        return this.attendimentsRepository.transitionAppointmentStatus(appointmentId, 4, {
            startAt: now,
            endAt: now,
        });
    }

    async cancelarAtendimento(appointmentId: string) {
        const now = new Date();
        const result = await this.attendimentsRepository.transitionAppointmentStatus(appointmentId, 5, {
            startAt: now,
            endAt: now,
            isActive: false,
        });

        if (!result.success) return result;

        await this.schedulesRepository.incrementEmptySlotsAndDecrementAllocatedSlots(result.scheduleSlotId!, 1);
        await this.schedulesRepository.setSlotAvailability(result.scheduleSlotId!, true);

        return result;
    }
}
