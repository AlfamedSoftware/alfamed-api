import { describe, expect, it } from "vitest";
import {
    professionalUnitFullDataByUnitListSchema,
    professionalUnitFullDataSchema,
    professionalUnitProfileSchema,
} from "../../src/modules/professional-units/professional-units.schemas";
import {
    buildE2EApp,
    createSelectedUnitCookie,
    fakeAuthWithoutUserPlugin,
    TEST_IDS,
} from "./helpers/context";
import {
    InMemoryProfessionalUnitsRepository,
    InMemoryUsersRepository,
} from "./helpers/repositories";

describe("Professional units routes", () => {
    const accessMap = {
        [TEST_IDS.user]: [TEST_IDS.unit],
    };

    const requestHeaders = {
        "x-user-id": TEST_IDS.user,
        Cookie: createSelectedUnitCookie(TEST_IDS.unit),
    };

    it("POST /professional-units cria vínculo profissional-unidade", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            professionalUnitsRepository: new InMemoryProfessionalUnitsRepository({
                professionalIds: [TEST_IDS.professional],
            }) as any,
            accessMap,
        });

        const response = await app.handle(
            new Request("http://localhost/professional-units", {
                method: "POST",
                headers: { ...requestHeaders, "Content-Type": "application/json" },
                body: JSON.stringify({
                    professionalId: TEST_IDS.professional,
                    unitId: TEST_IDS.unit,
                    isActive: true,
                }),
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(201);
        expect(() => professionalUnitProfileSchema.parse(body)).not.toThrow();
        expect(body.professionalId).toBe(TEST_IDS.professional);
        expect(body.unitId).toBe(TEST_IDS.unit);
        expect(body.isActive).toBe(true);
    });

    it("POST /professional-units retorna 403 sem acesso à unidade", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            professionalUnitsRepository: new InMemoryProfessionalUnitsRepository({
                professionalIds: [TEST_IDS.professional],
            }) as any,
            accessMap: {},
        });

        const response = await app.handle(
            new Request("http://localhost/professional-units", {
                method: "POST",
                headers: { ...requestHeaders, "Content-Type": "application/json" },
                body: JSON.stringify({
                    professionalId: TEST_IDS.professional,
                    unitId: TEST_IDS.unit,
                }),
            }),
        );

        expect(response.status).toBe(403);
    });

    it("POST /professional-units retorna 404 para profissional inexistente", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            professionalUnitsRepository: new InMemoryProfessionalUnitsRepository() as any,
            accessMap,
        });

        const response = await app.handle(
            new Request("http://localhost/professional-units", {
                method: "POST",
                headers: { ...requestHeaders, "Content-Type": "application/json" },
                body: JSON.stringify({
                    professionalId: TEST_IDS.missingProfessional,
                    unitId: TEST_IDS.unit,
                }),
            }),
        );

        expect(response.status).toBe(404);
    });

    it("POST /professional-units retorna 409 quando vínculo já existe", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            professionalUnitsRepository: new InMemoryProfessionalUnitsRepository({
                professionalIds: [TEST_IDS.professional],
                professionalUnits: {
                    [TEST_IDS.professionalUnit]: {
                        id: TEST_IDS.professionalUnit,
                        professionalId: TEST_IDS.professional,
                        unitId: TEST_IDS.unit,
                        isActive: true,
                        createdAt: "2026-02-01T17:27:35.202Z",
                        updatedAt: "2026-02-01T17:27:35.202Z",
                    },
                },
            }) as any,
            accessMap,
        });

        const response = await app.handle(
            new Request("http://localhost/professional-units", {
                method: "POST",
                headers: { ...requestHeaders, "Content-Type": "application/json" },
                body: JSON.stringify({
                    professionalId: TEST_IDS.professional,
                    unitId: TEST_IDS.unit,
                }),
            }),
        );

        expect(response.status).toBe(409);
    });

    it("GET /professional-units/:id retorna vínculo da unidade selecionada", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            professionalUnitsRepository: new InMemoryProfessionalUnitsRepository({
                professionalIds: [TEST_IDS.professional],
                professionalUnits: {
                    [TEST_IDS.professionalUnit]: {
                        id: TEST_IDS.professionalUnit,
                        professionalId: TEST_IDS.professional,
                        unitId: TEST_IDS.unit,
                        isActive: true,
                        createdAt: "2026-02-01T17:27:35.202Z",
                        updatedAt: "2026-02-01T17:27:35.202Z",
                    },
                },
            }) as any,
            accessMap,
        });

        const response = await app.handle(
            new Request(`http://localhost/professional-units/${TEST_IDS.professionalUnit}`, {
                headers: requestHeaders,
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(() => professionalUnitProfileSchema.parse(body)).not.toThrow();
        expect(body.id).toBe(TEST_IDS.professionalUnit);
    });

    it("GET /professional-units/:id retorna 404 para vínculo fora da unidade selecionada", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            professionalUnitsRepository: new InMemoryProfessionalUnitsRepository({
                professionalIds: [TEST_IDS.professional],
                professionalUnits: {
                    [TEST_IDS.professionalUnit]: {
                        id: TEST_IDS.professionalUnit,
                        professionalId: TEST_IDS.professional,
                        unitId: TEST_IDS.otherUnit,
                        isActive: true,
                        createdAt: "2026-02-01T17:27:35.202Z",
                        updatedAt: "2026-02-01T17:27:35.202Z",
                    },
                },
            }) as any,
            accessMap,
        });

        const response = await app.handle(
            new Request(`http://localhost/professional-units/${TEST_IDS.professionalUnit}`, {
                headers: requestHeaders,
            }),
        );

        expect(response.status).toBe(404);
    });

    it("GET /professional-units/professional-unit-full-data/:id retorna dados completos do vinculo", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            professionalUnitsRepository: new InMemoryProfessionalUnitsRepository({
                professionalIds: [TEST_IDS.professional],
                professionalUnits: {
                    [TEST_IDS.professionalUnit]: {
                        id: TEST_IDS.professionalUnit,
                        professionalId: TEST_IDS.professional,
                        unitId: TEST_IDS.unit,
                        isActive: true,
                        createdAt: "2026-02-01T17:27:35.202Z",
                        updatedAt: "2026-02-01T17:27:35.202Z",
                    },
                },
                fullDataByProfessionalUnitId: {
                    [TEST_IDS.professionalUnit]: {
                        id: TEST_IDS.professionalUnit,
                        isActive: true,
                        users: {
                            id: TEST_IDS.user,
                            name: "Dra. Ana Silva",
                            socialName: "",
                            email: "ana.silva@example.com",
                            phone: "(11) 99999-9999",
                            cpf: "123.456.789-00",
                            birthdate: "1990-01-01T00:00:00.000Z",
                            sex: "F",
                            isActive: true,
                        },
                        professionals: {
                            id: TEST_IDS.professional,
                            crm: "SC123456",
                            isActive: true,
                        },
                        roles: {
                            id: "019c1a3e-e425-7000-8bda-cdfec32c8fb1",
                            name: "Medico",
                            isActive: true,
                        },
                        patients: {
                            id: TEST_IDS.patient,
                            isActive: true,
                        },
                    },
                },
            }) as any,
            accessMap,
        });

        const response = await app.handle(
            new Request(`http://localhost/professional-units/professional-unit-full-data/${TEST_IDS.professionalUnit}`, {
                headers: requestHeaders,
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(() => professionalUnitFullDataSchema.parse(body)).not.toThrow();
        expect(body.id).toBe(TEST_IDS.professionalUnit);
        expect(body.users.id).toBe(TEST_IDS.user);
        expect(body.users.socialName).toBe("");
        expect(body.users.sex).toBe("F");
        expect(body.professionals.id).toBe(TEST_IDS.professional);
        expect(body.professionals.crm).toBe("SC123456");
        expect(body.roles.name).toBe("Medico");
        expect(body.patients.id).toBe(TEST_IDS.patient);
    });

    it("GET /professional-units/professional-unit-full-data/:id retorna 400 sem unidade selecionada", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            professionalUnitsRepository: new InMemoryProfessionalUnitsRepository() as any,
            accessMap,
        });

        const response = await app.handle(
            new Request(`http://localhost/professional-units/professional-unit-full-data/${TEST_IDS.professionalUnit}`, {
                headers: { "x-user-id": TEST_IDS.user },
            }),
        );

        expect(response.status).toBe(400);
    });

    it("GET /professional-units/professional-unit-full-data/:id retorna 401 sem usuario autenticado", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            professionalUnitsRepository: new InMemoryProfessionalUnitsRepository() as any,
            accessMap,
            authPlugin: fakeAuthWithoutUserPlugin,
        });

        const response = await app.handle(
            new Request(`http://localhost/professional-units/professional-unit-full-data/${TEST_IDS.professionalUnit}`, {
                headers: { Cookie: createSelectedUnitCookie(TEST_IDS.unit) },
            }),
        );

        expect(response.status).toBe(401);
    });

    it("GET /professional-units/professional-unit-full-data/:id retorna 403 sem acesso a unidade", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            professionalUnitsRepository: new InMemoryProfessionalUnitsRepository({
                professionalIds: [TEST_IDS.professional],
                professionalUnits: {
                    [TEST_IDS.professionalUnit]: {
                        id: TEST_IDS.professionalUnit,
                        professionalId: TEST_IDS.professional,
                        unitId: TEST_IDS.unit,
                        isActive: true,
                        createdAt: "2026-02-01T17:27:35.202Z",
                        updatedAt: "2026-02-01T17:27:35.202Z",
                    },
                },
            }) as any,
            accessMap: {},
        });

        const response = await app.handle(
            new Request(`http://localhost/professional-units/professional-unit-full-data/${TEST_IDS.professionalUnit}`, {
                headers: requestHeaders,
            }),
        );

        expect(response.status).toBe(403);
    });

    it("GET /professional-units/professional-unit-full-data/:id retorna 404 para vinculo inexistente", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            professionalUnitsRepository: new InMemoryProfessionalUnitsRepository() as any,
            accessMap,
        });

        const response = await app.handle(
            new Request(`http://localhost/professional-units/professional-unit-full-data/${TEST_IDS.professionalUnit}`, {
                headers: requestHeaders,
            }),
        );

        expect(response.status).toBe(404);
    });

    it("GET /professional-units/professional-unit-full-data/:id retorna 404 para vinculo fora da unidade", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            professionalUnitsRepository: new InMemoryProfessionalUnitsRepository({
                professionalIds: [TEST_IDS.professional],
                professionalUnits: {
                    [TEST_IDS.professionalUnit]: {
                        id: TEST_IDS.professionalUnit,
                        professionalId: TEST_IDS.professional,
                        unitId: TEST_IDS.otherUnit,
                        isActive: true,
                        createdAt: "2026-02-01T17:27:35.202Z",
                        updatedAt: "2026-02-01T17:27:35.202Z",
                    },
                },
            }) as any,
            accessMap,
        });

        const response = await app.handle(
            new Request(`http://localhost/professional-units/professional-unit-full-data/${TEST_IDS.professionalUnit}`, {
                headers: requestHeaders,
            }),
        );

        expect(response.status).toBe(404);
    });

    it("GET /professional-units/list-professional-unit-full-data-by-unit/:unitId lista profissionais da unidade", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            professionalUnitsRepository: new InMemoryProfessionalUnitsRepository({
                professionalIds: [TEST_IDS.professional],
                professionalUnits: {
                    [TEST_IDS.professionalUnit]: {
                        id: TEST_IDS.professionalUnit,
                        professionalId: TEST_IDS.professional,
                        unitId: TEST_IDS.unit,
                        isActive: true,
                        createdAt: "2026-02-01T17:27:35.202Z",
                        updatedAt: "2026-02-01T17:27:35.202Z",
                    },
                },
                fullDataByProfessionalUnitId: {
                    [TEST_IDS.professionalUnit]: {
                        id: TEST_IDS.professionalUnit,
                        isActive: true,
                        users: {
                            id: TEST_IDS.user,
                            name: "Dra. Ana Silva",
                            socialName: "",
                            email: "ana.silva@example.com",
                            phone: "(11) 99999-9999",
                            cpf: "123.456.789-00",
                            birthdate: "1990-01-01T00:00:00.000Z",
                            sex: "F",
                            isActive: true,
                        },
                        professionals: {
                            id: TEST_IDS.professional,
                            crm: "SC123456",
                            isActive: true,
                        },
                        roles: {
                            id: "019c1a3e-e425-7000-8bda-cdfec32c8fb1",
                            name: "Medico",
                            isActive: true,
                        },
                        patients: {
                            id: TEST_IDS.patient,
                            isActive: true,
                        },
                    },
                },
            }) as any,
            accessMap,
        });

        const response = await app.handle(
            new Request(`http://localhost/professional-units/list-professional-unit-full-data-by-unit/${TEST_IDS.unit}`, {
                headers: requestHeaders,
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(() => professionalUnitFullDataByUnitListSchema.parse(body)).not.toThrow();
        expect(body).toHaveLength(1);
        expect(body[0].id).toBe(TEST_IDS.professionalUnit);
        expect(body[0].users.id).toBe(TEST_IDS.user);
        expect(body[0].professionals.crm).toBe("SC123456");
        expect(body[0].roles.name).toBe("Medico");
        expect(body[0].patients).toBeUndefined();
    });

    it("GET /professional-units/list-professional-unit-full-data-by-unit/:unitId retorna 403 sem acesso a unidade", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            professionalUnitsRepository: new InMemoryProfessionalUnitsRepository() as any,
            accessMap: {},
        });

        const response = await app.handle(
            new Request(`http://localhost/professional-units/list-professional-unit-full-data-by-unit/${TEST_IDS.unit}`, {
                headers: requestHeaders,
            }),
        );

        expect(response.status).toBe(403);
    });
});
