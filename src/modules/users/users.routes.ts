import { Elysia, t } from "elysia";
import { UsersService } from "./users.service";
import type { UsersRepository } from "./users.repository";
import { userProfileResponseSchema } from "./users.schemas";

type UsersRoutesOptions = {
    usersRepository: UsersRepository;
};

export const usersRoutes = ({ usersRepository }: UsersRoutesOptions) => {
    const usersService = new UsersService(usersRepository);

    return new Elysia({ name: "users-routes", prefix: "/users" }).get(
        "/me",
        async (context) => {
            const { status } = context;
            const userId = (context as { user?: { id?: string } }).user?.id;

            if (!userId) {
                return status(401, { message: "Unauthorized" });
            }

            const user = await usersService.getMe(userId);

            if (!user) {
                return status(404, { message: "User not found" });
            }

            return user;
        },
        {
            auth: true,
            detail: {
                summary: "Get authenticated user profile",
                description: "Returns the current authenticated user profile.",
                tags: ["users"],
            },
            response: {
                200: userProfileResponseSchema,
                401: t.Object({ message: t.String({ minLength: 1 }) }),
                404: t.Object({ message: t.String({ minLength: 1 }) }),
            },
        },
    );
};
