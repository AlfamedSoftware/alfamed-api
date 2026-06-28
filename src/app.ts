import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { systemRoutes } from "./http/routes/system.routes.js";
import { TRUSTED_ORIGINS } from "./config/session.js";
import { usersRoutes } from "./modules/users/users.routes.js";
import type { UsersRepository } from "./modules/users/users.repository.js";
import { professionalsRoutes } from "./modules/professionals/professionals.routes.js";
import { ProfessionalsRepository } from "./modules/professionals/professionals.repository.js";
import { proceduresRoutes } from "./modules/procedures/procedures.routes.js";
import { ProceduresRepository } from "./modules/procedures/procedures.repository.js";
import { specialtiesRoutes } from "./modules/specialties/specialties.routes.js";
import { SpecialtiesRepository } from "./modules/specialties/specialties.repository.js";
import { professionalUnitsRoutes } from "./modules/professional-units/professional-units.routes.js";
import { ProfessionalUnitsRepository } from "./modules/professional-units/professional-units.repository.js";
import { professionalUnitSpecialtiesRoutes } from "./modules/professional-unit-specialties/professional-unit-specialties.routes.js";
import { ProfessionalUnitSpecialtiesRepository } from "./modules/professional-unit-specialties/professional-unit-specialties.repository.js";
import { rolesRoutes } from "./modules/roles/roles.routes.js";
import { RolesRepository } from "./modules/roles/roles.repository.js";
import { patientsRoutes } from "./modules/patients/patients.routes.js";
import type { PatientsRepository } from "./modules/patients/patients.repository.js";
import { appointmentsRoutes } from "./modules/appointments/appointments.routes.js";
import type { AppointmentsRepository } from "./modules/appointments/appointments.repository.js";
import { AppointmentsRepository as AppointmentsRepositoryClass } from "./modules/appointments/appointments.repository.js";
import { schedulesRoutes } from "./modules/schedules/schedules.routes.js";
import type { SchedulesRepository } from "./modules/schedules/schedules.repository.js";
import { SchedulesRepository as SchedulesRepositoryClass } from "./modules/schedules/schedules.repository.js";
import { medicalRecordsRoutes } from "./modules/medical-records/medical-records.routes.js";
import { unitsRoutes } from "./modules/units/units.routes.js";
import type { UnitsRepository } from "./modules/units/units.repository.js";
import { attendimentsRoutes } from "./modules/attendiments/attendiments.routes.js";
import type { AttendimentsRepository } from "./modules/attendiments/attendiments.repository.js";
import { AttendimentsRepository as AttendimentsRepositoryClass } from "./modules/attendiments/attendiments.repository.js";
import { requestsRoutes } from "./modules/requests/requests.routes.js";
import { anamnesisRoutes } from "./modules/anamnesis/anamnesis.routes.js";
import { AnamnesisRepository } from "./modules/anamnesis/anamnesis.repository.js";
import { externalRequestsRoutes } from "./modules/external-requests/external-requests.routes.js";
import { createHasUserAccessToUnitChecker } from "./http/plugins/unit-access.js";
import type { db as dbType } from "./db/client.js";
import { adminUnitsRoutes } from "./modules/admin/admin-units.routes.js";
import { adminUpmRoutes } from "./modules/admin/admin-upm.routes.js";
import { createSessionRoutes } from "./modules/session/session.routes.js";
import { authPasswordResetRoutes } from "./modules/auth/auth-password-reset.routes.js";
import { renewSessionCookies } from "./http/plugins/session-helpers.js";
import { unitParametersRoutes } from "./modules/unit-parameters/unit-parameters.routes.js";
import { appointmentStatusRoutes } from "./modules/appointment-status/appointment-status.routes.js";
import { AppointmentStatusRepository } from "./modules/appointment-status/appointment-status.repository.js";
import { requestStatusRoutes } from "./modules/request-status/request-status.routes.js";
import { RequestStatusRepository } from "./modules/request-status/request-status.repository.js";

type ElysiaPlugin = Parameters<InstanceType<typeof Elysia>["use"]>[0];

type DatabaseClient = typeof dbType;

type BuildAppOptions = {
    db: DatabaseClient;
    usersRepository: UsersRepository;
    professionalsRepository?: ProfessionalsRepository;
    proceduresRepository?: ProceduresRepository;
    specialtiesRepository?: SpecialtiesRepository;
    professionalUnitsRepository?: ProfessionalUnitsRepository;
    professionalUnitSpecialtiesRepository?: ProfessionalUnitSpecialtiesRepository;
    patientsRepository: PatientsRepository;
    rolesRepository?: RolesRepository;
    appointmentsRepository?: AppointmentsRepository;
    schedulesRepository?: SchedulesRepository;
    unitsRepository?: UnitsRepository;
    attendimentsRepository?: AttendimentsRepository;
    hasUserAccessToUnitChecker?: (userId: string, unitId: string) => Promise<boolean>;
    authPlugin: ElysiaPlugin;
    withDocs?: boolean;
};

