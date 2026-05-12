import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { systemRoutes } from "./http/routes/system.routes.js";
import { TRUSTED_ORIGINS } from "./config/session.js";
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
import { adminUnitsRoutes } from "./modules/admin/admin-units.routes.js";
import { adminUpmRoutes } from "./modules/admin/admin-upm.routes.js";
import { createSessionRoutes } from "./modules/session/session.routes.js";
import { authPasswordResetRoutes } from "./modules/auth/auth-password-reset.routes.js";
import { renewSessionCookies } from "./http/plugins/session-helpers.js";

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
                        {
                            name: "Admin",
                            description: "Internal administration operations",
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
        .onBeforeHandle(async ({ request, set }) => {
            const { pathname } = new URL(request.url);
            // Skip auth and system endpoints
            if (!pathname.startsWith("/auth/") && !pathname.startsWith("/system/")) {
                await renewSessionCookies(request, set);
            }
        })
        .use(authPasswordResetRoutes({ db }))
        .use(
            cors({
                origin: TRUSTED_ORIGINS,
                methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
                credentials: true,
                allowedHeaders: ["Content-Type", "Authorization"],
            }),
        )
        .use(createSessionRoutes(db))
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

    const configuredAppWithAdmin = configuredAppWithUnits.use(
        adminUnitsRoutes({
            db,
        }),
    ).use(
        adminUpmRoutes({
            db,
        }),
    );

    if (!professionalsRepository) {
        return appointmentsRepository
            ? configuredAppWithAdmin.use(
                appointmentsRoutes({
                    appointmentsRepository,
                    hasUserAccessToUnitChecker: resolvedHasUserAccessToUnitChecker,
                }),
            )
            : configuredAppWithAdmin;
    }

    const configuredAppWithProfessionals = configuredAppWithAdmin.use(
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
            getUserUnitIdsByUserId: professionalsRepository.listUnitIdsByUserId,
        }),
    );
}
