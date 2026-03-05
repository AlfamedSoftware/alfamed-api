import { z } from "zod";

export const userSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    email: z.email(),
    emailVerified: z.boolean(),
    image: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    twoFactorEnabled: z.boolean(),
});

export const userProfileSchema = z.object({
    user: userSchema,
});

export const usersErrorSchema = z.object({
    message: z.string().min(1),
});

