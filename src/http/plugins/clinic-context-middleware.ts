import Elysia from "elysia";
import type { db as dbType } from "../../db/client.js";
import { auth } from "../../auth.js";
import { getUnitIdFromSession } from "./unit-context.js";

type DatabaseClient = typeof dbType;

export interface UnitContextState {
    unitId?: string;
}

export function createUnitContextMiddleware(db: DatabaseClient) {
    return new Elysia({ name: "unit-context-middleware" }).derive(
        async ({ request, store }) => {
            const session = await auth.api.getSession({
                headers: request.headers,
                query: {
                    disableCookieCache: true,
                },
            });
            const unitId = getUnitIdFromSession(session);

            return {
                unitId,
                user: session?.user ?? null,
            };
        },
    );
}

export function requireUnitId() {
    return ({ unitId, status }: any) => {
        if (!unitId) {
            return status(403, {
                message:
                    "Unit ID not found in session. Please select a unit first using POST /session/select-unit",
            });
        }
    };
}
