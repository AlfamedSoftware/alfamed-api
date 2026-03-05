import { Elysia } from "elysia";
import { UsersService } from "./users.service";
import type { UsersRepository } from "./users.repository";
import { userProfileResponseSchema, usersErrorResponseSchema } from "./users.schemas";

type UsersRoutesOptions = {
    usersRepository: UsersRepository;
};

export const usersRoutes = ({ usersRepository }: UsersRoutesOptions) => {
    const usersService = new UsersService(usersRepository);

    return new Elysia({ name: "users-routes", prefix: "/users" }).get(
        "/me",
        async (context) => {
            const { request, status } = context;
            const authPayload = (context as { auth?: { user?: { id?: string } } }).auth;
            const userId =
                authPayload?.user?.id ?? request.headers.get("x-user-id");

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
                description:
                    "Returns the current user profile and computed role (professional or patient).",
                tags: ["users"],
            },
            response: {
                200: userProfileResponseSchema,
                401: usersErrorResponseSchema,
                404: usersErrorResponseSchema,
            },
        },
    );
};
