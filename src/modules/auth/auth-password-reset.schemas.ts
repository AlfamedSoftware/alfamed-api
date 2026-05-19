import { z } from "zod";

export const forgotPasswordSchema = z.object({
    email: z.string().email("Email inválido"),
}).strict();

export const resetPasswordSchema = z.object({
    token: z.string().min(1, "Token é obrigatório"),
    password: z.string()
        .min(8, "Senha deve ter no mínimo 8 caracteres")
        .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
        .regex(/[a-z]/, "Senha deve conter pelo menos uma letra minúscula")
        .regex(/[0-9]/, "Senha deve conter pelo menos um número"),
}).strict();

export const passwordResetTokenSchema = z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    token: z.string(),
    expiresAt: z.string().datetime(),
    used: z.boolean(),
    usedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type PasswordResetToken = z.infer<typeof passwordResetTokenSchema>;
