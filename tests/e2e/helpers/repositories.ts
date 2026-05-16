import type { UserProfile, UsersRepository } from "../../../src/modules/users/users.repository";
import type {
    CreateProfessionalInput,
    LinkProfessionalUnitRoleInput,
    ProfessionalProfile,
    ProfessionalUnitRoleProfile,
    ProfessionalsRepository,
    UpdateProfessionalUnitRoleInput,
    UpdateProfessionalInput,
} from "../../../src/modules/professionals/professionals.repository";
import type {
    CreateUnitInput,
    UnitProfile,
    UnitsRepository,
    UpdateUnitInput,
} from "../../../src/modules/units/units.repository";
import type {
    CreatePatientInput,
    Patient,
    PatientsRepository,
} from "../../../src/modules/patients/patients.repository";
import type {
    CreateProfessionalUnitInput as CreateProfessionalUnitLinkInput,
    ProfessionalUnitFullData,
    ProfessionalUnitFullDataByUnit,
    ProfessionalUnitProfile as ProfessionalUnitLinkProfile,
    ProfessionalUnitsRepository,
} from "../../../src/modules/professional-units/professional-units.repository";
// Appointments and Specialties modules removed from project; related in-memory helpers removed.
import { DomainError } from "../../../src/http/plugins/domain-error";

export class InMemoryUsersRepository implements UsersRepository {
    constructor(private readonly users: Record<string, UserProfile> = {}) { }

    async getUserById(userId: string): Promise<UserProfile | null> {
        return this.users[userId] ?? null;
    }
}

export class InMemoryPatientsRepository implements PatientsRepository {
    private readonly patients: Record<string, Patient>;
    private sequence = 1;

    constructor(initialPatients: Record<string, Patient> = {}) {
        this.patients = { ...initialPatients };
    }

    async createPatient(data: CreatePatientInput): Promise<Patient> {
        const now = new Date().toISOString();
        const id = `019c1a3e-e425-7000-8bda-cdfec32c7f${String(this.sequence).padStart(2, "0")}`;
        this.sequence += 1;

        const patient: Patient = {
            id,
            userId: data.userId,
            isActive: data.isActive ?? true,
            createdAt: now,
            updatedAt: now,
        };

        this.patients[id] = patient;
        return patient;
    }

    async getPatientByUserId(userId: string): Promise<Patient | null> {
        for (const patientId in this.patients) {
            const patient = this.patients[patientId] as Patient & { userId: string };
            if (patient.userId === userId) {
                return patient as Patient;
            }
        }

        return null;
    }

    async getPatientById(patientId: string): Promise<Patient | null> {
        return this.patients[patientId] ?? null;
    }
}

export class InMemoryProfessionalUnitsRepository implements ProfessionalUnitsRepository {
    private readonly professionalUnits: Record<string, ProfessionalUnitLinkProfile>;
    private readonly fullDataByProfessionalUnitId: Record<string, ProfessionalUnitFullData>;
    private readonly professionals: Set<string>;
    private sequence = 1;

    constructor(args?: {
        professionalUnits?: Record<string, ProfessionalUnitLinkProfile>;
        fullDataByProfessionalUnitId?: Record<string, ProfessionalUnitFullData>;
        professionalIds?: string[];
    }) {
        this.professionalUnits = { ...(args?.professionalUnits ?? {}) };
        this.fullDataByProfessionalUnitId = { ...(args?.fullDataByProfessionalUnitId ?? {}) };
        this.professionals = new Set(args?.professionalIds ?? []);
    }

    async create(data: CreateProfessionalUnitLinkInput): Promise<ProfessionalUnitLinkProfile> {
        const now = new Date().toISOString();
        const id = `019c1a3e-e425-7000-8bda-cdfec32d2f${String(this.sequence).padStart(2, "0")}`;
        this.sequence += 1;

        const professionalUnit: ProfessionalUnitLinkProfile = {
            id,
            professionalId: data.professionalId,
            unitId: data.unitId,
            isActive: data.isActive ?? true,
            createdAt: now,
            updatedAt: now,
        };

        this.professionalUnits[id] = professionalUnit;
        this.professionals.add(data.professionalId);

        return professionalUnit;
    }

