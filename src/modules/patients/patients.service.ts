import type { PatientsRepository } from "./patients.repository.js";

export class PatientsService {
    constructor(private readonly patientsRepository: PatientsRepository) {}

    async createPatient(userId: string) {
        // Check if patient already exists
        const existingPatient = await this.patientsRepository.getPatientByUserId(userId);

        if (existingPatient) {
            throw new Error("Patient already exists for this user");
        }

        return this.patientsRepository.createPatient(userId);
    }

    async getPatientByUserId(userId: string) {
        return this.patientsRepository.getPatientByUserId(userId);
    }

    async getPatientById(patientId: string) {
        return this.patientsRepository.getPatientById(patientId);
    }
}
