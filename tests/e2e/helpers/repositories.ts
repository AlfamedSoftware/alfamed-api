import type { UserProfile, UsersRepository } from "../../../src/modules/users/users.repository";
import type {
    CreateProfessionalInput,
    ProfessionalProfile,
    ProfessionalsRepository,
    UpdateProfessionalInput,
} from "../../../src/modules/professionals/professionals.repository";
import type {
    CreateUnitInput,
    UnitProfile,
    UnitsRepository,
    UpdateUnitInput,
} from "../../../src/modules/units/units.repository";
import type {
    AppointmentRequestProfile,
    AppointmentsRepository,
    AvailabilityQuery,
    CreateScheduleInput,
    ScheduleProfile,
    UpdateScheduleInput,
} from "../../../src/modules/appointments/appointments.repository";
import type {
    CreatePatientInput,
    Patient,
    PatientsRepository,
} from "../../../src/modules/patients/patients.repository";
import type {
    CreateSpecialtyInput,
    SpecialtiesRepository,
    SpecialtyProfile,
    UpdateSpecialtyInput,
} from "../../../src/modules/specialties/specialties.repository";
import { DomainError } from "../../../src/http/plugins/domain-error";

export class InMemoryUsersRepository implements UsersRepository {
    constructor(private readonly users: Record<string, UserProfile> = {}) {}

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

export class InMemoryAppointmentsRepository implements AppointmentsRepository {
    private readonly professionalsByUserId: Record<string, string>;
    private readonly patientsByUserId: Record<string, string>;
    private readonly professionalUnits: Record<string, { professionalId: string; unitId: string }>;
    private readonly schedules: Record<string, ScheduleProfile>;
    private readonly requests: Record<string, AppointmentRequestProfile>;
    private readonly requestContexts: Record<string, InMemoryRequestContext>;
    private readonly appointmentStatuses: Record<string, string>;
    private readonly appointmentSchedules: Record<string, string>;
    private sequence = 1;

    constructor(args?: {
        professionalsByUserId?: Record<string, string>;
        patientsByUserId?: Record<string, string>;
        professionalUnits?: Record<string, { professionalId: string; unitId: string }>;
        schedules?: Record<string, ScheduleProfile>;
        requests?: Record<string, AppointmentRequestProfile>;
        requestContexts?: Record<string, InMemoryRequestContext>;
        appointmentStatuses?: Record<string, string>;
        appointmentSchedules?: Record<string, string>;
    }) {
        this.professionalsByUserId = { ...(args?.professionalsByUserId ?? {}) };
        this.patientsByUserId = { ...(args?.patientsByUserId ?? {}) };
        this.professionalUnits = { ...(args?.professionalUnits ?? {}) };
        this.schedules = { ...(args?.schedules ?? {}) };
        this.requests = { ...(args?.requests ?? {}) };
        this.requestContexts = { ...(args?.requestContexts ?? {}) };
        this.appointmentStatuses = { ...(args?.appointmentStatuses ?? {}) };
        this.appointmentSchedules = { ...(args?.appointmentSchedules ?? {}) };
    }

    async findProfessionalIdByUserId(userId: string): Promise<string | null> {
        return this.professionalsByUserId[userId] ?? null;
    }

    async findPatientIdByUserId(userId: string): Promise<string | null> {
        return this.patientsByUserId[userId] ?? null;
    }

    async findProfessionalUnit(professionalUnitId: string) {
        return this.professionalUnits[professionalUnitId] ?? null;
    }

    async findScheduleContextById(scheduleId: string) {
        const schedule = this.schedules[scheduleId];
        if (!schedule) {
            return null;
        }
        return {
            id: schedule.id,
            professionalUnitId: schedule.professionalUnitId,
            unitId: schedule.unitId,
            professionalId: schedule.professionalId,
            slots: schedule.slots,
            slotsUsed: schedule.slotsUsed,
            isActive: schedule.isActive,
        };
    }

    async createSchedule(data: CreateScheduleInput): Promise<ScheduleProfile> {
        const professionalUnit = this.professionalUnits[data.professionalUnitId];
        if (!professionalUnit) {
            throw new DomainError("FORBIDDEN", "Forbidden");
        }

        const id = `019c1a3e-e425-7000-8bda-cdfec32d0f${String(this.sequence).padStart(2, "0")}`;
        this.sequence += 1;
        const now = new Date().toISOString();

        const schedule: ScheduleProfile = {
            id,
            professionalSpecialtyId: data.professionalSpecialtyId,
            professionalUnitId: data.professionalUnitId,
            unitId: professionalUnit.unitId,
            professionalId: professionalUnit.professionalId,
            date: data.date,
            time: data.time,
            slots: data.slots,
            slotsUsed: 0,
            isActive: data.isActive ?? true,
            createdAt: now,
            updatedAt: now,
        };

        this.schedules[id] = schedule;
        return schedule;
    }

    async updateSchedule(scheduleId: string, data: UpdateScheduleInput): Promise<ScheduleProfile | null> {
        const current = this.schedules[scheduleId];
        if (!current) {
            return null;
        }

        let professionalUnit = this.professionalUnits[current.professionalUnitId];
        if (data.professionalUnitId) {
            professionalUnit = this.professionalUnits[data.professionalUnitId];
        }

        if (!professionalUnit) {
            throw new DomainError("FORBIDDEN", "Forbidden");
        }

        const updated: ScheduleProfile = {
            ...current,
            professionalSpecialtyId: data.professionalSpecialtyId ?? current.professionalSpecialtyId,
            professionalUnitId: data.professionalUnitId ?? current.professionalUnitId,
            unitId: professionalUnit.unitId,
            professionalId: professionalUnit.professionalId,
            date: data.date ?? current.date,
            time: data.time ?? current.time,
            slots: data.slots ?? current.slots,
            isActive: data.isActive ?? current.isActive,
            updatedAt: new Date().toISOString(),
        };

        this.schedules[scheduleId] = updated;
        return updated;
    }

