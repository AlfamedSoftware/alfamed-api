/**
 * Session Management Routes
 * 
 * Gerencia a sessão do usuário, incluindo seleção e troca de clínicas.
 * Todos os endpoints aqui trabalham com a sessão do Better Auth.
 */

import Elysia, { t } from "elysia";
import type { db as dbType } from "../../db/client.js";
import { auth } from "../../auth.js";
import {
    getClinicIdFromRequest,
    getProfessionalUnitIdFromRequest,
    findProfessionalUnitIdForUserAndClinic,
    selectedClinicCookieName,
    selectedProfessionalUnitCookieName,
    createClinicAccessChecker,
    listAvailableClinics,
} from "../../http/plugins/clinic-context.js";

type DatabaseClient = typeof dbType;

interface SessionResponse {
    id: string;
    userId: string;
    expiresAt: Date;
    token?: string;
    data?: {
        clinicId?: string;
    };
}

interface ClinicOption {
    id: string;
    name: string;
}

interface SelectClinicRequest {
    clinicId: string;
}

interface SelectClinicResponse {
    success: boolean;
    message: string;
    session?: SessionResponse;
}

interface AvailableClinicsResponse {
    clinics: ClinicOption[];
    selectedClinicId?: string;
    selectedProfessionalUnitId?: string;
}

