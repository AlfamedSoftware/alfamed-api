import { Elysia, t } from "elysia";
import type { UsersRepository } from "./users.repository";
import { UsersService } from "./users.service";
import { userProfileSchema } from "./users.schemas";

type UsersRoutesOptions = {
    usersRepository: UsersRepository;
};

export const usersRoutes = ({ usersRepository }: UsersRoutesOptions) => {
    const usersService = new UsersService(usersRepository);

    return new Elysia({ name: "users-routes", prefix: "/users" }).get(
        "/:id",
        async (context) => {
            const { params, status } = context;
            const userId = (context as { user?: { id?: string } }).user?.id;

            if (!userId) {
                return status(401, { message: "Unauthorized" });
            }

            if (params.id !== userId) {
                return status(403, { message: "Forbidden" });
            }

            const user = await usersService.getUserById(userId);

            if (!user) {
                return status(404, { message: "User not found" });
            }

            return status(200, user);
        },
        {
            auth: true,
            detail: {
                summary: "Get user profile by id",
                description: "Returns the authenticated user's profile when the route id matches the session user id.",
                tags: ["Users"],
            },
            response: {
                200: userProfileSchema,
                401: t.Object({ message: t.Literal("Unauthorized") }),
                403: t.Object({ message: t.Literal("Forbidden") }),
                404: t.Object({ message: t.Literal("User not found") }),
            },
        },
    );
};