export async function buildApp({
    db,
    usersRepository,
    patientsRepository,
    rolesRepository,
    professionalsRepository,
    proceduresRepository,
    specialtiesRepository,
    professionalUnitsRepository,
    professionalUnitSpecialtiesRepository,
    appointmentsRepository,
    schedulesRepository,
    unitsRepository,
    attendimentsRepository,
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
                            name: "Procedures",
                            description: "Operations about procedures",
                        },
                        {
                            name: "Specialties",
                            description: "Operations about specialties",
                        },
                        {
                            name: "Professional Units",
                            description: "Operations about links between professionals and units",
                        },
                        {
                            name: "Professional Unit Specialties",
                            description: "Operations about links between professionals and specialties",
                        },
                        {
                            name: "Patients",
                            description: "Operations about patients",
                        },
                        {
                            name: "Roles",
                            description: "Operations about professional roles",
                        },
                        {
                            name: "Session Management",
                            description: "Operations about session unit selection and lookup",
                        },
                        {
                            name: "Auth",
                            description: "Password reset operations",
                        },
                        {
                            name: "Better Auth",
                            description: "Authentication and session operations",
                        },
                        {
                            name: "Admin",
                            description: "Internal administration operations",
                        },
                        {
                            name: "Medical Records",
                            description: "Operations about patient medical records",
                        },
                        {
                            name: "Unit Parameters",
                            description: "Operations about unit configuration parameters",
                        },
                        {
                            name: "Anamnesis",
                            description: "Operations about patient anamnesis",
                        },
                        {
                            name: "External Requests",
                            description: "Operations about external exam requests",
                        },
                        {
                            name: "Appointment Status",
                            description: "Operations about appointment statuses",
                        },
                        {
                            name: "Request Status",
                            description: "Operations about request statuses",
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
        .use(patientsRoutes({
            patientsRepository,
            professionalsRepository: professionalsRepository ?? new ProfessionalsRepository(db),
        }))
        .use(rolesRoutes({ rolesRepository: rolesRepository ?? new RolesRepository(db) }))
        .use(appointmentsRoutes({
            appointmentsRepository: appointmentsRepository ?? new AppointmentsRepositoryClass(db),
            schedulesRepository: schedulesRepository ?? new SchedulesRepositoryClass(db),
        }))
        .use(attendimentsRoutes({
            attendimentsRepository: attendimentsRepository ?? new AttendimentsRepositoryClass(db),
            schedulesRepository: schedulesRepository ?? new SchedulesRepositoryClass(db),
        }))
        .use(anamnesisRoutes({
            anamnesisRepository: new AnamnesisRepository(db),
        }));

    const resolvedHasUserAccessToUnitChecker =
        hasUserAccessToUnitChecker ?? createHasUserAccessToUnitChecker(db);

    const configuredAppBase = configuredApp;

    const configuredAppWithUnits = unitsRepository
        ? configuredAppBase.use(
            unitsRoutes({
                unitsRepository,
                hasUserAccessToUnitChecker: resolvedHasUserAccessToUnitChecker,
            }),
        )
        : configuredAppBase;

    const configuredAppWithProcedures = configuredAppWithUnits.use(
        proceduresRoutes({
            proceduresRepository: proceduresRepository ?? new ProceduresRepository(db),
            hasUserAccessToUnitChecker: resolvedHasUserAccessToUnitChecker,
        }),
    );

    const configuredAppWithSpecialties = configuredAppWithProcedures.use(
        specialtiesRoutes({
            specialtiesRepository: specialtiesRepository ?? new SpecialtiesRepository(db),
            hasUserAccessToUnitChecker: resolvedHasUserAccessToUnitChecker,
        }),
    );

    const configuredAppWithProfessionalUnits = configuredAppWithSpecialties.use(
        professionalUnitsRoutes({
            professionalUnitsRepository: professionalUnitsRepository ?? new ProfessionalUnitsRepository(db),
            patientsRepository,
            professionalsRepository: professionalsRepository ?? new ProfessionalsRepository(db),
            usersRepository,
            hasUserAccessToUnitChecker: resolvedHasUserAccessToUnitChecker,
        }),
    ).use(
        professionalUnitSpecialtiesRoutes({
            professionalUnitSpecialtiesRepository: professionalUnitSpecialtiesRepository ?? new ProfessionalUnitSpecialtiesRepository(db),
            hasUserAccessToUnitChecker: resolvedHasUserAccessToUnitChecker,
        }),
    );

    const configuredAppWithAdmin = configuredAppWithProfessionalUnits.use(
        adminUnitsRoutes({
            db,
        }),
    ).use(
        adminUpmRoutes({
            db,
        }),
    );

    if (!professionalsRepository) {
        return configuredAppWithAdmin;
    }

    const configuredAppWithProfessionals = configuredAppWithAdmin.use(
        professionalsRoutes({
            professionalsRepository,
            usersRepository,
            patientsRepository,
            hasUserAccessToUnitChecker: resolvedHasUserAccessToUnitChecker,
        }),
    );

    // Register schedules routes (depend on db directly)
    configuredAppWithProfessionals.use(schedulesRoutes({ db }));
    configuredAppWithProfessionals.use(medicalRecordsRoutes({ db }));
    configuredAppWithProfessionals.use(unitParametersRoutes({ db }));
    configuredAppWithProfessionals.use(externalRequestsRoutes({ db }));
    configuredAppWithProfessionals.use(appointmentStatusRoutes({ appointmentStatusRepository: new AppointmentStatusRepository(db) }));
    configuredAppWithProfessionals.use(requestStatusRoutes({ requestStatusRepository: new RequestStatusRepository(db) }));
    configuredAppWithProfessionals.use(requestsRoutes({ db }));

    return configuredAppWithProfessionals;
}
