import { describe, expect, it } from "vitest";
import { appointmentRequestProfileSchema, scheduleProfileSchema } from "../../src/modules/appointments/appointments.schemas";
import { DomainError } from "../../src/http/plugins/domain-error";
import { buildE2EApp, TEST_IDS } from "./helpers/context";
import { InMemoryAppointmentsRepository, InMemoryUsersRepository } from "./helpers/repositories";

describe("Appointments routes", () => {
    const accessMap = {
        [TEST_IDS.user]: [TEST_IDS.unit],
    };

    const baseSchedules = {
        [TEST_IDS.schedule]: {
            id: TEST_IDS.schedule,
            professionalSpecialtyId: "019c1a3e-e425-7000-8bda-cdfec32c8fa3",
            professionalUnitId: TEST_IDS.professionalUnit,
            unitId: TEST_IDS.unit,
            professionalId: TEST_IDS.professional,
            date: "2026-03-10",
            time: "09:00",
            slots: 3,
            slotsUsed: 0,
            isActive: true,
            createdAt: "2026-03-01T10:00:00.000Z",
            updatedAt: "2026-03-01T10:00:00.000Z",
        },
        [TEST_IDS.schedule2]: {
            id: TEST_IDS.schedule2,
            professionalSpecialtyId: "019c1a3e-e425-7000-8bda-cdfec32c8fa3",
            professionalUnitId: TEST_IDS.professionalUnit,
            unitId: TEST_IDS.unit,
            professionalId: TEST_IDS.professional,
            date: "2026-03-10",
            time: "10:00",
            slots: 3,
            slotsUsed: 0,
            isActive: true,
            createdAt: "2026-03-01T10:00:00.000Z",
            updatedAt: "2026-03-01T10:00:00.000Z",
        },
    };

    const createRepository = () =>
        new InMemoryAppointmentsRepository({
            professionalsByUserId: {
                [TEST_IDS.user]: TEST_IDS.professional,
            },
            patientsByUserId: {
                [TEST_IDS.patientUser]: TEST_IDS.patient,
            },
            professionalUnits: {
                [TEST_IDS.professionalUnit]: {
                    professionalId: TEST_IDS.professional,
                    unitId: TEST_IDS.unit,
                },
            },
            schedules: {
                [TEST_IDS.schedule]: { ...baseSchedules[TEST_IDS.schedule] },
                [TEST_IDS.schedule2]: { ...baseSchedules[TEST_IDS.schedule2] },
            },
        });

    it("POST /appointments/schedules cria agenda para profissional", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            appointmentsRepository: createRepository(),
            accessMap,
        });

        const response = await app.handle(
            new Request("http://localhost/appointments/schedules", {
                method: "POST",
                headers: {
                    "x-user-id": TEST_IDS.user,
                    "x-unit-id": TEST_IDS.unit,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    professionalSpecialtyId: "019c1a3e-e425-7000-8bda-cdfec32c8fa3",
                    professionalUnitId: TEST_IDS.professionalUnit,
                    date: "2026-03-11",
                    time: "14:00",
                    slots: 5,
                }),
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(201);
        expect(() => scheduleProfileSchema.parse(body)).not.toThrow();
    });

    it("GET /appointments/availability lista horários disponíveis", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            appointmentsRepository: createRepository(),
            accessMap,
        });

        const response = await app.handle(
            new Request(
                `http://localhost/appointments/availability?unitId=${TEST_IDS.unit}&date=2026-03-10`,
                {
                    headers: { "x-user-id": TEST_IDS.user },
                },
            ),
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toHaveLength(2);
        expect(() => scheduleProfileSchema.parse(body[0])).not.toThrow();
    });

    it("POST /appointments/requests cria solicitação de paciente", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            appointmentsRepository: createRepository(),
            accessMap,
        });

        const response = await app.handle(
            new Request("http://localhost/appointments/requests", {
                method: "POST",
                headers: {
                    "x-user-id": TEST_IDS.patientUser,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    scheduleId: TEST_IDS.schedule,
                }),
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(201);
        expect(() => appointmentRequestProfileSchema.parse(body)).not.toThrow();
    });

    it("POST /appointments/requests retorna 403 para usuário não paciente", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            appointmentsRepository: createRepository(),
            accessMap,
        });

        const response = await app.handle(
            new Request("http://localhost/appointments/requests", {
                method: "POST",
                headers: {
                    "x-user-id": TEST_IDS.user,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    scheduleId: TEST_IDS.schedule,
                }),
            }),
        );

        expect(response.status).toBe(403);
    });

    it("PATCH /appointments/requests/:id/confirm confirma solicitação", async () => {
        const repository = createRepository();
        const created = await repository.createAppointmentRequest({
            patientId: TEST_IDS.patient,
            scheduleId: TEST_IDS.schedule,
            type: "booking_request",
            requestStatus: "pending_professional",
            appointmentStatus: "pending_professional",
        });

        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            appointmentsRepository: repository,
            accessMap,
        });

        const response = await app.handle(
            new Request(`http://localhost/appointments/requests/${created.id}/confirm`, {
                method: "PATCH",
                headers: { "x-user-id": TEST_IDS.user },
            }),
        );

        expect(response.status).toBe(200);
    });

    it("POST /appointments/requests retorna 409 quando não há vagas", async () => {
        const repository = new InMemoryAppointmentsRepository({
            professionalsByUserId: {
                [TEST_IDS.user]: TEST_IDS.professional,
            },
            patientsByUserId: {
                [TEST_IDS.patientUser]: TEST_IDS.patient,
            },
            professionalUnits: {
                [TEST_IDS.professionalUnit]: {
                    professionalId: TEST_IDS.professional,
                    unitId: TEST_IDS.unit,
                },
            },
            schedules: {
                [TEST_IDS.schedule]: {
                    ...baseSchedules[TEST_IDS.schedule],
                    slots: 1,
                    slotsUsed: 1,
                },
            },
        });

        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            appointmentsRepository: repository,
            accessMap,
        });

        const response = await app.handle(
            new Request("http://localhost/appointments/requests", {
                method: "POST",
                headers: {
                    "x-user-id": TEST_IDS.patientUser,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    scheduleId: TEST_IDS.schedule,
                }),
            }),
        );

        expect(response.status).toBe(409);
    });

    it("PATCH /appointments/requests/:id/counter-propose retorna 404 quando agenda proposta não existe", async () => {
        const repository = createRepository();
        const created = await repository.createAppointmentRequest({
            patientId: TEST_IDS.patient,
            scheduleId: TEST_IDS.schedule,
            type: "booking_request",
            requestStatus: "pending_professional",
            appointmentStatus: "pending_professional",
        });

        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            appointmentsRepository: repository,
            accessMap,
        });

        const response = await app.handle(
            new Request(`http://localhost/appointments/requests/${created.id}/counter-propose`, {
                method: "PATCH",
                headers: {
                    "x-user-id": TEST_IDS.user,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    proposedScheduleId: TEST_IDS.missingUnit,
                }),
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(404);
        expect(body).toEqual({ message: "Schedule not found" });
    });

    it("PATCH /appointments/requests/:id/confirm retorna 409 para transição inválida", async () => {
        const repository = createRepository();
        const created = await repository.createAppointmentRequest({
            patientId: TEST_IDS.patient,
            scheduleId: TEST_IDS.schedule,
            type: "booking_request",
            requestStatus: "pending_professional",
            appointmentStatus: "pending_professional",
        });

        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            appointmentsRepository: repository,
            accessMap,
        });

        const firstConfirm = await app.handle(
            new Request(`http://localhost/appointments/requests/${created.id}/confirm`, {
                method: "PATCH",
                headers: { "x-user-id": TEST_IDS.user },
            }),
        );
        expect(firstConfirm.status).toBe(200);

        const secondConfirm = await app.handle(
            new Request(`http://localhost/appointments/requests/${created.id}/confirm`, {
                method: "PATCH",
                headers: { "x-user-id": TEST_IDS.user },
            }),
        );

        expect(secondConfirm.status).toBe(409);
    });

    it("POST /appointments/requests retorna 500 quando status não está configurado", async () => {
        const repository = createRepository();
        repository.createAppointmentRequest = async () => {
            throw new DomainError("STATUS_NOT_FOUND", "Request status not found");
        };

        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            appointmentsRepository: repository,
            accessMap,
        });

        const response = await app.handle(
            new Request("http://localhost/appointments/requests", {
                method: "POST",
                headers: {
                    "x-user-id": TEST_IDS.patientUser,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    scheduleId: TEST_IDS.schedule,
                }),
            }),
        );

        expect(response.status).toBe(500);
    });

    it("PATCH /appointments/requests/:id/patient-accept retorna 409 quando agenda proposta lota", async () => {
        const repository = new InMemoryAppointmentsRepository({
            professionalsByUserId: {
                [TEST_IDS.user]: TEST_IDS.professional,
            },
            patientsByUserId: {
                [TEST_IDS.patientUser]: TEST_IDS.patient,
            },
            professionalUnits: {
                [TEST_IDS.professionalUnit]: {
                    professionalId: TEST_IDS.professional,
                    unitId: TEST_IDS.unit,
                },
            },
            schedules: {
                [TEST_IDS.schedule]: { ...baseSchedules[TEST_IDS.schedule] },
                [TEST_IDS.schedule2]: {
                    ...baseSchedules[TEST_IDS.schedule2],
                    slots: 1,
                    slotsUsed: 1,
                },
            },
        });

        const created = await repository.createAppointmentRequest({
            patientId: TEST_IDS.patient,
            scheduleId: TEST_IDS.schedule,
            type: "booking_request",
            requestStatus: "pending_professional",
            appointmentStatus: "pending_professional",
        });

        await repository.setCounterProposal({
            requestId: created.id,
            newStatus: "counter_proposed",
            proposedScheduleId: TEST_IDS.schedule2,
            changedBy: TEST_IDS.user,
        });

        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            appointmentsRepository: repository,
            accessMap,
        });

        const response = await app.handle(
            new Request(`http://localhost/appointments/requests/${created.id}/patient-accept`, {
                method: "PATCH",
                headers: { "x-user-id": TEST_IDS.patientUser },
            }),
        );

        expect(response.status).toBe(409);
    });
});
