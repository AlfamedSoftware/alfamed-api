import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI, twoFactor } from "better-auth/plugins";
import { compare, hash } from "bcryptjs";
import { db } from "./db/client.js";

const betterAuthSecret = process.env.BETTER_AUTH_SECRET;
const betterAuthBaseUrl =
    process.env.BETTER_AUTH_BASE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3333");

if (!betterAuthSecret) {
    throw new Error("BETTER_AUTH_SECRET is required. Set it in the environment variables for Vercel and local development.");
}

const fixedTrustedOrigins = [
    "https://dev-alfamed.vercel.app",
    "https://web-alfamed.vercel.app",
    "http://localhost:5137",
];

const trustedOrigins = [
    ...fixedTrustedOrigins,
    ...(process.env.TRUSTED_ORIGINS ?? "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
];

export const auth = betterAuth({
    basePath: "/auth",
    baseURL: betterAuthBaseUrl,
    secret: betterAuthSecret,
    trustedOrigins: Array.from(new Set(trustedOrigins)),
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
        }
    },
});