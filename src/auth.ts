import { betterAuth } from "better-auth";
import { SESSION_EXPIRY_SECONDS, TRUSTED_ORIGINS } from "./config/session.js";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI, twoFactor } from "better-auth/plugins";
import { compare, hash } from "bcryptjs";
import { db } from "./db/client.js";
import { users } from "./db/schema/users.js";
import { eq } from "drizzle-orm";
import { professionals } from "./db/schema/professionals.js";
import { professionalUnits } from "./db/schema/professional-units.js";
import { professionalUnitRoles } from "./db/schema/professional-unit-roles.js";
import { roles } from "./db/schema/roles.js";
import { APIError } from "better-call";

const isTestEnv =
    process.env.NODE_ENV === "test" ||
    process.env.VITEST === "true" ||
    process.env.BUN_TEST === "1";

const betterAuthSecret = process.env.BETTER_AUTH_SECRET ?? (isTestEnv ? "test-secret" : undefined);
const betterAuthBaseUrl = process.env.BETTER_AUTH_BASE_URL ?? (isTestEnv ? "http://localhost:3333" : undefined);

if (!betterAuthSecret) {
    throw new Error("BETTER_AUTH_SECRET is required. Set it in the environment variables for Vercel and local development.");
}

if (!betterAuthBaseUrl) {
    throw new Error("BETTER_AUTH_BASE_URL is required. Set it in the environment variables for Vercel and local development.");
}

export const auth = betterAuth({
    basePath: "/auth",
    baseURL: betterAuthBaseUrl,
    secret: betterAuthSecret,
    trustedOrigins: TRUSTED_ORIGINS,
    user: {
        additionalFields: {
            cpf: {
                type: "string",
                required: true,
                fieldName: "cpf",
            },
            phone: {
                type: "string",
                required: true,
                fieldName: "phone",
            },
            birthdate: {
                type: "date",
                required: true,
                fieldName: "birthdate",
                transform: {
                    input: (value) => {
                        if (value instanceof Date) {
                            return value;
                        }

                        if (typeof value === "string" || typeof value === "number") {
                            return new Date(value);
                        }

                        return value;
                    },
                },
            },
        },
    },
    plugins: [
        openAPI(),
        twoFactor()
    ],
    session: {
        expiresIn: SESSION_EXPIRY_SECONDS,
        updateAge: 0,
        cookieCache: {
            enabled: true,
            maxAge: SESSION_EXPIRY_SECONDS,
        },
    },
    database: drizzleAdapter(db, {
        provider: "pg",
        usePlural: true,
    }),
    emailAndPassword: {
        enabled: true,
        autoSignIn: false,
        password: {
            hash: (password: string) => hash(password, 12),
            verify: ({ password, hash: hashedPassword }) => compare(password, hashedPassword),
        },
    },
    hooks: {
        async before(context) {
            const ctxAny = context as any;

            const path = typeof ctxAny.path === "string" ? ctxAny.path : (typeof ctxAny.request?.url === "string" ? ctxAny.request.url : undefined);
            if (path && path.includes("sign-in")) {
                try {
                    const payload = ctxAny.body ?? (ctxAny.request && typeof ctxAny.request.json === "function" ? await ctxAny.request.json().catch(() => null) : null);
                    const email = payload?.email ?? payload?.identifier ?? null;
                    const callbackURL = typeof payload?.callbackURL === "string" ? payload.callbackURL : "";
                    const isServiceDeskLogin = callbackURL.includes("/admin/") || path.includes("/admin/");

                    if (email && typeof email === "string") {
                        const found = await db.select().from(users).where(eq(users.email, email)).limit(1);
                        if (found.length > 0) {
                            const user = found[0];
                            if (!user.isActive) {
                                throw new APIError("UNAUTHORIZED", { message: "User account is inactive" });
                            }

                            const professional = await db
                                .select()
                                .from(professionals)
                                .where(eq(professionals.userId, user.id))
                                .limit(1);

                            if (professional.length > 0 && !professional[0].isActive) {
                                throw new APIError("UNAUTHORIZED", { message: "Professional account is inactive" });
                            }

                            if (isServiceDeskLogin && professional.length > 0) {
                                const prof = professional[0];

                                const rows = await db
                                    .select()
                                    .from(professionalUnitRoles)
                                    .innerJoin(professionalUnits, eq(professionalUnitRoles.professionalUnitId, professionalUnits.id))
                                    .innerJoin(roles, eq(professionalUnitRoles.roleId, roles.id))
                                    .where(eq(professionalUnits.professionalId, prof.id))
                                    .limit(1);

                                const hasInternalAlfamed = rows.some((r: any) => {
                                    try {
                                        return r?.roles?.key === "internal_alfamed";
                                    } catch {
                                        return false;
                                    }
                                });

                                if (!hasInternalAlfamed) {
                                    throw new APIError("UNAUTHORIZED", { message: "User lacks internal Alfamed role" });
                                }
                            }
                        }
                    }
                } catch (e) {
                    if (e instanceof APIError) throw e;
                }
            }

            return context;
        },
        // No after-hook: keep validation only in before-hook (login)
    },
    advanced: {
        database: {
            generateId: false,
        },
        defaultCookieAttributes: {
            secure: true,
            sameSite: "none",
            httpOnly: true,
        }
    },
});