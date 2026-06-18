import { describe, it, expect, beforeEach } from "vitest";
import { buildE2EApp, TEST_IDS, fakeAuthPlugin } from "./helpers/context";
import { InMemoryUsersRepository, InMemoryPatientAppointmentsRepository } from "./helpers/repositories";
import { CLINIC_TZ } from "../../src/modules/appointments/appointments.utils";

const DATE = "2024-01-15"; // Monday (dayOfWeek = 1)

function makeDate(time: string): Date {
    return new Date(`${DATE}T${time}${CLINIC_TZ}`);
}

function buildRepo(opts: {
    withPatient?: boolean;
    withProfessionalUnit?: boolean;
    withSchedule?: boolean;
    withAppointment?: boolean;
    withBlock?: boolean;
} = {}) {
    const repo = new InMemoryPatientAppointmentsRepository();

    if (opts.withPatient ?? true) {
        repo.seedPatient(TEST_IDS.user, TEST_IDS.patient);
    }

    if (opts.withProfessionalUnit ?? true) {
        repo.seedProfessionalUnit({
            id: TEST_IDS.professionalUnit,
            professionalId: TEST_IDS.professional,
            unitId: TEST_IDS.unit,
            professionalIsActive: true,
            puIsActive: true,
            unitIsActive: true,
        });
    }

    if (opts.withSchedule ?? true) {
        repo.seedSchedule(TEST_IDS.professionalUnit, {
            startTime: "08:00:00",
            endTime: "10:00:00",
            appointmentDurationMinutes: 30,
            dayOfWeek: 1, // Monday
        });
    }

    if (opts.withAppointment) {
        repo.seedAppointment({
            id: "existing-appt",
            patientId: TEST_IDS.patient,
            professionalUnitId: TEST_IDS.professionalUnit,
            startAt: makeDate("08:00:00"),
            endAt: makeDate("08:30:00"),
            reason: null,
            isActive: true,
        });
    }

    if (opts.withBlock) {
        repo.seedBlock({
            professionalUnitId: TEST_IDS.professionalUnit,
            startAt: makeDate("09:00:00"),
            endAt: makeDate("10:00:00"),
        });
    }

    return repo;
}

async function buildApp(repo: InMemoryPatientAppointmentsRepository) {
    return buildE2EApp({
        usersRepository: new InMemoryUsersRepository(),
        patientAppointmentsRepository: repo,
    });
}

// ─────────────────────── GET /patient-appointments/slots ───────────────────────

describe("GET /patient-appointments/slots", () => {
    it("should return 200 with all slots for a valid date", async () => {
        const app = await buildApp(buildRepo());

        const url = `http://localhost/patient-appointments/slots?professionalId=${TEST_IDS.professional}&unitId=${TEST_IDS.unit}&date=${DATE}`;
        const response = await app.handle(
            new Request(url, { headers: { "x-user-id": TEST_IDS.user } }),
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(body)).toBe(true);
        expect(body).toHaveLength(4);
        expect(body[0]).toMatchObject({ available: true });
        expect(typeof body[0].startAt).toBe("string");
        expect(typeof body[0].endAt).toBe("string");
    });

    it("should return 200 with empty array when no schedule configured for the date", async () => {
        const repo = buildRepo({ withSchedule: false });
        const app = await buildApp(repo);

        const url = `http://localhost/patient-appointments/slots?professionalId=${TEST_IDS.professional}&unitId=${TEST_IDS.unit}&date=${DATE}`;
        const response = await app.handle(
            new Request(url, { headers: { "x-user-id": TEST_IDS.user } }),
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toHaveLength(0);
    });

    it("should return 404 when professional/unit is not found", async () => {
        const repo = buildRepo({ withProfessionalUnit: false });
        const app = await buildApp(repo);

        const url = `http://localhost/patient-appointments/slots?professionalId=${TEST_IDS.professional}&unitId=${TEST_IDS.unit}&date=${DATE}`;
        const response = await app.handle(
            new Request(url, { headers: { "x-user-id": TEST_IDS.user } }),
        );

        expect(response.status).toBe(404);
    });

    it("should return 401 when no x-user-id header is provided", async () => {
        const app = await buildApp(buildRepo());

        const url = `http://localhost/patient-appointments/slots?professionalId=${TEST_IDS.professional}&unitId=${TEST_IDS.unit}&date=${DATE}`;
        const response = await app.handle(new Request(url));

        expect(response.status).toBe(401);
    });

    it("should mark booked slot as unavailable", async () => {
        const app = await buildApp(buildRepo({ withAppointment: true }));

        const url = `http://localhost/patient-appointments/slots?professionalId=${TEST_IDS.professional}&unitId=${TEST_IDS.unit}&date=${DATE}`;
        const response = await app.handle(
            new Request(url, { headers: { "x-user-id": TEST_IDS.user } }),
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        const firstSlot = body.find((s: any) => s.startAt === makeDate("08:00:00").toISOString());
        expect(firstSlot?.available).toBe(false);
    });
});

// ─────────────────────── POST /patient-appointments ───────────────────────

describe("POST /patient-appointments", () => {
    const validBody = {
        professionalId: TEST_IDS.professional,
        unitId: TEST_IDS.unit,
        startAt: makeDate("08:00:00").toISOString(),
    };

    it("should return 201 when booking a valid available slot", async () => {
        const app = await buildApp(buildRepo());

        const response = await app.handle(
            new Request("http://localhost/patient-appointments", {
                method: "POST",
                headers: {
                    "x-user-id": TEST_IDS.user,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(validBody),
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(201);
        expect(body.patientId).toBe(TEST_IDS.patient);
        expect(body.professionalUnitId).toBe(TEST_IDS.professionalUnit);
        expect(body.startAt).toBe(makeDate("08:00:00").toISOString());
        expect(body.endAt).toBe(makeDate("08:30:00").toISOString());
    });

    it("should return 409 when the slot is already taken", async () => {
        const app = await buildApp(buildRepo({ withAppointment: true }));

        const response = await app.handle(
            new Request("http://localhost/patient-appointments", {
                method: "POST",
                headers: {
                    "x-user-id": TEST_IDS.user,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(validBody),
            }),
        );

        expect(response.status).toBe(409);
    });

    it("should return 409 when startAt does not align to a slot boundary", async () => {
        const app = await buildApp(buildRepo());

        const misaligned = makeDate("08:01:00").toISOString();
        const response = await app.handle(
            new Request("http://localhost/patient-appointments", {
                method: "POST",
                headers: {
                    "x-user-id": TEST_IDS.user,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ ...validBody, startAt: misaligned }),
            }),
        );

        expect(response.status).toBe(409);
    });

    it("should return 404 when no patient exists for the user", async () => {
        const app = await buildApp(buildRepo({ withPatient: false }));

        const response = await app.handle(
            new Request("http://localhost/patient-appointments", {
                method: "POST",
                headers: {
                    "x-user-id": TEST_IDS.user,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(validBody),
            }),
        );

        expect(response.status).toBe(404);
    });

    it("should return 401 when no x-user-id header is provided", async () => {
        const app = await buildApp(buildRepo());

        const response = await app.handle(
            new Request("http://localhost/patient-appointments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(validBody),
            }),
        );

        expect(response.status).toBe(401);
    });
});
