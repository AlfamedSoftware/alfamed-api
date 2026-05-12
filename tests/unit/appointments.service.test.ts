import { describe, expect, it } from "vitest";
import { AppointmentsService } from "../../src/modules/appointments/appointments.service";
import type {
    AppointmentsRepository,
    ScheduleProfile,
    CreateScheduleInput,
    UpdateScheduleInput,
} from "../../src/modules/appointments/appointments.repository";
import { DomainError } from "../../src/http/plugins/domain-error";

class InMemoryAppointmentsRepository implements AppointmentsRepository {
    constructor(
        private readonly professionalIdByUserId: Record<string, string>,
        private readonly patientIdByUserId: Record<string, string>,
        private readonly schedules: Record<string, ScheduleProfile>,
    ) {}

    async findProfessionalIdByUserId(userId: string) {
        return this.professionalIdByUserId[userId] ?? null;
    }

    async findPatientIdByUserId(userId: string) {
        return this.patientIdByUserId[userId] ?? null;
    }

    async findProfessionalUnit() {
        return { professionalId: "professional-1", unitId: "unit-1" };
    }

    async findScheduleContextById(scheduleId: string) {
        const schedule = this.schedules[scheduleId];
        if (!schedule) return null;
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
        const id = `schedule-${Object.keys(this.schedules).length + 1}`;
        const now = new Date().toISOString();
        const schedule: ScheduleProfile = {
            id,
            professionalUnitSpecialtyId: data.professionalUnitSpecialtyId,
            professionalUnitId: data.professionalUnitId,
            unitId: "unit-1",
            professionalId: "professional-1",
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
        if (!current) return null;

        const updated: ScheduleProfile = {
            ...current,
            professionalUnitSpecialtyId: data.professionalUnitSpecialtyId ?? current.professionalUnitSpecialtyId,
            professionalUnitId: data.professionalUnitId ?? current.professionalUnitId,
            date: data.date ?? current.date,
            time: data.time ?? current.time,
            slots: data.slots ?? current.slots,
            isActive: data.isActive ?? current.isActive,
            updatedAt: new Date().toISOString(),
        };

        this.schedules[scheduleId] = updated;
        return updated;
    }
    async listAvailability() {
        return [];
    }
    async createAppointmentRequest() {
        return {
            id: "request-1",
            appointmentId: "appointment-1",
            scheduleId: "schedule-1",
            patientId: "patient-1",
            unitId: "unit-1",
            professionalId: "professional-1",
            type: "booking_request",
            status: "pending_professional",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
    }
    async findRequestById() {
        return null;
    }
    async updateRequestStatus() {}
    async setCounterProposal() {}
    async updateAppointmentStatus() {}
    async moveAppointmentToSchedule() {}
}

describe("AppointmentsService", () => {
    it("deve criar solicitação quando usuário é paciente", async () => {
        const repository = new InMemoryAppointmentsRepository(
            {},
            { "user-patient": "patient-1" },
            {
                "schedule-1": {
                    id: "schedule-1",
                    professionalUnitSpecialtyId: "specialty-1",
                    professionalUnitId: "professional-unit-1",
                    unitId: "unit-1",
                    professionalId: "professional-1",
                    date: "2026-03-10",
                    time: "09:00",
                    slots: 3,
                    slotsUsed: 0,
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
            },
        );

        const service = new AppointmentsService(repository, async () => true);
        const result = await service.createAppointmentRequest("user-patient", "schedule-1");

        expect(result.id).toBe("request-1");
        expect(result.patientId).toBe("patient-1");
    });

    it("deve bloquear solicitação quando usuário não é paciente", async () => {
        const repository = new InMemoryAppointmentsRepository({}, {}, {});
        const service = new AppointmentsService(repository, async () => true);

        await expect(service.createAppointmentRequest("user-without-patient", "schedule-1")).rejects.toEqual(
            new DomainError("FORBIDDEN", "Forbidden"),
        );
    });
});
