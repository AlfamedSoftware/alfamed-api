import Elysia, { t } from "elysia";
import type { db as dbType } from "../../db/client.js";
import { auth } from "../../auth.js";
import {
    getUnitIdFromRequest,
    getProfessionalUnitIdFromRequest,
    selectedUnitCookieName,
    selectedProfessionalUnitCookieName,
} from "../../http/plugins/unit-context.js";
import { findProfessionalUnitIdForUserAndUnit } from "../units/units.repository.js";
import { createHasUserAccessToUnitChecker } from "../../http/plugins/unit-access.js";
import { UnitsRepository } from "../units/units.repository.js";
import { UnitsService } from "../units/units.service.js";
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
    roles: {
        id: string;
        description: string;
        key: string;
    };
}

interface SelectUnitResponse {
    success: boolean;
    message: string;
    session?: SessionResponse;
}

interface AvailableUnitsResponse {
    units: UnitOption[];
}

interface SessionUnitResponse {
    selectedUnitId?: string;
    selectedUnitName?: string;
    selectedProfessionalUnitId?: string;
    selectedRoles?: {
        id: string;
        description: string;
        key: string;
    };
}

export const createSessionRoutes = (db: DatabaseClient) => {
    const accessChecker = createHasUserAccessToUnitChecker(db);
    const unitsService = new UnitsService(new UnitsRepository(db), accessChecker);
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
        .get(
            "/list-units-acessable-by-professional",
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
                const units = await unitsService.listAccessibleUnitsByProfessional(userId);
                const unitsAsObjects = units.map((unit) => ({
                    id: unit.id,
                    name: unit.name,
                    roles: unit.roles[0],
                }));

                return context.status(200, {
                    units: unitsAsObjects,
                } satisfies AvailableUnitsResponse);
            },
            {
                detail: {
                    summary: "List units accessible by professional",
                    description:
                        "Returns all active units linked to the authenticated professional with at least one active role, along with the currently selected unit (if any).",
                    tags: ["Session Management"],
                },
                response: {
                    200: t.Object({
                        units: t.Array(
                            t.Object({
                                id: t.String({ format: "uuid" }),
                                name: t.String(),
                                roles: t.Object({
                                    id: t.String({ format: "uuid" }),
                                    description: t.String(),
                                    key: t.String(),
                                }),
                            }),
                        ),
                    }),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                },
            },
        )
        .get(
            "/get-session-unit",
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

                const selectedUnitId = getUnitIdFromRequest(context.request) ?? undefined;
                const selectedProfessionalUnitId = getProfessionalUnitIdFromRequest(context.request) ?? undefined;

                if (!selectedUnitId || !selectedProfessionalUnitId) {
                    return context.status(200, {
                        selectedUnitId,
                        selectedProfessionalUnitId,
                    } satisfies SessionUnitResponse);
                }

                const units = await unitsService.listAccessibleUnitsByProfessional(session.user.id);
                const selectedUnit = units.find((unit) => unit.id === selectedUnitId);

                return context.status(200, {
                    selectedUnitId,
                    selectedProfessionalUnitId,
                    selectedUnitName: selectedUnit?.name,
                    selectedRoles: selectedUnit?.roles[0],
                } satisfies SessionUnitResponse);
            },
            {
                detail: {
                    summary: "Get current session unit",
                    description: "Returns the selected unit IDs and the selected unit details from the current session/professional.",
                    tags: ["Session Management"],
                },
                response: {
                    200: t.Object({
                        selectedUnitId: t.Optional(t.String({ format: "uuid" })),
                        selectedUnitName: t.Optional(t.String()),
                        selectedProfessionalUnitId: t.Optional(t.String({ format: "uuid" })),
                        selectedRoles: t.Optional(
                            t.Object({
                                id: t.String({ format: "uuid" }),
                                description: t.String(),
                                key: t.String(),
                            }),
                        ),
                    }),
                    401: t.Object({ message: t.Literal("Unauthorized") }),
                },
            },
        )
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

                return status(200, {
                    success: true,
                    message: "Unit selected successfully.",
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
