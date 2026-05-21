/**
 * Unit Context Plugin
 * 
 * Gerencia a seleção de unidade a partir da sessão do Better Auth.
 * - Extrai unitId da sessão autenticada
 * - Injeta unitId no contexto de cada request
 * - Bloqueia requests sem unitId definido (após autenticação)
 * - Fornece helpers para validar acesso à unidade
 */

import type { db as dbType } from "../../db/client.js";
import { eq, and } from "drizzle-orm";
import { professionals } from "../../db/schema/professionals.js";
import { professionalUnits } from "../../db/schema/professional-units.js";
import type { Session } from "better-auth";

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

/**
 * Extrai o unitId da sessão
 */
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

export function getUnitIdFromRequest(request: Request): string | null {
    const cookieHeader = request.headers.get("cookie");

    if (!cookieHeader) {
        return null;
    }

    const cookies = cookieHeader
        .split(";")
        .map((cookie) => cookie.trim())
        .map((cookie) => {
            const separatorIndex = cookie.indexOf("=");

            if (separatorIndex <= 0) {
                return null;
            }

            const key = cookie.slice(0, separatorIndex).trim();
            const value = cookie.slice(separatorIndex + 1);

            return { key, value };
        })
        .filter((cookie): cookie is { key: string; value: string } => cookie !== null);

    const selectedUnitCookie = cookies.find(
        (cookie) =>
            cookie.key === selectedUnitCookieName ||
            cookie.key.toLowerCase() === selectedUnitCookieName.toLowerCase(),
    );

    if (!selectedUnitCookie?.value) {
        return null;
    }

    const encodedValue = selectedUnitCookie.value;

    try {
        return decodeURIComponent(encodedValue);
    } catch {
        return encodedValue;
    }
}

export function getProfessionalUnitIdFromRequest(request: Request): string | null {
    const cookieHeader = request.headers.get("cookie");

    if (!cookieHeader) {
        return null;
    }

    const cookies = cookieHeader
        .split(";")
        .map((cookie) => cookie.trim())
        .map((cookie) => {
            const separatorIndex = cookie.indexOf("=");

            if (separatorIndex <= 0) {
                return null;
            }

            const key = cookie.slice(0, separatorIndex).trim();
            const value = cookie.slice(separatorIndex + 1);

            return { key, value };
        })
        .filter((cookie): cookie is { key: string; value: string } => cookie !== null);

    const selectedProfessionalUnitCookie = cookies.find(
        (cookie) =>
            cookie.key === selectedProfessionalUnitCookieName ||
            cookie.key.toLowerCase() === selectedProfessionalUnitCookieName.toLowerCase(),
    );

    if (!selectedProfessionalUnitCookie?.value) {
        return null;
    }

    const encodedValue = selectedProfessionalUnitCookie.value;

    try {
        return decodeURIComponent(encodedValue);
    } catch {
        return encodedValue;
    }
}

/**
 * Factory para criar checker de acesso à clínica
 */
export function createUnitAccessChecker(db: DatabaseClient) {
    return async (userId: string, unitId: string): Promise<boolean> => {
        const professionalUnitId = await findProfessionalUnitIdForUserAndUnit(db, userId, unitId);

        return professionalUnitId !== null;
    };
}

export async function findProfessionalUnitIdForUserAndUnit(
    db: DatabaseClient,
    userId: string,
    unitId: string,
): Promise<string | null> {
    const [professional] = await db
        .select({ id: professionals.id })
        .from(professionals)
        .where(eq(professionals.userId, userId))
        .limit(1);

    if (!professional) {
        return null;
    }

    const [access] = await db
        .select({ id: professionalUnits.id })
        .from(professionalUnits)
        .where(
            and(
                    eq(professionalUnits.professionalId, professional.id),
                    eq(professionalUnits.unitId, unitId),
                    eq(professionalUnits.isActive, true),
                ),
        )
        .limit(1);

    return access?.id ?? null;
}

/**
 * Validar e criar contexto de clínica
 * Checa se o usuário tem acesso à clínica antes de criar o contexto
 */
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
