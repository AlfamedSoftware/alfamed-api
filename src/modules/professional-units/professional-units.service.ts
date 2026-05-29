import { DomainError } from "../../http/plugins/domain-error.js";
import { assertUserHasUnitAccess } from "../../http/plugins/unit-access.js";
import { hash } from "bcryptjs";
import type {
    CreateProfessionalUnitInput,
    FullUpdateChanges,
    ProfileUpdateChanges,
    ProfessionalUnitsRepository,
} from "./professional-units.repository.js";
import {
    createProfessionalUnitFullCreateSchema,
    professionalUnitFullUpdateSchema,
    professionalUnitProfileUpdateSchema,
} from "./professional-units.schemas.js";
import type { z } from "zod";

type ProfileUpdateInput = z.infer<typeof professionalUnitProfileUpdateSchema>;
type FullUpdateInput = z.infer<typeof professionalUnitFullUpdateSchema>;
type FullCreateInput = z.infer<typeof createProfessionalUnitFullCreateSchema>;

export class ProfessionalUnitsService {
    constructor(
        private readonly professionalUnitsRepository: ProfessionalUnitsRepository,
        private readonly hasUserAccessToUnitChecker: (userId: string, unitId: string) => Promise<boolean>,
    ) {}

    async createProfessionalUnit(
        requestUserId: string,
        data: CreateProfessionalUnitInput,
    ) {
        await assertUserHasUnitAccess(requestUserId, data.unitId, this.hasUserAccessToUnitChecker);

        const professionalExists = await this.professionalUnitsRepository.professionalExists(data.professionalId);

        if (!professionalExists) {
            throw new DomainError("PROFESSIONAL_NOT_FOUND", "Professional not found");
        }

        const existingProfessionalUnit = await this.professionalUnitsRepository.findByProfessionalIdAndUnitId(
            data.professionalId,
            data.unitId,
        );

        if (existingProfessionalUnit) {
            throw new DomainError("PROFESSIONAL_UNIT_ALREADY_EXISTS", "Professional unit already exists");
        }

        return this.professionalUnitsRepository.create(data);
    }

    async createProfessionalUnitFullCreate(
        requestUserId: string,
        unitId: string,
        data: FullCreateInput,
    ) {
        await assertUserHasUnitAccess(requestUserId, unitId, this.hasUserAccessToUnitChecker);

        return this.professionalUnitsRepository.createFullCreate(unitId, data);
    }

    async getProfessionalUnitById(
        requestUserId: string,
        unitId: string,
        professionalUnitId: string,
    ) {
        await assertUserHasUnitAccess(requestUserId, unitId, this.hasUserAccessToUnitChecker);

        const professionalUnit = await this.professionalUnitsRepository.findByIdAndUnit(
            professionalUnitId,
            unitId,
        );

        if (!professionalUnit) {
            throw new DomainError("PROFESSIONAL_UNIT_NOT_FOUND", "Professional unit not found");
        }

        return professionalUnit;
    }

    async getProfessionalUnitFullDataById(
        requestUserId: string,
        unitId: string,
        professionalUnitId: string,
    ) {
        await assertUserHasUnitAccess(requestUserId, unitId, this.hasUserAccessToUnitChecker);

        const professionalUnit = await this.professionalUnitsRepository.findFullDataByIdAndUnit(
            professionalUnitId,
            unitId,
        );

        if (!professionalUnit) {
            throw new DomainError("PROFESSIONAL_UNIT_NOT_FOUND", "Professional unit not found");
        }

        return professionalUnit;
    }

    async listProfessionalUnitFullDataByUnit(requestUserId: string, unitId: string) {
        await assertUserHasUnitAccess(requestUserId, unitId, this.hasUserAccessToUnitChecker);

        return this.professionalUnitsRepository.listFullDataByUnit(unitId);
    }

