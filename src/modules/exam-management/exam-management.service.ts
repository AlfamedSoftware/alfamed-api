import type { ExamManagementRepository, ListExamManagementFilters } from "./exam-management.repository.js";

export class ExamManagementService {
    constructor(private readonly examManagementRepository: ExamManagementRepository) { }

    async listExamManagements(filters: ListExamManagementFilters = {}) {
        return this.examManagementRepository.list(filters);
    }

    async getExamManagementDetails(appointmentId: string) {
        return this.examManagementRepository.findByAppointmentId(appointmentId);
    }

    async iniciarRequests(appointmentId: string, professionalUnitId: string, changedByUserId: string) {
        return this.examManagementRepository.iniciarRequestsByAppointment(appointmentId, professionalUnitId, changedByUserId);
    }

    async iniciarLaudo(appointmentId: string, professionalUnitId: string, changedByUserId: string) {
        return this.examManagementRepository.iniciarLaudoByAppointment(appointmentId, professionalUnitId, changedByUserId);
    }

    async encerrarRequests(appointmentId: string, statusCode: 7 | 8, justification: string, changedByUserId: string) {
        return this.examManagementRepository.encerrarRequestsByAppointment(appointmentId, statusCode, justification, changedByUserId);
    }

    async finalizarLaudo(appointmentId: string, attachmentUrl: string, changedByUserId: string, complementaryInfo?: string | null) {
        return this.examManagementRepository.finalizarLaudoByAppointment(appointmentId, attachmentUrl, changedByUserId, complementaryInfo);
    }

    async finalizarRequests(appointmentId: string, changedByUserId: string, complementaryInfo?: string | null) {
        return this.examManagementRepository.finalizarRequestsByAppointment(appointmentId, changedByUserId, complementaryInfo);
    }

    async liberarRequests(appointmentId: string, changedByUserId: string) {
        return this.examManagementRepository.liberarRequestsByAppointment(appointmentId, changedByUserId);
    }
}
