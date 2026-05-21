import { auth } from "../../auth.js";
import {
    selectedProfessionalUnitCookieName,
    selectedUnitCookieName,
    getUnitIdFromRequest,
    getProfessionalUnitIdFromRequest,
} from "./unit-context.js";
import { getCookieValueFromRequest } from "./cookie-helpers.js";
import {
    IS_PRODUCTION,
    SELECTED_UNIT_COOKIE_MAX_AGE_SECONDS,
    SESSION_EXPIRY_SECONDS,
} from "../../config/session.js";

const betterAuthSessionTokenCookieName = "better-auth.session_token";
const betterAuthSessionDataCookieName = "better-auth.session_data";

/**
 * Helper to renew session and unit cookies
 * Call this in route handlers or guards to refresh cookie expiry
 */
export async function renewSessionCookies(
    request: Request,
    set: Record<string, any>
) {
    try {
        // Check if user is authenticated
        const session = await auth.api.getSession({
            headers: request.headers,
            query: {
                disableCookieCache: true,
            },
        });

        if (!session?.user) {
            return;
        }

        set.cookie = set.cookie || {};

        const sessionToken = getCookieValueFromRequest(request, betterAuthSessionTokenCookieName);
        if (sessionToken) {
            set.cookie[betterAuthSessionTokenCookieName] = {
                value: sessionToken,
                httpOnly: true,
                secure: IS_PRODUCTION,
                sameSite: (IS_PRODUCTION ? "none" : "lax") as "lax" | "none",
                path: "/",
                maxAge: SESSION_EXPIRY_SECONDS,
            };
        }

        const sessionData = getCookieValueFromRequest(request, betterAuthSessionDataCookieName);
        if (sessionData) {
            set.cookie[betterAuthSessionDataCookieName] = {
                value: sessionData,
                httpOnly: true,
                secure: IS_PRODUCTION,
                sameSite: (IS_PRODUCTION ? "none" : "lax") as "lax" | "none",
                path: "/",
                maxAge: SESSION_EXPIRY_SECONDS,
            };
        }

        // Renew unit cookie if exists
        const unitId = getUnitIdFromRequest(request);
        if (unitId) {
            set.cookie[selectedUnitCookieName] = {
                value: unitId,
                httpOnly: true,
                secure: IS_PRODUCTION,
                sameSite: (IS_PRODUCTION ? "none" : "lax") as "lax" | "none",
                path: "/",
                maxAge: SELECTED_UNIT_COOKIE_MAX_AGE_SECONDS,
            };
        }

        // Renew professional unit cookie if exists
        const professionalUnitId = getProfessionalUnitIdFromRequest(request);
        if (professionalUnitId) {
            set.cookie[selectedProfessionalUnitCookieName] = {
                value: professionalUnitId,
                httpOnly: true,
                secure: IS_PRODUCTION,
                sameSite: (IS_PRODUCTION ? "none" : "lax") as "lax" | "none",
                path: "/",
                maxAge: SELECTED_UNIT_COOKIE_MAX_AGE_SECONDS,
            };
        }

        // Still call Better Auth session read to keep backend session lifecycle active.
        await auth.api.getSession({
            headers: request.headers,
            query: {
                disableCookieCache: true,
            },
        });
    } catch {
        // Silently ignore renewal failures to avoid impacting request flow.
    }
}