    async findFullDataByIdAndUnit(
        professionalUnitId: string,
        unitId: string,
    ): Promise<ProfessionalUnitFullData | null> {
        const professionalUnit = this.professionalUnits[professionalUnitId];

        if (!professionalUnit || professionalUnit.unitId !== unitId) {
            return null;
        }

        const fullData = this.fullDataByProfessionalUnitId[professionalUnitId] ?? {
            id: professionalUnit.id,
            isActive: professionalUnit.isActive,
            professionals: {
                id: professionalUnit.professionalId,
                isActive: true,
            },
        };

        return fullData;
    }

    async listFullDataByUnit(unitId: string): Promise<ProfessionalUnitFullDataByUnit[]> {
        return Object.values(this.professionalUnits)
            .filter((professionalUnit) => professionalUnit.unitId === unitId)
            .map((professionalUnit) => {
                const fullData = this.fullDataByProfessionalUnitId[professionalUnit.id] ?? {
                    id: professionalUnit.id,
                    isActive: professionalUnit.isActive,
                    professionals: {
                        id: professionalUnit.professionalId,
                        isActive: true,
                        crm: "",
                    },
                };

                return {
                    id: fullData.id,
                    isActive: fullData.isActive,
                    users: fullData.users,
                    professionals: fullData.professionals,
                    roles: fullData.roles,
                };
            });
    }

    async findByIdAndUnit(
        professionalUnitId: string,
        unitId: string,
    ): Promise<ProfessionalUnitLinkProfile | null> {
        const professionalUnit = this.professionalUnits[professionalUnitId];

        if (!professionalUnit || professionalUnit.unitId !== unitId) {
            return null;
        }

        return professionalUnit;
    }

    async findByProfessionalIdAndUnitId(
        professionalId: string,
        unitId: string,
    ): Promise<ProfessionalUnitLinkProfile | null> {
        return (
            Object.values(this.professionalUnits).find(
                (professionalUnit) =>
                    professionalUnit.professionalId === professionalId &&
                    professionalUnit.unitId === unitId,
            ) ?? null
        );
    }

    async professionalExists(professionalId: string): Promise<boolean> {
        return this.professionals.has(professionalId);
    }
}

export class InMemoryUnitsRepository implements UnitsRepository {
    private readonly units: Record<string, UnitProfile>;
    private readonly userUnits: Record<string, string[]>;
    private readonly userIsActive: Record<string, boolean>;
    private readonly professionalIsActiveByUser: Record<string, boolean>;
    private sequence = 1;

    constructor(
        initialUnits: Record<string, UnitProfile> = {},
        initialUserUnits: Record<string, string[]> = {},
        initialUserIsActive: Record<string, boolean> = {},
        initialProfessionalIsActiveByUser: Record<string, boolean> = {},
    ) {
        this.units = { ...initialUnits };
        this.userUnits = { ...initialUserUnits };
        this.userIsActive = { ...initialUserIsActive };
        this.professionalIsActiveByUser = { ...initialProfessionalIsActiveByUser };
    }

    async create(data: CreateUnitInput): Promise<UnitProfile> {
        const now = new Date().toISOString();
        const id = `019c1a3e-e425-7000-8bda-cdfec32c9f${String(this.sequence).padStart(2, "0")}`;
        this.sequence += 1;

        const unit: UnitProfile = {
            id,
            name: data.name,
            cnpj: data.cnpj ?? null,
            address: data.address ?? null,
            city: data.city ?? null,
            state: data.state ?? null,
            phone: data.phone ?? null,
            email: data.email ?? null,
            ownerUserId: data.ownerUserId ?? null,
            isActive: data.isActive ?? true,
            createdAt: now,
            updatedAt: now,
        };

        this.units[id] = unit;
        return unit;
    }

    async createForUser(_: string, data: CreateUnitInput): Promise<UnitProfile> {
        return this.create(data);
    }

    async findById(unitId: string): Promise<UnitProfile | null> {
        return this.units[unitId] ?? null;
    }

    async listByUserId(userId: string): Promise<UnitProfile[]> {
        if (this.userIsActive[userId] === false) {
            return [];
        }

        if (this.professionalIsActiveByUser[userId] === false) {
            return [];
        }

        const unitIds = this.userUnits[userId] ?? [];

        return unitIds
            .map((unitId) => this.units[unitId])
            .filter((unit): unit is UnitProfile => unit !== undefined)
            .filter((unit) => unit.isActive);
    }

