import type { UsersRepository } from "./users.repository.js";

export class UsersService {
    constructor(private readonly usersRepository: UsersRepository) {}

    async getUserById(userId: string) {
        return this.usersRepository.getUserById(userId);
    }
}