    async profileUpdate(
        requestUserId: string,
        unitId: string,
        data: ProfileUpdateInput,
    ) {
        await assertUserHasUnitAccess(requestUserId, unitId, this.hasUserAccessToUnitChecker);

        const target = await this.professionalUnitsRepository.findProfileUpdateTarget(
            unitId,
            data.userId,
            data.professionalId,
        );

        if (!target) {
            throw new DomainError("PROFESSIONAL_UNIT_NOT_FOUND", "Professional unit not found");
        }

        const normalizedEmail = data.email?.trim().toLowerCase();
        const normalizedCpf = data.cpf?.trim();

        if (normalizedEmail && normalizedEmail !== target.user.email) {
            const existingByEmail = await this.professionalUnitsRepository.findUserByEmail(normalizedEmail);

            if (existingByEmail && existingByEmail.id !== data.userId) {
                throw new DomainError("EMAIL_ALREADY_EXISTS", "Email already exists");
            }
        }

        if (normalizedCpf && normalizedCpf !== target.user.cpf) {
            const existingByCpf = await this.professionalUnitsRepository.findUserByCpf(normalizedCpf);

            if (existingByCpf && existingByCpf.id !== data.userId) {
                throw new DomainError("CPF_ALREADY_EXISTS", "CPF already exists");
            }
        }

        const userChanges: ProfileUpdateChanges["userChanges"] = {};
        if (data.name !== undefined && data.name !== target.user.name) userChanges.name = data.name;
        if (data.socialName !== undefined && data.socialName !== target.user.socialName)
            userChanges.socialName = data.socialName;
        if (normalizedEmail !== undefined && normalizedEmail !== target.user.email) userChanges.email = normalizedEmail;
        if (data.phone !== undefined && data.phone !== target.user.phone) userChanges.phone = data.phone;
        if (normalizedCpf !== undefined && normalizedCpf !== target.user.cpf) userChanges.cpf = normalizedCpf;
        if (data.sex !== undefined && data.sex !== target.user.sex) userChanges.sex = data.sex;

        if (data.birthdate !== undefined) {
            const nextBirthdateIso = new Date(data.birthdate).toISOString();
            const currentBirthdateIso = target.user.birthdate.toISOString();

            if (nextBirthdateIso !== currentBirthdateIso) {
                userChanges.birthdate = new Date(data.birthdate);
            }
        }

        const crmState = data.crmState?.trim().toUpperCase();
        const crmNumber = data.crmNumber?.trim();
        const shouldUpdateCrm = crmState !== undefined && crmNumber !== undefined;
        const nextCrm = shouldUpdateCrm ? `${crmState}${crmNumber}` : undefined;

        const professionalChanges: ProfileUpdateChanges["professionalChanges"] = {};
        if (nextCrm !== undefined && nextCrm !== target.professional.crm) {
            professionalChanges.crm = nextCrm;
        }

        const accountPasswordHash = data.password
            ? await hash(data.password, 12)
            : undefined;

        const hasUserChanges = Object.keys(userChanges).length > 0;
        const hasProfessionalChanges = Object.keys(professionalChanges).length > 0;
        const hasAccountChanges = accountPasswordHash !== undefined;

        if (hasUserChanges || hasProfessionalChanges || hasAccountChanges) {
            await this.professionalUnitsRepository.applyProfileUpdate({
                userId: data.userId,
                professionalId: data.professionalId,
                userChanges,
                professionalChanges,
                accountPasswordHash,
            });
        }

        const updated = await this.professionalUnitsRepository.findFullDataByIdAndUnit(
            target.professionalUnitId,
            unitId,
        );

        if (!updated) {
            throw new DomainError("PROFESSIONAL_UNIT_NOT_FOUND", "Professional unit not found");
        }

        return updated;
    }

