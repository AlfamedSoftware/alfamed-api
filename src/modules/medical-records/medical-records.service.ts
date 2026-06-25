import type { MedicalRecordsRepository } from "./medical-records.repository.js";
import { listPatientMedicalRecordsResponseSchema } from "./medical-records.schemas.js";

export class PatientNotFoundError extends Error {
    constructor() {
        super("PATIENT_NOT_FOUND");
        this.name = "PatientNotFoundError";
    }
}

export class MedicalRecordsService {
    constructor(private readonly medicalRecordsRepository: MedicalRecordsRepository) { }

    async listPatientMedicalRecords(userId: string) {
        const patient = await this.medicalRecordsRepository.findActivePatientByUserId(userId);

        if (!patient) {
            throw new PatientNotFoundError();
        }

        const rows = await this.medicalRecordsRepository.listMedicalRecordsByPatientId(patient.id);
        const { users } = patient;

        return listPatientMedicalRecordsResponseSchema.parse({
            id: users.id,
            name: users.name,
            socialName: users.socialName,
            email: users.email,
            phone: users.phone,
            cpf: users.cpf,
            birthdate: users.birthdate.toISOString(),
            sex: users.sex,
            isActive: users.isActive,
            appointments: rows.map((row) => ({
                id: row.id,
                patientId: row.patientId,
                professionalUnitId: row.professionalUnitId,
                scheduleSlotId: row.scheduleSlotId,
                startAt: row.startAt?.toISOString() ?? null,
                endAt: row.endAt?.toISOString() ?? null,
                diagnostics: row.diagnostics,
                evolution: row.evolution,
                clinicNotes: row.clinicNotes,
                statusId: row.statusId,
                isActive: row.isActive,
                createdAt: row.createdAt.toISOString(),
                updatedAt: row.updatedAt.toISOString(),
                schedules: row.schedules,
                schedule_slots: row.schedule_slots,
                appointment_status: row.appointment_status,
                specialties: row.specialties,
                procedures: row.procedures,
                units: row.units,
                professionals: row.professionals,
                professional_user: row.professional_user,
            })),
        });
    }
}
