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
    FullUpdateChanges,
    ProfileUpdateChanges,
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

    async createFullCreate(unitId: string, data: {
        name: string;
        socialName?: string | null;
        email: string;
        cpf: string;
        birthdate: string;
        phone: string;
        sex: "M" | "F" | "O";
        crm: string;
        password: string;
        roleId: string;
        professionalUnitStatus?: boolean;
        patientStatus?: boolean;
    }): Promise<ProfessionalUnitFullData> {
        const now = new Date().toISOString();
        const userId = `019c1a3e-e425-7000-8bda-cdfec32d2e${String(this.sequence).padStart(2, "0")}`;
        const professionalId = `019c1a3e-e425-7000-8bda-cdfec32d2e${String(this.sequence + 1).padStart(2, "0")}`;
        const professionalUnitId = `019c1a3e-e425-7000-8bda-cdfec32d2e${String(this.sequence + 2).padStart(2, "0")}`;
        const roleLinkId = `019c1a3e-e425-7000-8bda-cdfec32d2e${String(this.sequence + 3).padStart(2, "0")}`;
        const patientId = `019c1a3e-e425-7000-8bda-cdfec32d2e${String(this.sequence + 4).padStart(2, "0")}`;
        this.sequence += 5;

        const professionalUnit: ProfessionalUnitLinkProfile = {
            id: professionalUnitId,
            professionalId,
            unitId,
            isActive: data.professionalUnitStatus ?? true,
            createdAt: now,
            updatedAt: now,
        };

        this.professionals.add(professionalId);
        this.professionalUnits[professionalUnitId] = professionalUnit;
        this.fullDataByProfessionalUnitId[professionalUnitId] = {
            id: professionalUnitId,
            isActive: professionalUnit.isActive,
            users: {
                id: userId,
                name: data.name,
                socialName: data.socialName ?? "",
                email: data.email,
                phone: data.phone,
                cpf: data.cpf,
                birthdate: data.birthdate,
                sex: data.sex,
                isActive: true,
            },
            professionals: {
                id: professionalId,
                crm: data.crm,
                isActive: true,
            },
            roles: {
                id: data.roleId,
                name: "Role",
                isActive: true,
            },
            professionalUnitRoles: {
                id: roleLinkId,
            },
            patients: {
                id: patientId,
                isActive: data.patientStatus ?? true,
            },
        };

        return this.fullDataByProfessionalUnitId[professionalUnitId];
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

    async findUserByEmail(email: string): Promise<{ id: string } | null> {
        for (const fullData of Object.values(this.fullDataByProfessionalUnitId)) {
            if (fullData.users?.email === email && fullData.users?.id) {
                return { id: fullData.users.id };
            }
        }

        return null;
    }

    async findUserByCpf(cpf: string): Promise<{ id: string } | null> {
        for (const fullData of Object.values(this.fullDataByProfessionalUnitId)) {
            if (fullData.users?.cpf === cpf && fullData.users?.id) {
                return { id: fullData.users.id };
            }
        }

        return null;
    }

    async roleExists(roleId: string): Promise<boolean> {
        for (const fullData of Object.values(this.fullDataByProfessionalUnitId)) {
            if (fullData.roles?.id === roleId) {
                return true;
            }
        }

        return false;
    }

    async findProfileUpdateTarget(
        unitId: string,
        userId: string,
        professionalId: string,
    ): Promise<{
        professionalUnitId: string;
        user: {
            id: string;
            name: string;
            socialName: string | null;
            email: string;
            phone: string;
            cpf: string;
            birthdate: Date;
            sex: "M" | "F" | null;
        };
        professional: {
            id: string;
            crm: string | null;
        };
    } | null> {
        const professionalUnit = Object.values(this.professionalUnits).find(
            (item) => item.unitId === unitId && item.professionalId === professionalId,
        );

        if (!professionalUnit) {
            return null;
        }

        const fullData = this.fullDataByProfessionalUnitId[professionalUnit.id];

        if (!fullData?.users || fullData.users.id !== userId || !fullData.professionals) {
            return null;
        }

        return {
            professionalUnitId: professionalUnit.id,
            user: {
                id: fullData.users.id,
                name: fullData.users.name,
                socialName: fullData.users.socialName ?? null,
                email: fullData.users.email,
                phone: fullData.users.phone,
                cpf: fullData.users.cpf,
                birthdate: new Date(fullData.users.birthdate ?? "2000-01-01T00:00:00.000Z"),
                sex: (fullData.users.sex as "M" | "F" | null) ?? null,
            },
            professional: {
                id: fullData.professionals.id,
                crm: fullData.professionals.crm ?? null,
            },
        };
    }

    async findFullUpdateTarget(
        unitId: string,
        data: {
            userId: string;
            professionalId: string;
            professionalUnitId: string;
            professionalUnitRoleId: string;
            patientId: string;
        },
    ): Promise<{
        user: {
            id: string;
            name: string;
            socialName: string | null;
            email: string;
            phone: string;
            cpf: string;
            birthdate: Date;
            sex: "M" | "F" | null;
        };
        professional: {
            id: string;
            crm: string | null;
        };
        professionalUnit: {
            id: string;
            isActive: boolean;
        };
        professionalUnitRole: {
            id: string;
            roleId: string;
        };
        patient: {
            id: string;
            isActive: boolean;
        };
    } | null> {
        const professionalUnit = this.professionalUnits[data.professionalUnitId];

        if (!professionalUnit || professionalUnit.unitId !== unitId || professionalUnit.professionalId !== data.professionalId) {
            return null;
        }

        const fullData = this.fullDataByProfessionalUnitId[data.professionalUnitId];

        if (!fullData?.users || !fullData.professionals || !fullData.professionalUnitRoles || !fullData.roles || !fullData.patients) {
            return null;
        }

        if (
            fullData.users.id !== data.userId ||
            fullData.professionalUnitRoles.id !== data.professionalUnitRoleId ||
            fullData.patients.id !== data.patientId
        ) {
            return null;
        }

        return {
            user: {
                id: fullData.users.id,
                name: fullData.users.name,
                socialName: fullData.users.socialName ?? null,
                email: fullData.users.email,
                phone: fullData.users.phone,
                cpf: fullData.users.cpf,
                birthdate: new Date(fullData.users.birthdate ?? "2000-01-01T00:00:00.000Z"),
                sex: (fullData.users.sex as "M" | "F" | null) ?? null,
            },
            professional: {
                id: fullData.professionals.id,
                crm: fullData.professionals.crm ?? null,
            },
            professionalUnit: {
                id: professionalUnit.id,
                isActive: professionalUnit.isActive,
            },
            professionalUnitRole: {
                id: fullData.professionalUnitRoles.id,
                roleId: fullData.roles.id,
            },
            patient: {
                id: fullData.patients.id,
                isActive: fullData.patients.isActive ?? true,
            },
        };
    }

    async applyProfileUpdate(args: {
        userId: string;
        professionalId: string;
        userChanges: ProfileUpdateChanges["userChanges"];
        professionalChanges: ProfileUpdateChanges["professionalChanges"];
        accountPasswordHash?: string;
    }): Promise<void> {
        for (const professionalUnitId in this.fullDataByProfessionalUnitId) {
            const data = this.fullDataByProfessionalUnitId[professionalUnitId];

            if (data.users?.id === args.userId && data.professionals?.id === args.professionalId) {
                if (data.users) {
                    if (args.userChanges.name !== undefined) data.users.name = args.userChanges.name;
                    if (args.userChanges.socialName !== undefined) data.users.socialName = args.userChanges.socialName ?? "";
                    if (args.userChanges.email !== undefined) data.users.email = args.userChanges.email;
                    if (args.userChanges.phone !== undefined) data.users.phone = args.userChanges.phone;
                    if (args.userChanges.cpf !== undefined) data.users.cpf = args.userChanges.cpf;
                    if (args.userChanges.birthdate !== undefined) data.users.birthdate = args.userChanges.birthdate.toISOString();
                    if (args.userChanges.sex !== undefined) data.users.sex = args.userChanges.sex ?? "";
                }

                if (data.professionals && args.professionalChanges.crm !== undefined) {
                    data.professionals.crm = args.professionalChanges.crm;
                }
            }
        }
    }

    async applyFullUpdate(args: {
        userId: string;
        professionalId: string;
        professionalUnitId: string;
        professionalUnitRoleId: string;
        patientId: string;
        userChanges: FullUpdateChanges["userChanges"];
        professionalChanges: FullUpdateChanges["professionalChanges"];
        professionalUnitChanges: FullUpdateChanges["professionalUnitChanges"];
        professionalUnitRoleChanges: FullUpdateChanges["professionalUnitRoleChanges"];
        patientChanges: FullUpdateChanges["patientChanges"];
    }): Promise<void> {
        await this.applyProfileUpdate({
            userId: args.userId,
            professionalId: args.professionalId,
            userChanges: args.userChanges,
            professionalChanges: args.professionalChanges,
        });

        const professionalUnit = this.professionalUnits[args.professionalUnitId];

        if (professionalUnit && args.professionalUnitChanges.isActive !== undefined) {
            professionalUnit.isActive = args.professionalUnitChanges.isActive;
            professionalUnit.updatedAt = new Date().toISOString();
        }

        const data = this.fullDataByProfessionalUnitId[args.professionalUnitId];

        if (!data) {
            return;
        }

        if (args.professionalUnitChanges.isActive !== undefined) {
            data.isActive = args.professionalUnitChanges.isActive;
        }

        if (data.professionalUnitRoles?.id === args.professionalUnitRoleId && args.professionalUnitRoleChanges.roleId) {
            data.roles = {
                ...(data.roles ?? {
                    id: args.professionalUnitRoleChanges.roleId,
                    name: "",
                    isActive: true,
                }),
                id: args.professionalUnitRoleChanges.roleId,
            };
        }

        if (data.patients?.id === args.patientId && args.patientChanges.isActive !== undefined) {
            data.patients.isActive = args.patientChanges.isActive;
        }
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

    async listAccessibleUnitsByProfessional(
        userId: string,
    ): Promise<{ id: string; name: string; roles: { id: string; description: string; key: string }[] }[]> {
        const units = await this.listByUserId(userId);

        return units.map((unit) => ({
            id: unit.id,
            name: unit.name,
            roles: [],
        }));
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
