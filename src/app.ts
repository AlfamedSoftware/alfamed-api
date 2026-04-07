import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { systemRoutes } from "./http/routes/system.routes.js";
import { trustedOrigins } from "./http/plugins/unit-access.js";
import { usersRoutes } from "./modules/users/users.routes.js";
import type { UsersRepository } from "./modules/users/users.repository.js";
import { professionalsRoutes } from "./modules/professionals/professionals.routes.js";
import type { ProfessionalsRepository } from "./modules/professionals/professionals.repository.js";
import { patientsRoutes } from "./modules/patients/patients.routes.js";
import type { PatientsRepository } from "./modules/patients/patients.repository.js";
import { specialtiesRoutes } from "./modules/specialties/specialties.routes.js";
import type { SpecialtiesRepository } from "./modules/specialties/specialties.repository.js";
import { unitsRoutes } from "./modules/units/units.routes.js";
import type { UnitsRepository } from "./modules/units/units.repository.js";
import { appointmentsRoutes } from "./modules/appointments/appointments.routes.js";
import type { AppointmentsRepository } from "./modules/appointments/appointments.repository.js";
import { createHasUserAccessToUnitChecker } from "./http/plugins/unit-access.js";
import type { db as dbType } from "./db/client.js";

type ElysiaPlugin = Parameters<InstanceType<typeof Elysia>["use"]>[0];

type DatabaseClient = typeof dbType;

type BuildAppOptions = {
    db: DatabaseClient;
    usersRepository: UsersRepository;
    professionalsRepository?: ProfessionalsRepository;
    patientsRepository: PatientsRepository;
    specialtiesRepository?: SpecialtiesRepository;
    unitsRepository?: UnitsRepository;
    appointmentsRepository?: AppointmentsRepository;
    hasUserAccessToUnitChecker?: (userId: string, unitId: string) => Promise<boolean>;
    authPlugin: ElysiaPlugin;
    withDocs?: boolean;
};

export async function buildApp({
    db,
    usersRepository,
    patientsRepository,
    professionalsRepository,
    specialtiesRepository,
    unitsRepository,
    appointmentsRepository,
    hasUserAccessToUnitChecker,
    authPlugin,
    withDocs = true,
}: BuildAppOptions) {
    const app = new Elysia();

    if (withDocs) {
        const { OpenAPI } = await import("./http/plugins/better-auth.js");

        app.use(
            openapi({
                path: "/openapi",
                documentation: {
                    tags: [
                        {
                            name: "System",
                            description: "Application health and system endpoints",
                        },
                        {
                            name: "Users",
                            description: "Operations about users",
                        },
                        {
                            name: "Units",
                            description: "Operations about units",
                        },
                        {
                            name: "Professionals",
                            description: "Operations about professionals",
                        },
                        {
                            name: "Patients",
                            description: "Operations about patients",
                        },
                        {
                            name: "Specialties",
                            description: "Operations about specialties",
                        },
                        {
                            name: "Better Auth",
                            description: "Authentication and session operations",
                        },
                        {
                            name: "Appointments",
                            description: "Scheduling and booking request operations",
                        },
                    ],
                    components: await OpenAPI.components,
                    paths: await OpenAPI.getPaths(),
                },
            }),
        );
    }

    const configuredApp = app
        .use(authPlugin)
        .use(
            cors({
                origin: trustedOrigins,
                methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
                credentials: true,
                allowedHeaders: ["Content-Type", "Authorization", "x-unit-id"],
            }),
        )
        .use(systemRoutes())
        .use(usersRoutes({ usersRepository }))
        .use(patientsRoutes({ patientsRepository }));

    const resolvedHasUserAccessToUnitChecker =
        hasUserAccessToUnitChecker ?? createHasUserAccessToUnitChecker(db);

    const configuredAppWithSpecialties = specialtiesRepository
        ? configuredApp.use(
              specialtiesRoutes({
                  specialtiesRepository,
                  hasUserAccessToUnitChecker: resolvedHasUserAccessToUnitChecker,
              }),
          )
        : configuredApp;

    const configuredAppWithUnits = unitsRepository
        ? configuredAppWithSpecialties.use(
              unitsRoutes({
                  unitsRepository,
                  hasUserAccessToUnitChecker: resolvedHasUserAccessToUnitChecker,
              }),
          )
        : configuredAppWithSpecialties;

    if (!professionalsRepository) {
        return appointmentsRepository
            ? configuredAppWithUnits.use(
                  appointmentsRoutes({
                      appointmentsRepository,
                      hasUserAccessToUnitChecker: resolvedHasUserAccessToUnitChecker,
                  }),
              )
            : configuredAppWithUnits;
    }

    const configuredAppWithProfessionals = configuredAppWithUnits.use(
        professionalsRoutes({
            professionalsRepository,
            hasUserAccessToUnitChecker: resolvedHasUserAccessToUnitChecker,
        }),
    );

    if (!appointmentsRepository) {
        return configuredAppWithProfessionals;
    }

    return configuredAppWithProfessionals.use(
        appointmentsRoutes({
            appointmentsRepository,
            hasUserAccessToUnitChecker: resolvedHasUserAccessToUnitChecker,
        }),
    );
}
