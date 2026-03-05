import { z } from "zod";
import { t } from "elysia";

export const userSexSchema = z.enum(["M", "F"]).nullable();

export const userProfileSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    email: z.email(),
    sex: userSexSchema,
});

export const usersErrorSchema = z.object({
    message: z.string().min(1),
});

export const userProfileResponseSchema = t.Object({
    id: t.String({ format: "uuid" }),
    name: t.String({ minLength: 1 }),
    email: t.String({ format: "email" }),
    sex: t.Union([t.Literal("M"), t.Literal("F"), t.Null()]),
});
