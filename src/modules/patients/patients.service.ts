import type { CreatePatientInput, PatientsRepository } from "./patients.repository.js";
import { DomainError } from "../../http/plugins/domain-error.js";

export class PatientsService {
    constructor(private readonly patientsRepository: PatientsRepository) {}

    async createPatient(data: CreatePatientInput) {
        const existingPatient = await this.patientsRepository.getPatientByUserId(data.userId);

        if (existingPatient) {
            throw new DomainError("PATIENT_ALREADY_EXISTS", "Patient already exists for this user");
        }

        return this.patientsRepository.createPatient(data);
    }

    async getPatientByUserId(userId: string) {
        return this.patientsRepository.getPatientByUserId(userId);
    }

    async getPatientById(patientId: string) {
        const patient = await this.patientsRepository.getPatientById(patientId);

        if (!patient) {
            throw new DomainError("PATIENT_NOT_FOUND", "Patient not found");
        }

        return patient;
    }
}
