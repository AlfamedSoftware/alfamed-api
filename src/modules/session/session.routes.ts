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
    getUnitIdFromRequest,
    getProfessionalUnitIdFromRequest,
    findProfessionalUnitIdForUserAndUnit,
    selectedUnitCookieName,
    selectedProfessionalUnitCookieName,
    createUnitAccessChecker,
    listAvailableUnits,
} from "../../http/plugins/unit-context.js";
import { SELECTED_UNIT_COOKIE_MAX_AGE_SECONDS, IS_PRODUCTION } from "../../config/session.js";

type DatabaseClient = typeof dbType;

interface SessionResponse {
    id: string;
    userId: string;
    expiresAt: Date;
    token?: string;
    data?: {
        unitId?: string;
    };
}

interface UnitOption {
    id: string;
    name: string;
}

interface SelectUnitRequest {
    unitId: string;
}

interface SelectUnitResponse {
    success: boolean;
    message: string;
    session?: SessionResponse;
}

interface AvailableUnitsResponse {
    units: UnitOption[];
    selectedUnitId?: string;
    selectedProfessionalUnitId?: string;
}

export const createSessionRoutes = (db: DatabaseClient) => {
    const accessChecker = createUnitAccessChecker(db);
    const selectedUnitCookieOptions = {
        httpOnly: true,
        secure: IS_PRODUCTION,
        sameSite: (IS_PRODUCTION ? "none" : "lax") as "none" | "lax",
        path: "/",
        maxAge: SELECTED_UNIT_COOKIE_MAX_AGE_SECONDS,
    };

    const setSelectedUnitCookie = (context: { set: { cookie?: Record<string, unknown> } }, unitId: string) => {
        context.set.cookie = {
            ...(context.set.cookie ?? {}),
            [selectedUnitCookieName]: {
                value: unitId,
                ...selectedUnitCookieOptions,
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
                ...selectedUnitCookieOptions,
            },
        };
    };

    const clearSelectedUnitCookies = (context: { set: { cookie?: Record<string, unknown> } }) => {
        const expiredCookieOptions = {
            httpOnly: true,
            secure: IS_PRODUCTION,
            sameSite: (IS_PRODUCTION ? "none" : "lax") as "none" | "lax",
            path: "/",
            maxAge: 0,
            expires: new Date(0),
        };

        context.set.cookie = {
            ...(context.set.cookie ?? {}),
            [selectedUnitCookieName]: {
                value: "",
                ...expiredCookieOptions,
            },
            [selectedProfessionalUnitCookieName]: {
                value: "",
                ...expiredCookieOptions,
            },
        };
    };

    return new Elysia({ name: "session-routes", prefix: "/session" })
        /**
         * GET /session/units
         * Retorna lista de unidades disponíveis e a unidade selecionada (se houver)
         */
        .get(
            "/units",
            async (context) => {
                const session = await auth.api.getSession({
                    headers: context.request.headers,
                    query: {
                        disableCookieCache: true,
                    },
                });

                if (!session?.user) {
                    clearSelectedUnitCookies(context);

                    return context.status(401, {
                        message: "Unauthorized",
                    });
                }

                const userId = session.user.id;
                const units = await listAvailableUnits(db, userId);
                const currentUnitId = getUnitIdFromRequest(context.request) ?? undefined;
                const currentProfessionalUnitId = getProfessionalUnitIdFromRequest(context.request) ?? undefined;

                return context.status(200, {
                    units,
                    selectedUnitId: currentUnitId,
                    selectedProfessionalUnitId: currentProfessionalUnitId,
                } satisfies AvailableUnitsResponse);
            },
            {
                detail: {
                    summary: "List available units for authenticated user",
                    description:
                        "Returns all units linked to the authenticated user via professional_units table, along with the currently selected unit (if any).",
                    tags: ["Session Management"],
                },
                response: {
                    200: t.Object({
                        units: t.Array(
                            t.Object({
                                id: t.String({ format: "uuid" }),
                                name: t.String(),
                            }),
                        ),
                        selectedUnitId: t.Optional(t.String({ format: "uuid" })),
                        selectedProfessionalUnitId: t.Optional(t.String({ format: "uuid" })),
                    }),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                },
            },
        )

        /**
         * POST /session/select-unit
         * Seleciona uma unidade para a sessão atual.
         * Valida se o usuário tem acesso a essa unidade antes de armazenar.
         */
        .post(
            "/select-unit",
            async (context) => {
                const { body, request, status } = context;
                const session = await auth.api.getSession({
                    headers: request.headers,
                    query: {
                        disableCookieCache: true,
                    },
                });

                if (!session?.user) {
                    clearSelectedUnitCookies(context);

                    return status(401, {
                        message: "Unauthorized",
                    });
                }

                const userId = session.user.id;
                const { unitId } = body;

                // Valida que o usuário tem acesso a essa unidade
                const hasAccess = await accessChecker(userId, unitId);

                if (!hasAccess) {
                    return status(403, {
                        success: false,
                        message: "You do not have access to this unit",
                    } satisfies SelectUnitResponse);
                }

                const professionalUnitId = await findProfessionalUnitIdForUserAndUnit(db, userId, unitId);

                if (!professionalUnitId) {
                    throw new Error("Failed to resolve professional unit for selected unit");
                }

                clearSelectedUnitCookies(context);
                setSelectedUnitCookie(context, unitId);
                setSelectedProfessionalUnitCookie(context, professionalUnitId);

                /**
                 * Atualiza a sessão com o unitId
                 * 
                 * TODO: Implementar atualização via Better Auth custom sessionData
                 * Opção 1: Usar auth.api.updateSession com sessionData
                 * Opção 2: Re-emitir JWT com unitId
                 * 
                 * Por enquanto, retorna sucesso e o frontend deve redirecionar
                 * para /session para atualizar a sessão no navegador
                 */

                return status(200, {
                    success: true,
                    message: "Unit selected successfully. Please refresh your session.",
                } satisfies SelectUnitResponse);
            },
            {
                body: t.Object({
                    unitId: t.String({ format: "uuid" }),
                }),
                detail: {
                    summary: "Select a unit for the current session",
                    description:
                        "Updates the session to include the selected unit ID. Validates that the user has access to the unit via professional_units.",
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
                                        unitId: t.Optional(t.String()),
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
        );
    };
