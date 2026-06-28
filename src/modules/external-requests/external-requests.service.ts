import type { ExternalRequestsRepository } from "./external-requests.repository.js";
import { generateRequisitionPdf } from "./external-requests.pdf.js";

export class RequisitionNotFoundError extends Error {
    constructor() {
        super("REQUISITION_NOT_FOUND");
        this.name = "RequisitionNotFoundError";
    }
}

export class ExternalRequestsService {
    constructor(private readonly repository: ExternalRequestsRepository) {}

    async generateRequisitionPdf(appointmentId: string): Promise<Buffer> {
        const requisitionData = await this.repository.findRequisitionData(appointmentId);

        if (!requisitionData) {
            throw new RequisitionNotFoundError();
        }

        const exams = await this.repository.listExamsByAppointmentId(appointmentId);

        return generateRequisitionPdf({
            unit: requisitionData.unit,
            patient: requisitionData.patient,
            professional: requisitionData.professional,
            exams,
        });
    }
}