export const createSessionRoutes = (db: DatabaseClient) => {
    const accessChecker = createClinicAccessChecker(db);
    const isProduction = process.env.NODE_ENV === "production";
    const betterAuthBaseUrl = process.env.BETTER_AUTH_BASE_URL ?? (process.env.NODE_ENV === "test" ? "http://localhost:3333" : undefined);
    const useSecureCookies = Boolean(betterAuthBaseUrl && new URL(betterAuthBaseUrl).protocol === "https:");
    const selectedClinicCookieOptions = {
        httpOnly: true,
        secure: useSecureCookies,
        sameSite: "lax" as const,
        path: "/",
        maxAge: 60 * 60 * 24,
    };

    const setSelectedClinicCookie = (context: { set: { cookie?: Record<string, unknown> } }, clinicId: string) => {
        context.set.cookie = {
            ...(context.set.cookie ?? {}),
            [selectedClinicCookieName]: {
                value: clinicId,
                ...selectedClinicCookieOptions,
            },
        };
    };

    const setSelectedProfessionalUnitCookie = (
        context: { set: { cookie?: Record<string, unknown> } },
        professionalUnitId: string,
    ) => {
        context.set.cookie = {
            ...(context.set.cookie ?? {}),
            [selectedProfessionalUnitCookieName]: {
                value: professionalUnitId,
                ...selectedClinicCookieOptions,
            },
        };
    };

    return new Elysia({ name: "session-routes", prefix: "/session" })
        /**
         * GET /session/clinics
         * Retorna lista de clínicas disponíveis e a clínica selecionada (se houver)
         */
        .get(
            "/clinics",
            async (context) => {
                const session = await auth.api.getSession({ headers: context.request.headers });

                if (!session?.user) {
                    return context.status(401, {
                        message: "Unauthorized",
                    });
                }

                const userId = session.user.id;
                const clinics = await listAvailableClinics(db, userId);
                const currentClinicId = getClinicIdFromRequest(context.request) ?? undefined;
                const currentProfessionalUnitId = getProfessionalUnitIdFromRequest(context.request) ?? undefined;

                return context.status(200, {
                    clinics,
                    selectedClinicId: currentClinicId,
                    selectedProfessionalUnitId: currentProfessionalUnitId,
                } satisfies AvailableClinicsResponse);
            },
            {
                detail: {
                    summary: "List available clinics for authenticated user",
                    description:
                        "Returns all clinics linked to the authenticated user via professional_units table, along with the currently selected clinic (if any).",
                    tags: ["Session Management"],
                },
                response: {
                    200: t.Object({
                        clinics: t.Array(
                            t.Object({
                                id: t.String({ format: "uuid" }),
                                name: t.String(),
                            }),
                        ),
                        selectedClinicId: t.Optional(t.String({ format: "uuid" })),
                        selectedProfessionalUnitId: t.Optional(t.String({ format: "uuid" })),
                    }),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                },
            },
        )

        /**
         * POST /session/select-clinic
         * Seleciona uma clínica para a sessão atual.
         * Valida se o usuário tem acesso a essa clínica antes de armazenar.
         */
        .post(
            "/select-clinic",
            async (context) => {
                const { body, request, status } = context;
                const session = await auth.api.getSession({ headers: request.headers });

                if (!session?.user) {
                    return status(401, {
                        message: "Unauthorized",
                    });
                }

                const userId = session.user.id;
                const { clinicId } = body;

                // Valida que o usuário tem acesso a essa clínica
                const hasAccess = await accessChecker(userId, clinicId);

                if (!hasAccess) {
                    return status(403, {
                        success: false,
                        message: "You do not have access to this clinic",
                    } satisfies SelectClinicResponse);
                }

                const professionalUnitId = await findProfessionalUnitIdForUserAndClinic(db, userId, clinicId);

                if (!professionalUnitId) {
                    throw new Error("Failed to resolve professional unit for selected clinic");
                }

                setSelectedClinicCookie(context, clinicId);
                setSelectedProfessionalUnitCookie(context, professionalUnitId);

                /**
                 * Atualiza a sessão com o clinicId
                 * 
                 * TODO: Implementar atualização via Better Auth custom sessionData
                 * Opção 1: Usar auth.api.updateSession com sessionData
                 * Opção 2: Re-emitir JWT com clinicId
                 * 
                 * Por enquanto, retorna sucesso e o frontend deve redirecionar
                 * para /session para atualizar a sessão no navegador
                 */

                return status(200, {
                    success: true,
                    message: "Clinic selected successfully. Please refresh your session.",
                } satisfies SelectClinicResponse);
            },
            {
                body: t.Object({
                    clinicId: t.String({ format: "uuid" }),
                }),
                detail: {
                    summary: "Select a clinic for the current session",
                    description:
                        "Updates the session to include the selected clinic ID. Validates that the user has access to the clinic via professional_units.",
                    tags: ["Session Management"],
                },
                response: {
                    200: t.Object({
                        success: t.Literal(true),
                        message: t.String(),
                        session: t.Optional(
                            t.Object({
                                id: t.String(),
                                userId: t.String(),
                                expiresAt: t.Date(),
                                token: t.Optional(t.String()),
                                data: t.Optional(
                                    t.Object({
                                        clinicId: t.Optional(t.String()),
                                    }),
                                ),
                            }),
                        ),
                    }),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({
                        success: t.Literal(false),
                        message: t.String(),
                    }),
                },
            },
        )

        /**
         * POST /session/switch-clinic
         * Muda a clínica selecionada (para usuários com múltiplas clínicas)
         * Mesmo que select-clinic mas com semântica de "trocar"
         */
        .post(
            "/switch-clinic",
            async (context) => {
                const { body, request, status } = context;
                const session = await auth.api.getSession({ headers: request.headers });

                if (!session?.user) {
                    return status(401, {
                        message: "Unauthorized",
                    });
                }

                const userId = session.user.id;
                const { clinicId } = body;

                const hasAccess = await accessChecker(userId, clinicId);

                if (!hasAccess) {
                    return status(403, {
                        success: false,
                        message: "You do not have access to this clinic",
                    } satisfies SelectClinicResponse);
                }

                const professionalUnitId = await findProfessionalUnitIdForUserAndClinic(db, userId, clinicId);

                if (!professionalUnitId) {
                    throw new Error("Failed to resolve professional unit for selected clinic");
                }

                setSelectedClinicCookie(context, clinicId);
                setSelectedProfessionalUnitCookie(context, professionalUnitId);

                return status(200, {
                    success: true,
                    message: "Clinic switched successfully. Please refresh your session.",
                } satisfies SelectClinicResponse);
            },
            {
                body: t.Object({
                    clinicId: t.String({ format: "uuid" }),
                }),
                detail: {
                    summary: "Switch to a different clinic",
                    description:
                        "Changes the active clinic in the current session. Validates access before allowing the switch.",
                    tags: ["Session Management"],
                },
                response: {
                    200: t.Object({
                        success: t.Literal(true),
                        message: t.String(),
                    }),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                    403: t.Object({
                        success: t.Literal(false),
                        message: t.String(),
                    }),
                },
            },
        );
};
