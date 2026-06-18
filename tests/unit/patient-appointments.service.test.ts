import { describe, it, expect, beforeEach } from "vitest";
import { generateSlots, PatientAppointmentsService } from "../../src/modules/patient-appointments/patient-appointments.service";
import type { IPatientAppointmentsRepository, ScheduleRow, TimeRange, CreateAppointmentData, CreatedAppointment } from "../../src/modules/patient-appointments/patient-appointments.repository";
import { DomainError } from "../../src/http/plugins/domain-error";
import { CLINIC_TZ } from "../../src/modules/appointments/appointments.utils";

// The unique-violation conversion (PG code 23505 → DomainError) happens inside the
// real PatientAppointmentsRepository. The in-memory test double simulates this by
// throwing the DomainError directly, matching what the service actually receives.

// ───────────────────────── helpers ─────────────────────────

const date = "2024-01-15"; // Monday

function makeDate(time: string): Date {
    return new Date(`${date}T${time}${CLINIC_TZ}`);
}

const baseSchedule: ScheduleRow = {
    startTime: "08:00:00",
    endTime: "10:00:00",
    appointmentDurationMinutes: 30,
};

// ───────────────────────── generateSlots ─────────────────────────

describe("generateSlots", () => {
    it("should return 4 available slots for a 2-hour window with 30min duration and no appointments", () => {
        const slots = generateSlots([baseSchedule], [], [], date);

        expect(slots).toHaveLength(4);
        expect(slots.every((s) => s.available)).toBe(true);
        expect(slots[0].startAt).toBe(makeDate("08:00:00").toISOString());
        expect(slots[0].endAt).toBe(makeDate("08:30:00").toISOString());
        expect(slots[3].startAt).toBe(makeDate("09:30:00").toISOString());
    });

    it("should mark the slot at 09:00 as busy when there is an appointment", () => {
        const appt: TimeRange = {
            startAt: makeDate("09:00:00"),
            endAt: makeDate("09:30:00"),
        };

        const slots = generateSlots([baseSchedule], [appt], [], date);

        expect(slots).toHaveLength(4);
        expect(slots[0].available).toBe(true);  // 08:00–08:30
        expect(slots[1].available).toBe(true);  // 08:30–09:00
        expect(slots[2].available).toBe(false); // 09:00–09:30 → busy
        expect(slots[3].available).toBe(true);  // 09:30–10:00
    });

    it("should mark first 2 slots as busy when a block covers 08:00–09:00", () => {
        const block: TimeRange = {
            startAt: makeDate("08:00:00"),
            endAt: makeDate("09:00:00"),
        };

        const slots = generateSlots([baseSchedule], [], [block], date);

        expect(slots).toHaveLength(4);
        expect(slots[0].available).toBe(false); // 08:00–08:30 → busy
        expect(slots[1].available).toBe(false); // 08:30–09:00 → busy
        expect(slots[2].available).toBe(true);
        expect(slots[3].available).toBe(true);
    });

    it("should return an empty array when there are no schedule rules", () => {
        const slots = generateSlots([], [], [], date);
        expect(slots).toHaveLength(0);
    });

    it("should generate only 1 slot when duration is 45min in a 60min window", () => {
        const rule: ScheduleRow = {
            startTime: "08:00:00",
            endTime: "09:00:00",
            appointmentDurationMinutes: 45,
        };

        const slots = generateSlots([rule], [], [], date);

        expect(slots).toHaveLength(1);
        expect(slots[0].startAt).toBe(makeDate("08:00:00").toISOString());
        expect(slots[0].endAt).toBe(makeDate("08:45:00").toISOString());
    });
});

// ───────────────────────── in-memory repo ─────────────────────────

class InMemoryRepo implements IPatientAppointmentsRepository {
    patientId: string | null = "patient-1";
    professionalUnitId: string | null = "pu-1";
    schedules: ScheduleRow[] = [baseSchedule];
    appointments: TimeRange[] = [];
    blocks: TimeRange[] = [];
    throwUniqueViolation = false;

    async findPatientIdByUserId(_userId: string) {
        return this.patientId;
    }

    async findActiveProfessionalUnit(_professionalId: string, _unitId: string) {
        if (!this.professionalUnitId) return null;
        return { professionalUnitId: this.professionalUnitId };
    }

