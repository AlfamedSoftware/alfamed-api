import { describe, expect, it } from "vitest";
import { UsersService } from "@/modules/users/users.service";
import type { UserProfile, UsersRepository } from "@/modules/users/users.repository";

class InMemoryUsersRepository implements UsersRepository {
    constructor(private readonly user: UserProfile | null) { }

    async getUserById(_: string): Promise<UserProfile | null> {
        return this.user;
    }
}

describe("UsersService", () => {
    it("deve retornar o perfil do usuário", async () => {
        const repository = new InMemoryUsersRepository({
            user: {
                id: "019c1a3e-e425-7000-8bda-cdfec32c8fed",
                name: "Ana",
                email: "ana@alfamed.com",
                emailVerified: false,
                image: null,
                createdAt: "2026-02-01T17:27:35.202Z",
                updatedAt: "2026-02-01T17:27:35.202Z",
                twoFactorEnabled: false,
            },
        });
        const service = new UsersService(repository);

        const result = await service.getUserById("user_1");

        expect(result?.user.id).toBe("019c1a3e-e425-7000-8bda-cdfec32c8fed");
        expect(result?.user.email).toBe("ana@alfamed.com");
    });

    it("deve retornar null quando usuário não existir", async () => {
        const repository = new InMemoryUsersRepository(null);
        const service = new UsersService(repository);

        const result = await service.getUserById("missing");

        expect(result).toBeNull();
    });
});
