import type { AnamnesisRepository } from "./anamnesis.repository.js";

export class AnamnesisService {
    constructor(private readonly anamnesisRepository: AnamnesisRepository) {}

    async listByAppointmentId(appointmentId: string) {
        return this.anamnesisRepository.findByAppointmentId(appointmentId);
    }

    async create(data: {
        appointmentId: string;
        mainComplaint?: string | null;
        painLevel?: number | null;
        takingMedication?: string | null;
        knownAllergy?: string | null;
        hadSurgery?: boolean | null;
        surgeryDetails?: string | null;
        familyHistory?: boolean | null;
        familyHistoryDetails?: string | null;
    }) {
        return this.anamnesisRepository.create(data);
    }
}