    async update(unitId: string, data: UpdateUnitInput): Promise<UnitProfile | null> {
        const current = this.units[unitId];

        if (!current) {
            return null;
        }

        const updated: UnitProfile = {
            ...current,
            name: data.name ?? current.name,
            cnpj: data.cnpj ?? current.cnpj,
            address: data.address ?? current.address,
            city: data.city ?? current.city,
            state: data.state ?? current.state,
            phone: data.phone ?? current.phone,
            email: data.email ?? current.email,
            ownerUserId:
                data.ownerUserId === undefined
                    ? current.ownerUserId
                    : data.ownerUserId,
            isActive: data.isActive ?? current.isActive,
            updatedAt: new Date().toISOString(),
        };

        this.units[unitId] = updated;
        return updated;
    }

    async delete(unitId: string): Promise<void> {
        delete this.units[unitId];
    }
}

export class InMemoryProfessionalsRepository implements ProfessionalsRepository {
    private readonly professionals: Record<string, ProfessionalProfile>;
    private readonly professionalsUnits: Record<string, string[]>;
    private readonly professionalUnitsById: Record<string, { id: string; professionalId: string; unitId: string }>;
    private readonly roles: Record<string, { id: string; description: string; key: string; isActive: boolean }>;
    private readonly professionalUnitRoles: Record<string, ProfessionalUnitRoleProfile>;
    private sequence = 1;
    private roleSequence = 1;

    constructor(
        initialProfessionals: Record<string, ProfessionalProfile> = {},
        initialProfessionalsUnits: Record<string, string[]> = {},
        args?: {
            professionalUnitsById?: Record<string, { id: string; professionalId: string; unitId: string }>;
            roles?: Record<string, { id: string; description: string; key: string; isActive: boolean }>;
            professionalUnitRoles?: Record<string, ProfessionalUnitRoleProfile>;
        },
    ) {
        this.professionals = { ...initialProfessionals };
        this.professionalsUnits = { ...initialProfessionalsUnits };
        this.professionalUnitsById = { ...(args?.professionalUnitsById ?? {}) };
        this.roles = { ...(args?.roles ?? {}) };
        this.professionalUnitRoles = { ...(args?.professionalUnitRoles ?? {}) };
    }

    async create(data: CreateProfessionalInput): Promise<ProfessionalProfile> {
        const now = new Date().toISOString();
        const id = `019c1a3e-e425-7000-8bda-cdfec32c8f${String(this.sequence).padStart(2, "0")}`;
        this.sequence += 1;

        const professional: ProfessionalProfile = {
            id,
            userId: data.userId,
            isActive: data.isActive ?? true,
            createdAt: now,
            updatedAt: now,
        };

        this.professionals[id] = professional;
        return professional;
    }

    async createWithUnit(
        data: CreateProfessionalInput,
        unitId: string,
    ): Promise<{ professional: ProfessionalProfile; professionalUnitId: string }> {
        const professional = await this.create(data);
        const professionalUnitId = `019c1a3e-e425-7000-8bda-cdfec32d0f${String(this.roleSequence).padStart(2, "0")}`;
        this.roleSequence += 1;

        this.professionalUnitsById[professionalUnitId] = {
            id: professionalUnitId,
            professionalId: professional.id,
            unitId,
        };
        this.professionalsUnits[professional.id] = [...(this.professionalsUnits[professional.id] ?? []), unitId];

        return { professional, professionalUnitId };
    }

    async findById(professionalId: string): Promise<ProfessionalProfile | null> {
        return this.professionals[professionalId] ?? null;
    }

    async findByIdAndUnit(professionalId: string, unitId: string): Promise<ProfessionalProfile | null> {
        const professional = this.professionals[professionalId];

        if (!professional) {
            return null;
        }

        return (this.professionalsUnits[professionalId] ?? []).includes(unitId)
            ? professional
            : null;
    }

    async findDetailById(professionalId: string): Promise<any | null> {
        const professional = this.professionals[professionalId];

        if (!professional) {
            return null;
        }

        return {
            ...professional,
            users: [
                {
                    id: professional.userId,
                    name: "Mock User",
                    email: "mock@example.com",
                },
            ],
        };
    }

    async list(): Promise<ProfessionalProfile[]> {
        return Object.values(this.professionals);
    }

