import { z } from "zod";
import { and, eq } from "drizzle-orm";
import type { db as dbType } from "../../db/client.js";
import { professionals } from "../../db/schema/professionals.js";
import { professionalUnits } from "../../db/schema/professional-units.js";
import { DomainError } from "./domain-error.js";

export const trustedOrigins = [
    "https://dev-alfamed.vercel.app",
    "https://web-alfamed.vercel.app",
    "http://localhost:5173",
    "http://localhost:53441",
];

export function getAuthenticatedUserId(context: { user?: { id?: string } }) {
    return context.user?.id ?? null;
}

export async function assertUserHasUnitAccess(
    userId: string,
    unitId: string,
    hasAccessChecker: (userId: string, unitId: string) => Promise<boolean>,
) {
    const hasAccess = await hasAccessChecker(userId, unitId);

    if (!hasAccess) {
        throw new DomainError("FORBIDDEN", "Forbidden");
    }
}

type DatabaseClient = typeof dbType;

export function createHasUserAccessToUnitChecker(db: DatabaseClient) {
    return async (userId: string, unitId: string) => {
        const [professional] = await db
            .select({ professionalId: professionals.id })
            .from(professionals)
            .where(eq(professionals.userId, userId))
            .limit(1);

        if (!professional) {
            return false;
        }

        const [result] = await db
            .select({ id: professionalUnits.id })
            .from(professionalUnits)
            .where(
                and(
                    eq(professionalUnits.professionalId, professional.professionalId),
                    eq(professionalUnits.unitId, unitId),
                ),
            )
            .limit(1);

        return !!result;
    };
}
