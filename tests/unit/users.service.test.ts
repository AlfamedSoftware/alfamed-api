import { describe, expect, it } from "vitest";
import { UsersService } from "../../src/modules/users/users.service";
import type { UserProfile, UsersRepository } from "../../src/modules/users/users.repository";

class InMemoryUsersRepository implements UsersRepository {
    constructor(private readonly users: Record<string, UserProfile> = {}) {}

    async getUserById(userId: string): Promise<UserProfile | null> {
        return this.users[userId] ?? null;
    }
}

describe("UsersService", () => {
    it("deve retornar o perfil do usuário", async () => {
        const userId = "019c1a3e-e425-7000-8bda-cdfec32c8fed";
        const repository = new InMemoryUsersRepository({
            [userId]: {
                id: userId,
                name: "Ana",
                socialName: null,
                cpf: "12345678900",
                birthdate: "2026-02-01T17:27:35.202Z",
                phone: "11999990000",
                email: "ana@alfamed.com",
                sex: null,
                emailVerified: false,
                image: null,
                isActive: true,
                createdAt: "2026-02-01T17:27:35.202Z",
                updatedAt: "2026-02-01T17:27:35.202Z",
                twoFactorEnabled: false,
            },
        });
        const service = new UsersService(repository);

        const result = await service.getUserById(userId);

        expect(result?.id).toBe("019c1a3e-e425-7000-8bda-cdfec32c8fed");
        expect(result?.email).toBe("ana@alfamed.com");
    });

    it("deve retornar null quando usuário não existir", async () => {
        const repository = new InMemoryUsersRepository();
        const service = new UsersService(repository);

        const result = await service.getUserById("missing");

        expect(result).toBeNull();
    });
});
