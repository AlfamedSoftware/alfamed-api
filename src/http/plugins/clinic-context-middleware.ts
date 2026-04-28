/**
 * Clinic Context Middleware
 * 
 * Middleware que:
 * 1. Extrai clinicId da sessão autenticada
 * 2. Injeta no contexto da request para uso em handlers
 * 3. Bloqueia requests que exigem clinicId mas não possuem
 * 
 * Uso em rotas:
 * ```
 * .guard(clinicContextMiddleware(db))
 * .get("/patients", ({ clinicId }) => ...)
 * ```
 */

import Elysia from "elysia";
import type { db as dbType } from "../../db/client.js";
import { auth } from "../../auth.js";
import { getClinicIdFromSession } from "./clinic-context.js";

type DatabaseClient = typeof dbType;

export interface ClinicContextState {
    clinicId?: string;
}

/**
 * Middleware que injeta clinicId no contexto
 * 
 * Adiciona clinicId ao store da request se disponível na sessão
 */
export function createClinicContextMiddleware(db: DatabaseClient) {
    return new Elysia({ name: "clinic-context-middleware" }).derive(
        async ({ request, store }) => {
            const session = await auth.api.getSession({ headers: request.headers });
            const clinicId = getClinicIdFromSession(session);

            return {
                clinicId,
                // Adicionar user para facilitar acesso
                user: session?.user ?? null,
            };
        },
    );
}

/**
 * Guard que bloqueia requests sem clinicId definido
 * Use em rotas que EXIGEM clinicId
 * 
 * Exemplo:
 * ```
 * .guard(
 *   {
 *     response: t.Object({ message: t.String() }),
 *   },
 *   ({ clinicId, status }) => {
 *     if (!clinicId) {
 *       return status(403, { message: "Clinic not selected" });
 *     }
 *   }
 * )
 * .get("/protected-route", ...)
 * ```
 */
export function requireClinicId() {
    return ({ clinicId, status }: any) => {
        if (!clinicId) {
            return status(403, {
                message:
                    "Clinic ID not found in session. Please select a clinic first using POST /session/select-clinic",
            });
        }
    };
}
