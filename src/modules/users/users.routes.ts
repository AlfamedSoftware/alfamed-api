import { Elysia } from "elysia";
import type { UsersRepository } from "./users.repository";
import { UsersService } from "./users.service";
import { userProfileSchema, usersErrorSchema } from "./users.schemas";

type UsersRoutesOptions = {
    usersRepository: UsersRepository;
};

export const usersRoutes = ({ usersRepository }: UsersRoutesOptions) => {
    const usersService = new UsersService(usersRepository);

    return new Elysia({ name: "users-routes", prefix: "/users" }).get(
        "/me",
        async (context) => {
            const { status } = context;
            const userId = (context as unknown as { user?: { id?: string } }).user?.id;

            if (!userId) {
                return status(401, { message: "Unauthorized" });
            }

            const user = await usersService.getUserById(userId);

            if (!user) {
                return status(404, { message: "User not found" });
            }

            return status(200, user);
        },
        {
            auth: true,
            response: {
                200: userProfileSchema,
                401: usersErrorSchema,
                404: usersErrorSchema,
            },
        },
    );
};