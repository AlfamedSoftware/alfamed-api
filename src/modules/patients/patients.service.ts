import type {
    CreatePatientFullCreateInput,
    CreatePatientInput,
    PatientsRepository,
} from "./patients.repository.js";
import { DomainError } from "../../http/plugins/domain-error.js";
import { hash } from "bcryptjs";
import type { z } from "zod";
import { patientFullUpdateSchema } from "./patients.schemas.js";

export class PatientsService {
    constructor(private readonly patientsRepository: PatientsRepository) {}

    async createPatient(data: CreatePatientInput) {
        const existingPatient = await this.patientsRepository.getPatientByUserId(data.userId);

        if (existingPatient) {
            throw new DomainError("PATIENT_ALREADY_EXISTS", "Patient already exists for this user");
        }

        return this.patientsRepository.createPatient(data);
    }

    async getPatientById(patientId: string) {
        const patient = await this.patientsRepository.getPatientById(patientId);

        if (!patient) {
            throw new DomainError("PATIENT_NOT_FOUND", "Patient not found");
        }

        return patient;
    }

    async createPatientFullCreate(data: CreatePatientFullCreateInput) {
        return this.patientsRepository.createPatientFullCreate(data);
    }
    async fullUpdate(requestUserId: string, data: z.infer<typeof patientFullUpdateSchema>) {
        const normalizedEmail = data.email?.trim().toLowerCase();
        const normalizedCpf = data.cpf?.trim();
        const normalizedName = data.name?.trim();
        const normalizedPhone = data.phone?.trim();
        const normalizedSocialName = data.socialName?.trim?.();

        if (normalizedEmail) {
            const existingByEmail = await this.patientsRepository.findUserByEmail(normalizedEmail);

            if (existingByEmail && existingByEmail.id !== data.userId) {
                throw new DomainError("EMAIL_ALREADY_EXISTS", "Email already exists");
            }
        }

        if (normalizedCpf) {
            const existingByCpf = await this.patientsRepository.findUserByCpf(normalizedCpf);

            if (existingByCpf && existingByCpf.id !== data.userId) {
                throw new DomainError("CPF_ALREADY_EXISTS", "CPF already exists");
            }
        }

        const userChanges: Record<string, unknown> = {};

        if (normalizedName) userChanges.name = normalizedName;
        if (typeof data.socialName !== "undefined") userChanges.socialName = normalizedSocialName ?? null;
        if (normalizedEmail) userChanges.email = normalizedEmail;
        if (normalizedCpf) userChanges.cpf = normalizedCpf;
        if (data.birthdate) userChanges.birthdate = new Date(data.birthdate);
        if (normalizedPhone) userChanges.phone = normalizedPhone;
        if (typeof data.sex !== "undefined") userChanges.sex = data.sex ?? null;

        const patientChanges: Record<string, unknown> = {};
        if (typeof data.patientStatus !== "undefined") patientChanges.isActive = data.patientStatus;

        let accountPasswordHash: string | undefined;

        if (data.password && data.password.trim().length > 0) {
            accountPasswordHash = await hash(data.password.trim(), 12);
        }

        await this.patientsRepository.applyFullUpdate({
            userId: data.userId,
            patientId: data.patientId,
            userChanges,
            patientChanges,
            accountPasswordHash,
        });

        const updated = await this.patientsRepository.getPatientFullDataByUserId(data.userId);

        if (!updated) {
            throw new DomainError("PATIENT_NOT_FOUND", "Patient not found");
        }

        return updated;
    }

    async getPatientFullDataByUserId(userId: string) {
        const patient = await this.patientsRepository.getPatientFullDataByUserId(userId);

        if (!patient) {
            throw new DomainError("PATIENT_NOT_FOUND", "Patient not found");
        }

        return patient;
    }
}
