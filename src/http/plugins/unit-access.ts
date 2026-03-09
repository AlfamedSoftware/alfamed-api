import { z } from "zod";
import { and, eq } from "drizzle-orm";
import type { db as dbType } from "@/db/client";
import { professionals } from "@/db/schema/professionals";
import { professionalUnits } from "@/db/schema/professional-units";

export const unitHeaderName = "x-unit-id";
export const invalidOrMissingUnitHeaderMessage = "Invalid or missing unit header";

export function getValidatedUnitIdFromRequest(request: Request) {
    const unitId = request.headers.get(unitHeaderName);
    const parsedUnitId = z.string().uuid().safeParse(unitId);

    if (!parsedUnitId.success) {
        return null;
    }

    return parsedUnitId.data;
}

export async function assertUserHasUnitAccess(
    userId: string,
    unitId: string,
    hasAccessChecker?: (userId: string, unitId: string) => Promise<boolean>,
) {
    if (!hasAccessChecker) {
        throw new Error("Missing unit access checker");
    }

    const hasAccess = await hasAccessChecker(userId, unitId);

    if (!hasAccess) {
        throw new Error("Forbidden");
    }
}

type DatabaseClient = typeof dbType;

export function createHasUserAccessToUnitChecker(db: DatabaseClient) {
    return async (userId: string, unitId: string) => {
        const [result] = await db
            .select({ id: professionals.id })
            .from(professionals)
            .innerJoin(professionalUnits, eq(professionals.id, professionalUnits.professionalId))
            .where(and(eq(professionals.userId, userId), eq(professionalUnits.unitId, unitId)))
            .limit(1);

        return !!result;
    };
}
