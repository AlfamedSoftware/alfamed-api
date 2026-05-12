import Elysia from "elysia";
import { buildApp } from "../../../src/app";
import type { db as dbType } from "../../../src/db/client";
import type { UsersRepository } from "../../../src/modules/users/users.repository";
import type { ProfessionalsRepository } from "../../../src/modules/professionals/professionals.repository";
import type { PatientsRepository } from "../../../src/modules/patients/patients.repository";
import type { SpecialtiesRepository } from "../../../src/modules/specialties/specialties.repository";
import type { UnitsRepository } from "../../../src/modules/units/units.repository";
import type { AppointmentsRepository } from "../../../src/modules/appointments/appointments.repository";
import { InMemoryPatientsRepository } from "./repositories";

export const TEST_IDS = {
    user: "019c1a3e-e425-7000-8bda-cdfec32c8fed",
    otherUser: "019c1a3e-e425-7000-8bda-cdfec32c8fea",
    patientUser: "019c1a3e-e425-7000-8bda-cdfec32c8feb",
    unit: "019c1a3e-e425-7000-8bda-cdfec32c8fc1",
    otherUnit: "019c1a3e-e425-7000-8bda-cdfec32c8fc2",
    missingUnit: "019c1a3e-e425-7000-8bda-cdfec32c8fc9",
    professional: "019c1a3e-e425-7000-8bda-cdfec32c8fa1",
    missingProfessional: "019c1a3e-e425-7000-8bda-cdfec32c8fa9",
    patient: "019c1a3e-e425-7000-8bda-cdfec32c8fd1",
    professionalUnit: "019c1a3e-e425-7000-8bda-cdfec32c8fe1",
    schedule: "019c1a3e-e425-7000-8bda-cdfec32c8ff1",
    schedule2: "019c1a3e-e425-7000-8bda-cdfec32c8ff2",
    request: "019c1a3e-e425-7000-8bda-cdfec32c8fa2",
} as const;

export const createSelectedUnitCookie = (unitId: string) =>
    `${"selectedUnitId"}=${encodeURIComponent(unitId)}`;

export const unusedDb = new Proxy(
    {},
    {
        get() {
            throw new Error("Unexpected db usage in e2e test");
        },
    },
) as unknown as typeof dbType;

export const fakeAuthPlugin = new Elysia().macro({
    auth: {
        async resolve({ request, status }) {
            const userId = request.headers.get("x-user-id");

            if (!userId) {
                return status(401, { message: "Unauthorized" });
            }

            return { user: { id: userId } };
        },
    },
});

export const fakeAuthWithoutUserPlugin = new Elysia().macro({
    auth: {
        async resolve() {
            return {};
        },
    },
});

export type AllowedUnitsByUser = Record<string, string[]>;

export const createHasUserAccessToUnitChecker =
    (map: AllowedUnitsByUser) => async (userId: string, unitId: string) =>
        (map[userId] ?? []).includes(unitId);

type BuildE2EAppOptions = {
    usersRepository: UsersRepository;
    professionalsRepository?: ProfessionalsRepository;
    patientsRepository?: PatientsRepository;
    specialtiesRepository?: SpecialtiesRepository;
    unitsRepository?: UnitsRepository;
    appointmentsRepository?: AppointmentsRepository;
    accessMap?: AllowedUnitsByUser;
    authPlugin?: any;
};

export const buildE2EApp = async ({
    usersRepository,
    professionalsRepository,
    patientsRepository = new InMemoryPatientsRepository(),
    specialtiesRepository,
    unitsRepository,
    appointmentsRepository,
    accessMap = {},
    authPlugin = fakeAuthPlugin,
}: BuildE2EAppOptions) =>
    buildApp({
        db: unusedDb,
        authPlugin,
        withDocs: false,
        usersRepository,
        professionalsRepository,
        patientsRepository,
        specialtiesRepository,
        unitsRepository,
        appointmentsRepository,
        hasUserAccessToUnitChecker: createHasUserAccessToUnitChecker(accessMap),
    });
