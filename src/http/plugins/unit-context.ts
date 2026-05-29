import type { db as dbType } from "../../db/client.js";
import type { Session } from "better-auth";
import { parseCookieHeader } from "./cookie-helpers.js";
import { findProfessionalUnitIdForUserAndUnit } from "../../modules/units/units.repository.js";

type DatabaseClient = typeof dbType;

export interface SessionWithUnit extends Session {
    session?: {
        unitId?: string;
    };
    unitId?: string;
    data?: {
        unitId?: string;
    };
}

export interface UnitContext {
    unitId: string;
    userId: string;
}

export const selectedUnitCookieName = "selectedUnitId";
export const selectedProfessionalUnitCookieName = "selectedProfessionalUnitId";

type BetterAuthSessionResult = {
    session: Session;
    user: unknown;
};

export function getUnitIdFromSession(sessionResult: Session | BetterAuthSessionResult | null): string | null {
    if (!sessionResult) return null;

    if ("session" in sessionResult && sessionResult.session) {
        const sessionData = sessionResult.session as SessionWithUnit;
        return sessionData.data?.unitId ?? sessionData.unitId ?? sessionData.session?.unitId ?? null;
    }

    const sessionData = sessionResult as SessionWithUnit;

    return sessionData.data?.unitId ?? sessionData.unitId ?? sessionData.session?.unitId ?? null;
}

function getSelectedCookieValue(request: Request, cookieName: string): string | null {
    const cookies = parseCookieHeader(request.headers.get("cookie"));
    const selectedCookie = cookies.find(
        (cookie) =>
            cookie.key === cookieName ||
            cookie.key.toLowerCase() === cookieName.toLowerCase(),
    );

    if (!selectedCookie?.value) {
        return null;
    }

    try {
        return decodeURIComponent(selectedCookie.value);
    } catch {
        return selectedCookie.value;
    }
}

export function getUnitIdFromRequest(request: Request): string | null {
    return getSelectedCookieValue(request, selectedUnitCookieName);
}

export function getProfessionalUnitIdFromRequest(request: Request): string | null {
    return getSelectedCookieValue(request, selectedProfessionalUnitCookieName);
}

export function createUnitAccessChecker(db: DatabaseClient) {
    return async (userId: string, unitId: string): Promise<boolean> => {
        const professionalUnitId = await findProfessionalUnitIdForUserAndUnit(db, userId, unitId);

        return professionalUnitId !== null;
    };
}

export async function createUnitContext(
    db: DatabaseClient,
    userId: string,
    unitId: string,
): Promise<UnitContext | null> {
    const hasAccess = await createUnitAccessChecker(db)(userId, unitId);

    if (!hasAccess) {
        return null;
    }

    return {
        unitId,
        userId,
    };
}
