import { z } from "zod";

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
    hasAccessChecker: (userId: string, unitId: string) => Promise<boolean>,
) {
    const hasAccess = await hasAccessChecker(userId, unitId);

    if (!hasAccess) {
        throw new Error("Forbidden");
    }
}
