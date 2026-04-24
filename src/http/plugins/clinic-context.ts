/**
 * Clinic Context Plugin
 * 
 * Gerencia a seleção de clínica a partir da sessão do Better Auth.
 * - Extrai clinicId da sessão autenticada
 * - Injeta clinicId no contexto de cada request
 * - Bloqueia requests sem clinicId definido (após autenticação)
 * - Fornece helpers para validar acesso à clínica
 */

import type { db as dbType } from "../../db/client.js";
import { eq, and } from "drizzle-orm";
import { professionals } from "../../db/schema/professionals.js";
import { professionalUnits } from "../../db/schema/professional-units.js";
import { units } from "../../db/schema/units.js";
import type { Session } from "better-auth";

type DatabaseClient = typeof dbType;

export interface SessionWithClinic extends Session {
    data?: {
        clinicId?: string;
    };
}

export interface ClinicContext {
    clinicId: string;
    userId: string;
}

export const selectedClinicCookieName = "selectedClinicId";
const legacySelectedClinicCookieName = "selectedClinicid";

/**
 * Extrai o clinicId da sessão
 */
export function getClinicIdFromSession(session: Session | null): string | null {
    if (!session) return null;

    // Better Auth serializa campos adicionais diretamente na sessão
    const clinicId = (session as SessionWithClinic).session?.clinicId ?? (session as SessionWithClinic).clinicId;

    return clinicId ?? null;
}

export function getClinicIdFromRequest(request: Request): string | null {
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

    const selectedClinicCookie = cookies.find(
        (cookie) =>
            cookie.key === selectedClinicCookieName ||
            cookie.key.toLowerCase() === selectedClinicCookieName.toLowerCase() ||
            cookie.key === legacySelectedClinicCookieName,
    );

    if (!selectedClinicCookie?.value) {
        return null;
    }

    const encodedValue = selectedClinicCookie.value;

    try {
        return decodeURIComponent(encodedValue);
    } catch {
        return encodedValue;
    }
}

/**
 * Factory para criar checker de acesso à clínica
 */
export function createClinicAccessChecker(db: DatabaseClient) {
    return async (userId: string, clinicId: string): Promise<boolean> => {
        // Valida que o usuário (via seu professional) tem acesso a essa clínica
        const [professional] = await db
            .select({ id: professionals.id })
            .from(professionals)
            .where(eq(professionals.userId, userId))
            .limit(1);

        if (!professional) {
            return false;
        }

        const [access] = await db
            .select({ id: professionalUnits.id })
            .from(professionalUnits)
            .where(
                and(
                    eq(professionalUnits.professionalId, professional.id),
                    eq(professionalUnits.unitId, clinicId),
                ),
            )
            .limit(1);

        return !!access;
    };
}

/**
 * Listar clínicas disponíveis para o usuário
 */
export async function listAvailableClinics(
    db: DatabaseClient,
    userId: string,
): Promise<Array<{ id: string; name: string }>> {
    const [professional] = await db
        .select({ id: professionals.id })
        .from(professionals)
        .where(eq(professionals.userId, userId))
        .limit(1);

    if (!professional) {
        return [];
    }

    const clinics = await db
        .select({
            id: units.id,
            name: units.name,
        })
        .from(units)
        .innerJoin(
            professionalUnits,
            and(
                eq(professionalUnits.unitId, units.id),
                eq(professionalUnits.professionalId, professional.id),
            ),
        );

    return clinics;
}

/**
 * Validar e criar contexto de clínica
 * Checa se o usuário tem acesso à clínica antes de criar o contexto
 */
export async function createClinicContext(
    db: DatabaseClient,
    userId: string,
    clinicId: string,
): Promise<ClinicContext | null> {
    const hasAccess = await createClinicAccessChecker(db)(userId, clinicId);

    if (!hasAccess) {
        return null;
    }

    return {
        clinicId,
        userId,
    };
}
