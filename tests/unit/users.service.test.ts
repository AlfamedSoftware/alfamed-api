import { describe, expect, it } from "vitest";
import { UsersService } from "@/modules/users/users.service";
import type { UserProfile, UsersRepository } from "@/modules/users/users.repository";

class InMemoryUsersRepository implements UsersRepository {
    constructor(private readonly user: UserProfile | null) {}

    async findProfileById(_: string): Promise<UserProfile | null> {
        return this.user;
    }
}

describe("UsersService", () => {
    it("deve retornar o perfil do usuário", async () => {
        const repository = new InMemoryUsersRepository({
            id: "user_1",
            name: "Ana",
            email: "ana@alfamed.com",
            sex: "F",
        });
        const service = new UsersService(repository);

        const result = await service.getMe("user_1");

        expect(result?.id).toBe("user_1");
        expect(result?.email).toBe("ana@alfamed.com");
    });

    it("deve retornar null quando usuário não existir", async () => {
        const repository = new InMemoryUsersRepository(null);
        const service = new UsersService(repository);

        const result = await service.getMe("missing");

        expect(result).toBeNull();
    });
});
