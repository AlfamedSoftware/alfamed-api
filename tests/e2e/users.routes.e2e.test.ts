import { describe, expect, it } from "vitest";
import Elysia from "elysia";
import { buildApp } from "@/app";
import type { UserProfile } from "@/modules/users/users.repository";
import { userProfileSchema, usersErrorSchema } from "@/modules/users/users.schemas";

interface UsersRepositoryContract {
    getUserById(userId: string): Promise<UserProfile | null>;
}

class InMemoryUsersRepository implements UsersRepositoryContract {
    constructor(private readonly users: Record<string, UserProfile>) { }

    async getUserById(userId: string): Promise<UserProfile | null> {
        return this.users[userId] ?? null;
    }
}

const fakeAuthPlugin = new Elysia().macro({
    auth: {
        async resolve({ request, status }) {
            const userId = request.headers.get("x-user-id");

            if (!userId) {
                return status(401, { message: "Unauthorized" });
            }

            return { user: { id: userId } };
        },
    },
});

describe("Users routes", () => {
    it("GET /users/:id deve retornar usuário por id", async () => {
        const existingUserId = "019c1a3e-e425-7000-8bda-cdfec32c8fed";

        const app = await buildApp({
            authPlugin: fakeAuthPlugin,
            withDocs: false,
            usersRepository: new InMemoryUsersRepository({
                [existingUserId]: {
                    user: {
                        id: existingUserId,
                        name: "Joao",
                        email: "joao@alfamed.com",
                        emailVerified: false,
                        image: null,
                        createdAt: "2026-02-01T17:27:35.202Z",
                        updatedAt: "2026-02-01T17:27:35.202Z",
                        twoFactorEnabled: false,
                    },
                },
            }),
        });

        const response = await app.handle(
            new Request(`http://localhost/users/${existingUserId}`, {
                headers: { "x-user-id": existingUserId },
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(() => userProfileSchema.parse(body)).not.toThrow();
        expect(body).toMatchObject({
            user: { id: existingUserId },
        });
    });

    it("GET /users/:id deve retornar 404 quando usuário não existir", async () => {
        const missingUserId = "019c1a3e-e425-7000-8bda-cdfec32c8fea";

        const app = await buildApp({
            authPlugin: fakeAuthPlugin,
            withDocs: false,
            usersRepository: new InMemoryUsersRepository({}),
        });

        const response = await app.handle(
            new Request(`http://localhost/users/${missingUserId}`, {
                headers: { "x-user-id": missingUserId },
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(404);
        expect(() => usersErrorSchema.parse(body)).not.toThrow();
    });

    it("GET /users/:id deve retornar 403 quando id da rota for diferente do token", async () => {
        const tokenUserId = "019c1a3e-e425-7000-8bda-cdfec32c8fed";
        const otherUserId = "019c1a3e-e425-7000-8bda-cdfec32c8fea";

        const app = await buildApp({
            authPlugin: fakeAuthPlugin,
            withDocs: false,
            usersRepository: new InMemoryUsersRepository({
                [tokenUserId]: {
                    user: {
                        id: tokenUserId,
                        name: "Joao",
                        email: "joao@alfamed.com",
                        emailVerified: false,
                        image: null,
                        createdAt: "2026-02-01T17:27:35.202Z",
                        updatedAt: "2026-02-01T17:27:35.202Z",
                        twoFactorEnabled: false,
                    },
                },
            }),
        });

        const response = await app.handle(
            new Request(`http://localhost/users/${otherUserId}`, {
                headers: { "x-user-id": tokenUserId },
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(() => usersErrorSchema.parse(body)).not.toThrow();
        expect(body).toMatchObject({ message: "Forbidden" });
    });

    it("GET /users/:id deve retornar 401 quando não autenticado", async () => {
        const existingUserId = "019c1a3e-e425-7000-8bda-cdfec32c8fed";

        const app = await buildApp({
            authPlugin: fakeAuthPlugin,
            withDocs: false,
            usersRepository: new InMemoryUsersRepository({}),
        });

        const response = await app.handle(new Request(`http://localhost/users/${existingUserId}`));
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(() => usersErrorSchema.parse(body)).not.toThrow();
    });
});
