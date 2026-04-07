import { describe, expect, it } from "vitest";
import { userProfileSchema } from "../../src/modules/users/users.schemas";
import {
    buildE2EApp,
    fakeAuthWithoutUserPlugin,
    TEST_IDS,
} from "./helpers/context";
import { InMemoryUsersRepository } from "./helpers/repositories";

describe("Users routes", () => {
    it("GET /users/:id deve retornar usuário por id", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository({
                [TEST_IDS.user]: {
                    id: TEST_IDS.user,
                    name: "Joao",
                    email: "joao@alfamed.com",
                    emailVerified: false,
                    image: null,
                    createdAt: "2026-02-01T17:27:35.202Z",
                    updatedAt: "2026-02-01T17:27:35.202Z",
                    twoFactorEnabled: false,
                },
            }),
        });

        const response = await app.handle(new Request(`http://localhost/users/${TEST_IDS.user}`, {
            headers: { "x-user-id": TEST_IDS.user },
        }));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(() => userProfileSchema.parse(body)).not.toThrow();
        expect(body).toMatchObject({ id: TEST_IDS.user });
    });

    it("GET /users/:id deve retornar 404 quando usuário não existir", async () => {
        const app = await buildE2EApp({ usersRepository: new InMemoryUsersRepository({}) });

        const response = await app.handle(new Request(`http://localhost/users/${TEST_IDS.otherUser}`, {
            headers: { "x-user-id": TEST_IDS.otherUser },
        }));
        const body = await response.json();

        expect(response.status).toBe(404);
        expect(body).toMatchObject({ message: "User not found" });
    });

    it("GET /users/:id deve retornar 403 quando id da rota for diferente do token", async () => {
        const app = await buildE2EApp({
            usersRepository: new InMemoryUsersRepository({
                [TEST_IDS.user]: {
                    id: TEST_IDS.user,
                    name: "Joao",
                    email: "joao@alfamed.com",
                    emailVerified: false,
                    image: null,
                    createdAt: "2026-02-01T17:27:35.202Z",
                    updatedAt: "2026-02-01T17:27:35.202Z",
                    twoFactorEnabled: false,
                },
            }),
        });

        const response = await app.handle(new Request(`http://localhost/users/${TEST_IDS.otherUser}`, {
            headers: { "x-user-id": TEST_IDS.user },
        }));
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body).toMatchObject({ message: "Forbidden" });
    });

    it("GET /users/:id deve retornar 401 quando não autenticado", async () => {
        const app = await buildE2EApp({ usersRepository: new InMemoryUsersRepository({}) });

        const response = await app.handle(new Request(`http://localhost/users/${TEST_IDS.user}`));
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body).toMatchObject({ message: "Unauthorized" });
    });

    it("GET /users/:id deve retornar 401 quando auth não injeta user.id", async () => {
        const app = await buildE2EApp({
            authPlugin: fakeAuthWithoutUserPlugin as any,
            usersRepository: new InMemoryUsersRepository({}),
        });

        const response = await app.handle(new Request(`http://localhost/users/${TEST_IDS.user}`, {
            headers: { "x-user-id": TEST_IDS.user },
        }));
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body).toMatchObject({ message: "Unauthorized" });
    });
});
