import type { UserProfile, UsersRepository } from "@/modules/users/users.repository";
import type {
    CreateProfessionalInput,
    ProfessionalProfile,
    ProfessionalsRepository,
    UpdateProfessionalInput,
} from "@/modules/professionals/professionals.repository";
import type {
    CreateUnitInput,
    UnitProfile,
    UnitsRepository,
    UpdateUnitInput,
} from "@/modules/units/units.repository";

export class InMemoryUsersRepository implements UsersRepository {
    constructor(private readonly users: Record<string, UserProfile> = {}) {}

    async getUserById(userId: string): Promise<UserProfile | null> {
        return this.users[userId] ?? null;
    }
}

export class InMemoryUnitsRepository implements UnitsRepository {
    private readonly units: Record<string, UnitProfile>;
    private sequence = 1;

    constructor(initialUnits: Record<string, UnitProfile> = {}) {
        this.units = { ...initialUnits };
    }

    async create(data: CreateUnitInput): Promise<UnitProfile> {
        const now = new Date().toISOString();
        const id = `019c1a3e-e425-7000-8bda-cdfec32c9f${String(this.sequence).padStart(2, "0")}`;
        this.sequence += 1;

        const unit: UnitProfile = {
            id,
            name: data.name,
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

    async update(unitId: string, data: UpdateUnitInput): Promise<UnitProfile | null> {
        const current = this.units[unitId];

        if (!current) {
            return null;
        }

        const updated: UnitProfile = {
            ...current,
            name: data.name ?? current.name,
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
    private sequence = 1;

    constructor(
        initialProfessionals: Record<string, ProfessionalProfile> = {},
        initialProfessionalsUnits: Record<string, string[]> = {},
    ) {
        this.professionals = { ...initialProfessionals };
        this.professionalsUnits = { ...initialProfessionalsUnits };
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

    async createWithUnit(data: CreateProfessionalInput, unitId: string): Promise<ProfessionalProfile> {
        const professional = await this.create(data);
        this.professionalsUnits[professional.id] = [...(this.professionalsUnits[professional.id] ?? []), unitId];
        return professional;
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
}
