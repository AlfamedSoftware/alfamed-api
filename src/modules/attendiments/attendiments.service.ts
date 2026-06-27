import type { AttendimentsRepository } from "./attendiments.repository.js";
import type { SchedulesRepository } from "../schedules/schedules.repository.js";
import type { RequestsRepository } from "../requests/requests.repository.js";

export class AttendimentsService {
    constructor(
        private readonly attendimentsRepository: AttendimentsRepository,
        private readonly schedulesRepository: SchedulesRepository,
        private readonly requestsRepository: RequestsRepository,
    ) {}

    async listAppointmentsBySpecialty(filters: {
        date: string;
        professionalUnitId?: string;
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
        examProcedureIds?: string[];
    }) {
        const result = await this.attendimentsRepository.transitionAppointmentStatus(appointmentId, 3, {
            endAt: new Date(),
            diagnostics: data.diagnostics,
            clinicNotes: data.clinicNotes,
        });

        if (!result.success) return result;

        if (data.examProcedureIds && data.examProcedureIds.length > 0) {
            await this.requestsRepository.saveExamRequests(appointmentId, data.examProcedureIds);
        }

        return result;
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