    async fullUpdate(
        requestUserId: string,
        unitId: string,
        data: FullUpdateInput,
    ) {
        await assertUserHasUnitAccess(requestUserId, unitId, this.hasUserAccessToUnitChecker);

        const target = await this.professionalUnitsRepository.findFullUpdateTarget(unitId, {
            userId: data.userId,
            professionalId: data.professionalId,
            professionalUnitId: data.professionalUnitId,
            professionalUnitRoleId: data.professionalUnitRoleId,
            patientId: data.patientId,
        });

        if (!target) {
            throw new DomainError("PROFESSIONAL_UNIT_NOT_FOUND", "Professional unit not found");
        }

        const normalizedEmail = data.email?.trim().toLowerCase();
        const normalizedCpf = data.cpf?.trim();

        if (normalizedEmail && normalizedEmail !== target.user.email) {
            const existingByEmail = await this.professionalUnitsRepository.findUserByEmail(normalizedEmail);

            if (existingByEmail && existingByEmail.id !== data.userId) {
                throw new DomainError("EMAIL_ALREADY_EXISTS", "Email already exists");
            }
        }

        if (normalizedCpf && normalizedCpf !== target.user.cpf) {
            const existingByCpf = await this.professionalUnitsRepository.findUserByCpf(normalizedCpf);

            if (existingByCpf && existingByCpf.id !== data.userId) {
                throw new DomainError("CPF_ALREADY_EXISTS", "CPF already exists");
            }
        }

        const userChanges: FullUpdateChanges["userChanges"] = {};
        if (data.name !== undefined && data.name !== target.user.name) userChanges.name = data.name;
        if (data.socialName !== undefined && data.socialName !== target.user.socialName)
            userChanges.socialName = data.socialName;
        if (normalizedEmail !== undefined && normalizedEmail !== target.user.email) userChanges.email = normalizedEmail;
        if (data.phone !== undefined && data.phone !== target.user.phone) userChanges.phone = data.phone;
        if (normalizedCpf !== undefined && normalizedCpf !== target.user.cpf) userChanges.cpf = normalizedCpf;
        if (data.sex !== undefined && data.sex !== target.user.sex) userChanges.sex = data.sex;

        if (data.birthdate !== undefined) {
            const nextBirthdateIso = new Date(data.birthdate).toISOString();
            const currentBirthdateIso = target.user.birthdate.toISOString();

            if (nextBirthdateIso !== currentBirthdateIso) {
                userChanges.birthdate = new Date(data.birthdate);
            }
        }

        const crmState = data.crmState?.trim().toUpperCase();
        const crmNumber = data.crmNumber?.trim();
        const shouldUpdateCrm = crmState !== undefined && crmNumber !== undefined;
        const nextCrm = shouldUpdateCrm ? `${crmState}${crmNumber}` : undefined;

        const professionalChanges: FullUpdateChanges["professionalChanges"] = {};
        if (nextCrm !== undefined && nextCrm !== target.professional.crm) {
            professionalChanges.crm = nextCrm;
        }

        const professionalUnitChanges: FullUpdateChanges["professionalUnitChanges"] = {};
        if (
            data.professionalUnitStatus !== undefined &&
            data.professionalUnitStatus !== target.professionalUnit.isActive
        ) {
            professionalUnitChanges.isActive = data.professionalUnitStatus;
        }

        const professionalUnitRoleChanges: FullUpdateChanges["professionalUnitRoleChanges"] = {};
        if (data.roleId !== target.professionalUnitRole.roleId) {
            const roleExists = await this.professionalUnitsRepository.roleExists(data.roleId);

            if (!roleExists) {
                throw new DomainError("ROLE_NOT_FOUND", "Role not found");
            }

            professionalUnitRoleChanges.roleId = data.roleId;
        }

        const patientChanges: FullUpdateChanges["patientChanges"] = {};
        if (data.patientStatus !== undefined && data.patientStatus !== target.patient.isActive) {
            patientChanges.isActive = data.patientStatus;
        }

        const normalizedPassword = data.password?.trim();
        const accountPasswordHash = normalizedPassword
            ? await hash(normalizedPassword, 12)
            : undefined;

        const hasChanges =
            Object.keys(userChanges).length > 0 ||
            Object.keys(professionalChanges).length > 0 ||
            Object.keys(professionalUnitChanges).length > 0 ||
            Object.keys(professionalUnitRoleChanges).length > 0 ||
            Object.keys(patientChanges).length > 0 ||
            accountPasswordHash !== undefined;

        if (hasChanges) {
            await this.professionalUnitsRepository.applyFullUpdate({
                userId: data.userId,
                professionalId: data.professionalId,
                professionalUnitId: data.professionalUnitId,
                professionalUnitRoleId: data.professionalUnitRoleId,
                patientId: data.patientId,
                userChanges,
                professionalChanges,
                professionalUnitChanges,
                professionalUnitRoleChanges,
                patientChanges,
                accountPasswordHash,
            });
        }

        const updated = await this.professionalUnitsRepository.findFullDataByIdAndUnit(
            data.professionalUnitId,
            unitId,
        );

        if (!updated) {
            throw new DomainError("PROFESSIONAL_UNIT_NOT_FOUND", "Professional unit not found");
        }

        return updated;
    }
}
