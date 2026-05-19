/**
 * Unit Context Middleware
 * 
 * Middleware que:
 * 1. Extrai unitId da sessão autenticada
 * 2. Injeta no contexto da request para uso em handlers
 * 3. Bloqueia requests que exigem unitId mas não possuem
 * 
 * Uso em rotas:
 * ```
 * .guard(unitContextMiddleware(db))
 * .get("/patients", ({ unitId }) => ...)
 * ```
 */

import Elysia from "elysia";
import type { db as dbType } from "../../db/client.js";
import { auth } from "../../auth.js";
import { getUnitIdFromSession } from "./unit-context.js";

type DatabaseClient = typeof dbType;

export interface UnitContextState {
    unitId?: string;
}

/**
 * Middleware que injeta unitId no contexto
 * 
 * Adiciona unitId ao store da request se disponível na sessão
 */
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

/**
 * Guard que bloqueia requests sem unitId definido
 * Use em rotas que EXIGEM unitId
 * 
 * Exemplo:
 * ```
 * .guard(
 *   {
 *     response: t.Object({ message: t.String() }),
 *   },
 *   ({ unitId, status }) => {
 *     if (!unitId) {
 *       return status(403, { message: "Unit not selected" });
 *     }
 *   }
 * )
 * .get("/protected-route", ...)
 * ```
 */
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
