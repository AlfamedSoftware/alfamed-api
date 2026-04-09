import Elysia, { t } from "elysia";
import { auth } from "../../auth.js";

export const betterAuthPlugin = new Elysia({ name: "better-auth" })
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
                const session = await auth.api.getSession({ headers })

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