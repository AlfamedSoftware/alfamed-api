import { describe, expect, it } from "vitest";
import { specialtyProfileSchema } from "../../src/modules/specialties/specialties.schemas";
import { buildE2EApp, createSelectedClinicCookie, TEST_IDS } from "./helpers/context";
import {
    InMemorySpecialtiesRepository,
    InMemoryUsersRepository,
} from "./helpers/repositories";

describe("Specialties routes", () => {
    const specialtyId = "019c1a3e-e425-7000-8bda-cdfec32e9fa9";
    const accessMap = {
        [TEST_IDS.user]: [TEST_IDS.unit],
    };

    const requestHeaders = {
        "x-user-id": TEST_IDS.user,
        Cookie: createSelectedClinicCookie(TEST_IDS.unit),
    };

    const createRepository = () =>
        new InMemorySpecialtiesRepository({
            specialties: {
                [specialtyId]: {
                    id: specialtyId,
                    name: "Cardiologia",
                    isActive: true,
                    createdAt: "2026-02-01T17:27:35.202Z",
                    updatedAt: "2026-02-01T17:27:35.202Z",
                },
            },
            professionalUnitByProfessionalId: {
                [TEST_IDS.professional]: TEST_IDS.unit,
            },
        });

    it("POST /specialties cria especialidade", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            specialtiesRepository: createRepository(),
            accessMap,
        });

        const response = await app.handle(
            new Request("http://localhost/specialties", {
                method: "POST",
                headers: { ...requestHeaders, "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Neurologia" }),
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(201);
        expect(() => specialtyProfileSchema.parse(body)).not.toThrow();
    });

    it("GET /specialties lista especialidades", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            specialtiesRepository: createRepository(),
            accessMap,
        });

        const response = await app.handle(
            new Request("http://localhost/specialties", {
                headers: requestHeaders,
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toHaveLength(1);
        expect(() => specialtyProfileSchema.parse(body[0])).not.toThrow();
    });

    it("GET /specialties/:id retorna 404 quando não existe", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            specialtiesRepository: createRepository(),
            accessMap,
        });

        const response = await app.handle(
            new Request("http://localhost/specialties/019c1a3e-e425-7000-8bda-cdfec32e9fff", {
                headers: requestHeaders,
            }),
        );

        expect(response.status).toBe(404);
    });

    it("POST /specialties/:id/professionals/:professionalId vincula especialidade", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            specialtiesRepository: createRepository(),
            accessMap,
        });

        const response = await app.handle(
            new Request(`http://localhost/specialties/${specialtyId}/professionals/${TEST_IDS.professional}`, {
                method: "POST",
                headers: requestHeaders,
            }),
        );

        expect(response.status).toBe(201);
    });

    it("DELETE /specialties/:id/professionals/:professionalId retorna 404 quando vínculo não existe", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository(),
            specialtiesRepository: createRepository(),
            accessMap,
        });

        const response = await app.handle(
            new Request(`http://localhost/specialties/${specialtyId}/professionals/${TEST_IDS.professional}`, {
                method: "DELETE",
                headers: requestHeaders,
            }),
        );

        expect(response.status).toBe(404);
    });
});