    async listByUnit(unitId: string): Promise<ProfessionalProfile[]> {
        return Object.values(this.professionals).filter((professional) =>
            (this.professionalsUnits[professional.id] ?? []).includes(unitId),
        );
    }

    async update(professionalId: string, data: UpdateProfessionalInput): Promise<ProfessionalProfile | null> {
        const current = this.professionals[professionalId];

        if (!current) {
            return null;
        }

        const updated: ProfessionalProfile = {
            ...current,
            userId: data.userId ?? current.userId,
            isActive: data.isActive ?? current.isActive,
            updatedAt: new Date().toISOString(),
        };

        this.professionals[professionalId] = updated;
        return updated;
    }

    async delete(professionalId: string): Promise<void> {
        delete this.professionals[professionalId];
    }

    async listUnitIdsByUserId(userId: string): Promise<string[]> {
        const profIds = Object.keys(this.professionals).filter((id) => this.professionals[id].userId === userId);
        const unitIds = new Set<string>();

        for (const profId of profIds) {
            const units = this.professionalsUnits[profId] ?? [];
            units.forEach((u) => unitIds.add(u));
        }

        return Array.from(unitIds);
    }

    async listActiveRolesByProfessionalUnit(userId: string, unitId: string, professionalUnitId: string): Promise<any[]> {
        return [];
    }

    async findProfessionalUnitByIdAndUnit(
        professionalUnitId: string,
        unitId: string,
    ): Promise<{ id: string } | null> {
        const professionalUnit = this.professionalUnitsById[professionalUnitId];

        if (!professionalUnit || professionalUnit.unitId !== unitId) {
            return null;
        }

        return { id: professionalUnit.id };
    }

    async hasActiveRole(roleId: string): Promise<boolean> {
        return this.roles[roleId]?.isActive === true;
    }

    async findProfessionalUnitRoleByIdAndUnit(
        professionalUnitRoleId: string,
        unitId: string,
    ): Promise<ProfessionalUnitRoleProfile | null> {
        const link = this.professionalUnitRoles[professionalUnitRoleId];
        const professionalUnit = link ? this.professionalUnitsById[link.professionalUnitId] : undefined;

        if (!link || professionalUnit?.unitId !== unitId) {
            return null;
        }

        return link;
    }

    async linkProfessionalUnitRole(data: LinkProfessionalUnitRoleInput): Promise<ProfessionalUnitRoleProfile> {
        const existingLink = Object.values(this.professionalUnitRoles).find(
            (link) => link.professionalUnitId === data.professionalUnitId && link.roleId === data.roleId,
        );
        const role = this.roles[data.roleId];

        if (!role) {
            throw new DomainError("ROLE_NOT_FOUND", "Role not found");
        }

        const now = new Date().toISOString();

        if (existingLink) {
            const updated = {
                ...existingLink,
                isActive: data.isActive ?? true,
                updatedAt: now,
            };
            this.professionalUnitRoles[updated.id] = updated;
            return updated;
        }

        const id = `019c1a3e-e425-7000-8bda-cdfec32d1f${String(this.roleSequence).padStart(2, "0")}`;
        this.roleSequence += 1;

        const link: ProfessionalUnitRoleProfile = {
            id,
            professionalUnitId: data.professionalUnitId,
            roleId: data.roleId,
            isActive: data.isActive ?? true,
            role: {
                id: role.id,
                description: role.description,
                key: role.key,
            },
            createdAt: now,
            updatedAt: now,
        };

        this.professionalUnitRoles[id] = link;
        return link;
    }

    async updateProfessionalUnitRole(
        professionalUnitRoleId: string,
        data: Omit<UpdateProfessionalUnitRoleInput, "professionalUnitRoleId">,
    ): Promise<ProfessionalUnitRoleProfile | null> {
        const current = this.professionalUnitRoles[professionalUnitRoleId];

        if (!current) {
            return null;
        }

        const role = data.roleId ? this.roles[data.roleId] : current.role;

        if (!role) {
            throw new DomainError("ROLE_NOT_FOUND", "Role not found");
        }

        const updated: ProfessionalUnitRoleProfile = {
            ...current,
            roleId: role.id,
            isActive: data.isActive ?? current.isActive,
            role: {
                id: role.id,
                description: role.description,
                key: role.key,
            },
            updatedAt: new Date().toISOString(),
        };

        this.professionalUnitRoles[professionalUnitRoleId] = updated;
        return updated;
    }
}

