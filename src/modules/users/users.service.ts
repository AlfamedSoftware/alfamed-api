import type { UserProfile, UsersRepository } from "./users.repository";

export class UsersService {
    constructor(private readonly usersRepository: UsersRepository) {}

    async getMe(userId: string): Promise<UserProfile | null> {
        return this.usersRepository.findProfileById(userId);
    }
}
