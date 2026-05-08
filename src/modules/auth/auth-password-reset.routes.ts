import { Elysia, t } from "elysia";
import { z } from "zod";
import type { db as dbType } from "../../db/client.js";
import { AuthPasswordResetService } from "./auth-password-reset.service.js";
import { createEmailService } from "./email.service.js";
import {
    forgotPasswordSchema,
    resetPasswordSchema,
} from "./auth-password-reset.schemas.js";

type DatabaseClient = typeof dbType;

type AuthPasswordResetRoutesOptions = {
    db: DatabaseClient;
    baseUrl?: string;
};

export const authPasswordResetRoutes = ({ db, baseUrl }: AuthPasswordResetRoutesOptions) => {
    const emailService = createEmailService();
    const service = new AuthPasswordResetService(db, emailService);
    const defaultBaseUrl = baseUrl || process.env.VITE_API_URL || "http://localhost:3000";

    return new Elysia({ name: "auth-password-reset-routes", prefix: "/auth" })
        .post(
            "/forgot-password",
            async (context) => {
                const { body, status } = context;

                try {
                    const result = await service.requestPasswordReset(body, defaultBaseUrl);

                    // Sempre retorna 200 OK por segurança
                    return status(200, {
                        success: result.success,
                        message: result.message,
                    });
                } catch (error) {
                    // Nunca revela se o email existe ou não
                    return status(200, {
                        success: true,
                        message: "Se o email existe na nossa base, você receberá um link de redefinição",
                    });
                }
            },
            {
                body: forgotPasswordSchema,
                detail: {
                    summary: "Request password reset",
                    description: "Solicita um link de redefinição de senha. Sempre retorna sucesso por segurança.",
                    tags: ["Auth"],
                },
                response: {
                    200: t.Object({
                        success: t.Boolean(),
                        message: t.String(),
                    }),
                },
            }
        )
        .get(
            "/validate-reset-token/:token",
            async (context) => {
                const { params, status } = context;

                try {
                    const result = await service.validateToken(params.token);

                    return status(200, result);
                } catch (error) {
                    return status(200, {
                        valid: false,
                        message: "Erro ao validar token",
                    });
                }
            },
            {
                detail: {
                    summary: "Validate reset token",
                    description: "Valida se um token de redefinição de senha é válido",
                    tags: ["Auth"],
                },
                response: {
                    200: t.Object({
                        valid: t.Boolean(),
                        message: t.String(),
                    }),
                },
            }
        )
        .post(
            "/reset-password",
            async (context) => {
                const { body, status } = context;

                try {
                    const result = await service.resetPassword(body);

                    if (!result.success) {
                        return status(400, {
                            success: false,
                            message: result.message,
                        });
                    }

                    return status(200, {
                        success: true,
                        message: "Senha redefinida com sucesso",
                    });
                } catch (error) {
                    return status(500, {
                        success: false,
                        message: "Erro ao redefinir senha",
                    });
                }
            },
            {
                body: resetPasswordSchema,
                detail: {
                    summary: "Reset password",
                    description: "Redefine a senha do usuário usando um token válido",
                    tags: ["Auth"],
                },
                response: {
                    200: t.Object({
                        success: t.Boolean(),
                        message: t.String(),
                    }),
                    400: t.Object({
                        success: t.Boolean(),
                        message: t.String(),
                    }),
                    500: t.Object({
                        success: t.Boolean(),
                        message: t.String(),
                    }),
                },
            }
        );
};
