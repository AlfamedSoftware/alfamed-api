import type { RequestsRepository } from "./requests.repository.js";

export class RequestsService {
    constructor(private readonly requestsRepository: RequestsRepository) {}

    async saveFromAppointment(appointmentId: string, procedureIds: string[]) {
        return this.requestsRepository.saveExamRequests(appointmentId, procedureIds);
    }

    async listByAppointment(appointmentId: string) {
        return this.requestsRepository.listByAppointment(appointmentId);
    }
}
