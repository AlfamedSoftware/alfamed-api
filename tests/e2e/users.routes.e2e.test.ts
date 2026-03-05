import { describe, expect, it } from "vitest";
import Elysia from "elysia";
import { buildApp } from "@/app";
import type { UserProfile, UsersRepository } from "@/modules/users/users.repository";
import { userProfileSchema, usersErrorSchema } from "@/modules/users/users.schemas";

class InMemoryUsersRepository implements UsersRepository {
    constructor(private readonly users: Record<string, UserProfile>) {}

    async findProfileById(userId: string): Promise<UserProfile | null> {
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
    it("GET /users/me deve retornar usuário autenticado", async () => {
        const existingUserId = "019c1a3e-e425-7000-8bda-cdfec32c8fed";

        const app = await buildApp({
            authPlugin: fakeAuthPlugin,
            withDocs: false,
            usersRepository: new InMemoryUsersRepository({
                [existingUserId]: {
                    id: existingUserId,
                    name: "Joao",
                    email: "joao@alfamed.com",
                    sex: "M",
                    role: "patient",
                },
            }),
        });

        const response = await app.handle(
            new Request("http://localhost/users/me", {
                headers: { "x-user-id": existingUserId },
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(() => userProfileSchema.parse(body)).not.toThrow();
        expect(body).toMatchObject({
            id: existingUserId,
            role: "patient",
        });
    });

    it("GET /users/me deve retornar 404 quando usuário não existir", async () => {
        const app = await buildApp({
            authPlugin: fakeAuthPlugin,
            withDocs: false,
            usersRepository: new InMemoryUsersRepository({}),
        });

        const response = await app.handle(
            new Request("http://localhost/users/me", {
                headers: { "x-user-id": "user_not_found" },
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(404);
        expect(() => usersErrorSchema.parse(body)).not.toThrow();
    });
});
