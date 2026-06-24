import type {
    CreateProfessionalInput,
    ProfessionalsRepository,
    UpdateProfessionalInput,
} from "./professionals.repository.js";
import type { UsersRepository } from "../users/users.repository.js";
import type { PatientsRepository } from "../patients/patients.repository.js";
import { assertUserHasUnitAccess } from "../../http/plugins/unit-access.js";
import { DomainError } from "../../http/plugins/domain-error.js";

export class ProfessionalsService {
    constructor(
        private readonly professionalsRepository: ProfessionalsRepository,
        private readonly usersRepository: UsersRepository,
        private readonly patientsRepository: PatientsRepository,
        private readonly hasUserAccessToUnitChecker: (userId: string, unitId: string) => Promise<boolean>,
    ) { }

    async createProfessional(requestUserId: string, unitId: string, data: CreateProfessionalInput) {
        await assertUserHasUnitAccess(requestUserId, unitId, this.hasUserAccessToUnitChecker);

        return this.professionalsRepository.createWithUnit(data, unitId);
    }

    async createProfessionalForUser(data: CreateProfessionalInput) {
        return this.professionalsRepository.create(data);
    }

    async getProfessionalById(requestUserId: string, professionalId: string, unitId: string) {
        await assertUserHasUnitAccess(requestUserId, unitId, this.hasUserAccessToUnitChecker);

        const existsInUnit = await this.professionalsRepository.findByIdAndUnit(professionalId, unitId);

        if (!existsInUnit) {
            throw new DomainError("PROFESSIONAL_NOT_FOUND", "Professional not found");
        }

        const professional = await this.professionalsRepository.findDetailById(professionalId);

        if (!professional) {
            throw new DomainError("PROFESSIONAL_NOT_FOUND", "Professional not found");
        }

        return professional;
    }

    async listProfessionals(requestUserId: string, unitId: string) {
        await assertUserHasUnitAccess(requestUserId, unitId, this.hasUserAccessToUnitChecker);

        return this.professionalsRepository.listByUnit(unitId);
    }

    async getProfessionalByUserCpf(requestUserId: string, unitId: string, cpf: string): Promise<Record<string, never> | {
        userId: string;
        name: string;
        socialName: string | null;
        cpf: string;
        professionalId: string;
        patientId: string;
        professionalUnitId: string;
    }> {
        await assertUserHasUnitAccess(requestUserId, unitId, this.hasUserAccessToUnitChecker);

        const normalizedCpf = cpf.trim();
        const user = await this.usersRepository.findByCpf(normalizedCpf);

        if (!user) {
            return {};
        }

        const professional = await this.professionalsRepository.findByUserId(user.id);
        const patient = await this.patientsRepository.getPatientByUserId(user.id);

        let professionalUnitId = "";

        if (professional) {
            const professionalUnit = await this.professionalsRepository.findProfessionalUnitByProfessionalAndUnit(
                professional.id,
                unitId,
            );
            professionalUnitId = professionalUnit?.id ?? "";
        }

        return {
            userId: user.id,
            name: user.name,
            socialName: user.socialName ?? null,
            cpf: user.cpf,
            professionalId: professional?.id ?? "",
            patientId: patient?.id ?? "",
            professionalUnitId,
        };
    }

    async getProfessionalsByUserName(requestUserId: string, unitId: string, name: string) {
        await assertUserHasUnitAccess(requestUserId, unitId, this.hasUserAccessToUnitChecker);

        return this.professionalsRepository.findManyByUserName(name.trim(), unitId);
    }

    async updateProfessional(
        requestUserId: string,
        professionalId: string,
        unitId: string,
        data: UpdateProfessionalInput,
    ) {
        await assertUserHasUnitAccess(requestUserId, unitId, this.hasUserAccessToUnitChecker);

        const existingProfessional = await this.professionalsRepository.findByIdAndUnit(professionalId, unitId);

        if (!existingProfessional) {
            throw new DomainError("PROFESSIONAL_NOT_FOUND", "Professional not found");
        }

        const updatedProfessional = await this.professionalsRepository.update(professionalId, data);

        if (!updatedProfessional) {
            throw new DomainError("PROFESSIONAL_NOT_FOUND", "Professional not found");
        }

        return updatedProfessional;
    }

}