    async listAvailability(query: AvailabilityQuery): Promise<ScheduleProfile[]> {
        return Object.values(this.schedules)
            .filter((schedule) => schedule.unitId === query.unitId)
            .filter((schedule) => !query.date || schedule.date === query.date)
            .filter(
                (schedule) =>
                    !query.professionalSpecialtyId
                    || schedule.professionalSpecialtyId === query.professionalSpecialtyId,
            )
            .filter((schedule) => schedule.isActive && schedule.slotsUsed < schedule.slots);
    }

    async createAppointmentRequest(args: {
        patientId: string;
        scheduleId: string;
        type: string;
        requestStatus: string;
        appointmentStatus: string;
    }): Promise<AppointmentRequestProfile> {
        const schedule = this.schedules[args.scheduleId];
        if (!schedule) {
            throw new DomainError("SCHEDULE_NOT_FOUND", "Schedule not found");
        }
        if (!schedule.isActive || schedule.slotsUsed >= schedule.slots) {
            throw new DomainError("NO_SLOTS_AVAILABLE", "No slots available");
        }

        const requestId = `019c1a3e-e425-7000-8bda-cdfec32d1f${String(this.sequence).padStart(2, "0")}`;
        const appointmentId = `019c1a3e-e425-7000-8bda-cdfec32d2f${String(this.sequence).padStart(2, "0")}`;
        this.sequence += 1;
        schedule.slotsUsed += 1;

        const now = new Date().toISOString();
        const profile: AppointmentRequestProfile = {
            id: requestId,
            appointmentId,
            scheduleId: schedule.id,
            patientId: args.patientId,
            unitId: schedule.unitId,
            professionalId: schedule.professionalId,
            type: args.type,
            status: args.requestStatus,
            createdAt: now,
            updatedAt: now,
        };

        const patientUserId = Object.entries(this.patientsByUserId).find(([, id]) => id === args.patientId)?.[0];
        if (!patientUserId) {
            throw new DomainError("FORBIDDEN", "Forbidden");
        }

        this.requests[requestId] = profile;
        this.requestContexts[requestId] = {
            id: requestId,
            appointmentId,
            status: args.requestStatus,
            type: args.type,
            patientUserId,
            unitId: schedule.unitId,
            professionalId: schedule.professionalId,
            scheduleId: schedule.id,
        };
        this.appointmentStatuses[appointmentId] = args.appointmentStatus;
        this.appointmentSchedules[appointmentId] = schedule.id;

        return profile;
    }

    async findRequestById(requestId: string) {
        return this.requestContexts[requestId] ?? null;
    }

    async updateRequestStatus(args: {
        requestId: string;
        newStatus: string;
        changedBy: string;
        observation?: string;
    }): Promise<void> {
        const context = this.requestContexts[args.requestId];
        const request = this.requests[args.requestId];
        if (!context || !request) {
            throw new DomainError("REQUEST_NOT_FOUND", "Request not found");
        }

        context.status = args.newStatus;
        request.status = args.newStatus;
        request.updatedAt = new Date().toISOString();
    }

    async setCounterProposal(args: {
        requestId: string;
        newStatus: string;
        proposedScheduleId: string;
        changedBy: string;
        observation?: string;
    }): Promise<void> {
        const context = this.requestContexts[args.requestId];
        const request = this.requests[args.requestId];
        if (!context || !request) {
            throw new DomainError("REQUEST_NOT_FOUND", "Request not found");
        }

        const type = `counter_proposal:${args.proposedScheduleId}`;
        context.status = args.newStatus;
        request.status = args.newStatus;
        context.type = type;
        request.type = type;
        request.updatedAt = new Date().toISOString();
    }

    async updateAppointmentStatus(args: {
        appointmentId: string;
        newStatusId: string;
        changedBy: string;
        observation?: string;
    }): Promise<void> {
        if (!this.appointmentStatuses[args.appointmentId]) {
            throw new DomainError("REQUEST_NOT_FOUND", "Request not found");
        }
        this.appointmentStatuses[args.appointmentId] = args.newStatusId;
    }

    async moveAppointmentToSchedule(args: {
        appointmentId: string;
        fromScheduleId: string;
        toScheduleId: string;
    }): Promise<void> {
        const fromSchedule = this.schedules[args.fromScheduleId];
        const toSchedule = this.schedules[args.toScheduleId];
        if (!fromSchedule || !toSchedule) {
            throw new DomainError("SCHEDULE_NOT_FOUND", "Schedule not found");
        }
        if (!toSchedule.isActive || toSchedule.slotsUsed >= toSchedule.slots) {
            throw new DomainError("NO_SLOTS_AVAILABLE", "No slots available");
        }

        fromSchedule.slotsUsed = Math.max(0, fromSchedule.slotsUsed - 1);
        toSchedule.slotsUsed += 1;
        this.appointmentSchedules[args.appointmentId] = args.toScheduleId;
    }
}

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
