import Elysia, { t } from "elysia";
import { auth } from "../../auth.js";
import {
    selectedProfessionalUnitCookieName,
    selectedUnitCookieName,
} from "./unit-context.js";
import { IS_PRODUCTION, TRUSTED_ORIGINS } from "../../config/session.js";

const getExpiredCookieHeader = (name: string) => {
    const secure = IS_PRODUCTION ? "; Secure" : "";
    const sameSite = IS_PRODUCTION ? "; SameSite=None" : "; SameSite=Lax";

    return `${name}=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/${secure}${sameSite}; HttpOnly`;
};

const appendCorsHeaders = (headers: Headers, origin: string | null) => {
    if (!origin || !TRUSTED_ORIGINS.includes(origin)) {
        return;
    }

    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Vary", "Origin");
};

// keep original behavior: use auth.api.getSession within macro or routes

export const betterAuthPlugin = new Elysia({ name: "better-auth" })
    .onRequest(async ({ request }) => {
        const { pathname } = new URL(request.url);

        if (request.method !== "POST" || !pathname.endsWith("/auth/sign-out")) {
            return;
        }

        const response = await auth.handler(request);
        const headers = new Headers(response.headers);
        const origin = request.headers.get("origin");

        headers.append("Set-Cookie", getExpiredCookieHeader(selectedUnitCookieName));
        headers.append("Set-Cookie", getExpiredCookieHeader(selectedProfessionalUnitCookieName));
        appendCorsHeaders(headers, origin);

        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
        });
    })
    .mount(auth.handler)
    .post(
        "/auth/register",
        async ({ body, request }) => {
            const headers = new Headers(request.headers);
            headers.set("content-type", "application/json");

            // Reutiliza o fluxo nativo de cadastro do Better Auth.
            return auth.handler(
                new Request(new URL("/auth/sign-up/email", request.url), {
                    method: "POST",
                    headers,
                    body: JSON.stringify(body),
                }),
            );
        },
        {
            body: t.Object({
                name: t.String({ minLength: 1 }),
                email: t.String({ format: "email" }),
                password: t.String({ minLength: 8 }),
                cpf: t.String({ minLength: 1 }),
                phone: t.String({ minLength: 1 }),
                birthdate: t.String({ format: "date-time" }),
                image: t.Optional(t.String()),
                callbackURL: t.Optional(t.String()),
                rememberMe: t.Optional(t.Boolean()),
            }),
            detail: {
                summary: "Register with email and password",
                description: "Registers a new user by forwarding the request to Better Auth native sign-up endpoint, including required profile fields.",
                tags: ["Better Auth"],
            },
        },
    )
    .macro({
        auth: {
            async resolve({ status, request: { headers } }) {
                const session = await auth.api.getSession({
                    headers,
                    query: {
                        disableCookieCache: true,
                    },
                })

                if (!session) {
                    return status(401, { message: "Unauthorized" })
                }

                return session
            }
        }
    })


let _schema: ReturnType<typeof auth.api.generateOpenAPISchema>
const getSchema = async () => (_schema ??= auth.api.generateOpenAPISchema())

export const OpenAPI = {
    getPaths: (prefix = '/auth') =>
        getSchema().then(({ paths }) => {
            const reference: typeof paths = Object.create(null)

            for (const path of Object.keys(paths)) {
                const key = prefix + path
                reference[key] = paths[path]

                for (const method of Object.keys(paths[path])) {
                    const operation = (reference[key] as any)[method]

                    operation.tags = ['Better Auth']
                }
            }

            return reference
        }) as Promise<any>,
    components: getSchema().then(({ components }) => components) as Promise<any>
} as const