import type { ExamManagementRepository, ListExamManagementFilters } from "./exam-management.repository.js";

export class ExamManagementService {
    constructor(private readonly examManagementRepository: ExamManagementRepository) { }

    async listExamManagements(filters: ListExamManagementFilters = {}) {
        return this.examManagementRepository.list(filters);
    }

    async getExamManagementDetails(appointmentId: string) {
        return this.examManagementRepository.findByAppointmentId(appointmentId);
    }
}