type InMemoryRequestContext = {
    id: string;
    appointmentId: string;
    status: string;
    type: string;
    patientUserId: string;
    unitId: string;
    professionalId: string;
    scheduleId: string;
};



export class InMemorySpecialtiesRepository implements SpecialtiesRepository {
    private readonly specialties: Record<string, SpecialtyProfile>;
    private readonly professionalUnitByProfessionalId: Record<string, string>;
    private readonly links = new Set<string>();
    private sequence = 1;

    constructor(args?: {
        specialties?: Record<string, SpecialtyProfile>;
        professionalUnitByProfessionalId?: Record<string, string>;
        links?: Array<{ professionalId: string; specialtyId: string }>;
    }) {
        this.specialties = { ...(args?.specialties ?? {}) };
        this.professionalUnitByProfessionalId = { ...(args?.professionalUnitByProfessionalId ?? {}) };
        args?.links?.forEach((item) => this.links.add(`${item.professionalId}:${item.specialtyId}`));
    }

    async create(data: CreateSpecialtyInput): Promise<SpecialtyProfile> {
        const now = new Date().toISOString();
        const id = `019c1a3e-e425-7000-8bda-cdfec32e1f${String(this.sequence).padStart(2, "0")}`;
        this.sequence += 1;

        const exists = Object.values(this.specialties).some(
            (specialty) => specialty.name.toLowerCase() === data.name.toLowerCase(),
        );

        if (exists) {
            const error = new Error("duplicate") as Error & { code?: string };
            error.code = "23505";
            throw error;
        }

        const specialty: SpecialtyProfile = {
            id,
            name: data.name,
            isActive: data.isActive ?? true,
            createdAt: now,
            updatedAt: now,
        };

        this.specialties[id] = specialty;
        return specialty;
    }

    async findById(specialtyId: string): Promise<SpecialtyProfile | null> {
        return this.specialties[specialtyId] ?? null;
    }

    async list(): Promise<SpecialtyProfile[]> {
        return Object.values(this.specialties);
    }

    async update(specialtyId: string, data: UpdateSpecialtyInput): Promise<SpecialtyProfile | null> {
        const current = this.specialties[specialtyId];

        if (!current) {
            return null;
        }

        if (data.name) {
            const exists = Object.values(this.specialties).some(
                (specialty) =>
                    specialty.id !== specialtyId && specialty.name.toLowerCase() === data.name?.toLowerCase(),
            );
            if (exists) {
                const error = new Error("duplicate") as Error & { code?: string };
                error.code = "23505";
                throw error;
            }
        }

        const updated: SpecialtyProfile = {
            ...current,
            name: data.name ?? current.name,
            isActive: data.isActive ?? current.isActive,
            updatedAt: new Date().toISOString(),
        };

        this.specialties[specialtyId] = updated;
        return updated;
    }

    async delete(specialtyId: string): Promise<void> {
        delete this.specialties[specialtyId];
    }

    async findProfessionalByIdAndUnit(professionalId: string, unitId: string): Promise<{ id: string } | null> {
        return this.professionalUnitByProfessionalId[professionalId] === unitId ? { id: professionalId } : null;
    }

    async linkProfessionalSpecialty(professionalId: string, specialtyId: string): Promise<void> {
        const key = `${professionalId}:${specialtyId}`;
        if (this.links.has(key)) {
            const error = new Error("duplicate") as Error & { code?: string };
            error.code = "23505";
            throw error;
        }
        this.links.add(key);
    }

    async unlinkProfessionalSpecialty(professionalId: string, specialtyId: string): Promise<boolean> {
        const key = `${professionalId}:${specialtyId}`;
        const hasLink = this.links.has(key);
        if (hasLink) {
            this.links.delete(key);
        }
        return hasLink;
    }

    async listByProfessionalAndUnit(professionalId: string, unitId: string): Promise<SpecialtyProfile[]> {
        if (this.professionalUnitByProfessionalId[professionalId] !== unitId) {
            return [];
        }

        const specialtyIds = [...this.links]
            .filter((key) => key.startsWith(`${professionalId}:`))
            .map((key) => key.split(":")[1]);

        return specialtyIds
            .map((id) => this.specialties[id])
            .filter((specialty): specialty is SpecialtyProfile => !!specialty);
    }
}
