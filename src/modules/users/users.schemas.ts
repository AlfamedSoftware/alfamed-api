import { z } from "zod";

export const userProfileSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    socialName: z.string().nullable(),
    cpf: z.string().min(1),
    birthdate: z.string().datetime(),
    phone: z.string().min(1),
    email: z.email(),
    sex: z.enum(["M", "F"]).nullable(),
    emailVerified: z.boolean(),
    image: z.string().nullable(),
    isActive: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    twoFactorEnabled: z.boolean(),
});


