import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI, twoFactor } from "better-auth/plugins";
import { compare, hash } from "bcryptjs";
import { db } from "./db/client.js";
import { trustedOrigins } from "./http/plugins/unit-access.js";

const betterAuthSecret = process.env.BETTER_AUTH_SECRET;
const betterAuthBaseUrl = process.env.BETTER_AUTH_BASE_URL;

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
    trustedOrigins,
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
    database: drizzleAdapter(db, {
        provider: "pg",
        usePlural: true,
    }),
    emailAndPassword: {
        enabled: true,
        autoSignIn: true,
        password: {
            hash: (password: string) => hash(password, 12),
            verify: ({ password, hash: hashedPassword }) => compare(password, hashedPassword),
        },
    },
    advanced: {
        database: {
            generateId: false,
        },
        session: {
            expiresIn: 60 * 60 * 24,
            cookieCache: {
                enabled: true,
                maxAge: 60 * 5,
            }
        },
        defaultCookieAttributes: {
            secure: true,
            sameSite: "none",
            httpOnly: true,
        }
    },
});