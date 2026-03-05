import { z } from "zod";
import { t } from "elysia";

export const userSexSchema = z.enum(["M", "F"]).nullable();
export const userRoleSchema = z.enum(["professional", "patient"]);

export const userProfileSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    email: z.email(),
    sex: userSexSchema,
    role: userRoleSchema,
});

export const usersErrorSchema = z.object({
    message: z.string().min(1),
});

export const userProfileResponseSchema = t.Object({
    id: t.String({ format: "uuid" }),
    name: t.String({ minLength: 1 }),
    email: t.String({ format: "email" }),
    sex: t.Union([t.Literal("M"), t.Literal("F"), t.Null()]),
    role: t.Union([t.Literal("professional"), t.Literal("patient")]),
});

export const usersErrorResponseSchema = t.Object({
    message: t.String({ minLength: 1 }),
});
