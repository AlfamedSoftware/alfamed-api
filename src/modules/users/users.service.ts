import { UsersRepository } from "./users.repository";

export class UsersService {
    constructor(private readonly usersRepository: UsersRepository) {}

    async getUserById(userId: string) {
        return this.usersRepository.getUserById(userId);
    }
}