    async getSchedulesForDay(_puId: string, _dow: number) {
        return this.schedules;
    }

    async getAppointmentsForDay(_puId: string, _start: Date, _end: Date) {
        return this.appointments;
    }

    async getBlocksForDay(_puId: string, _start: Date, _end: Date) {
        return this.blocks;
    }

    async createAppointment(input: CreateAppointmentData): Promise<CreatedAppointment> {
        if (this.throwUniqueViolation) {
            throw new DomainError("NO_SLOTS_AVAILABLE", "Horário não disponível");
        }
        return {
            id: "appt-new",
            patientId: input.patientId,
            professionalUnitId: input.professionalUnitId,
            startAt: input.startAt,
            endAt: input.endAt,
            reason: input.reason ?? null,
        };
    }

    async findOrCreateScheduledStatus() {
        return "status-1";
    }
}

// ───────────────────────── PatientAppointmentsService.bookSlot ─────────────────────────

describe("PatientAppointmentsService.bookSlot", () => {
    let repo: InMemoryRepo;
    let service: PatientAppointmentsService;

    const validStartAt = `${date}T08:00:00${CLINIC_TZ}`;

    beforeEach(() => {
        repo = new InMemoryRepo();
        service = new PatientAppointmentsService(repo);
    });

    it("should create appointment for valid aligned slot", async () => {
        const result = await service.bookSlot("user-1", {
            professionalId: "prof-1",
            unitId: "unit-1",
            startAt: validStartAt,
        });

        expect(result.patientId).toBe("patient-1");
        expect(result.professionalUnitId).toBe("pu-1");
        expect(new Date(result.startAt).getTime()).toBe(new Date(validStartAt).getTime());
    });

    it("should throw PATIENT_NOT_FOUND when no patient record exists for userId", async () => {
        repo.patientId = null;

        await expect(
            service.bookSlot("user-1", { professionalId: "prof-1", unitId: "unit-1", startAt: validStartAt }),
        ).rejects.toMatchObject({ code: "PATIENT_NOT_FOUND" });
    });

    it("should throw PROFESSIONAL_UNIT_NOT_FOUND when professional/unit is inactive or not found", async () => {
        repo.professionalUnitId = null;

        await expect(
            service.bookSlot("user-1", { professionalId: "prof-1", unitId: "unit-1", startAt: validStartAt }),
        ).rejects.toMatchObject({ code: "PROFESSIONAL_UNIT_NOT_FOUND" });
    });

    it("should throw NO_SLOTS_AVAILABLE when startAt does not align to a slot boundary", async () => {
        const misaligned = `${date}T08:01:00${CLINIC_TZ}`;

        await expect(
            service.bookSlot("user-1", { professionalId: "prof-1", unitId: "unit-1", startAt: misaligned }),
        ).rejects.toMatchObject({ code: "NO_SLOTS_AVAILABLE" });
    });

    it("should throw NO_SLOTS_AVAILABLE when slot is already occupied by an appointment", async () => {
        repo.appointments = [{ startAt: makeDate("08:00:00"), endAt: makeDate("08:30:00") }];

        await expect(
            service.bookSlot("user-1", { professionalId: "prof-1", unitId: "unit-1", startAt: validStartAt }),
        ).rejects.toMatchObject({ code: "NO_SLOTS_AVAILABLE" });
    });

    it("should throw NO_SLOTS_AVAILABLE when slot falls inside an availability block", async () => {
        repo.blocks = [{ startAt: makeDate("08:00:00"), endAt: makeDate("09:00:00") }];

        await expect(
            service.bookSlot("user-1", { professionalId: "prof-1", unitId: "unit-1", startAt: validStartAt }),
        ).rejects.toMatchObject({ code: "NO_SLOTS_AVAILABLE" });
    });

    it("should map a DB unique violation (race condition) to NO_SLOTS_AVAILABLE", async () => {
        repo.throwUniqueViolation = true;

        await expect(
            service.bookSlot("user-1", { professionalId: "prof-1", unitId: "unit-1", startAt: validStartAt }),
        ).rejects.toMatchObject({ code: "NO_SLOTS_AVAILABLE" });
    });
});
