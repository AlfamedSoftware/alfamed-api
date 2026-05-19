import { eq, and, lt, not } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { hash, compare } from "bcryptjs";
import type { db as dbType } from "../../db/client.js";
import { passwordResetTokens } from "../../db/schema/password-reset-tokens.js";
import { users } from "../../db/schema/users.js";
import { accounts } from "../../db/schema/accounts.js";
import type { ForgotPasswordInput, ResetPasswordInput } from "./auth-password-reset.schemas.js";
import type { EmailService } from "./email.service.js";

type DatabaseClient = typeof dbType;

export class AuthPasswordResetService {
    private readonly TOKEN_EXPIRATION_MINUTES = 15;
    private readonly TOKEN_LENGTH = 32;

    constructor(private readonly db: DatabaseClient, private readonly emailService: EmailService) { }

    /**
     * Gera um token seguro e aleatório
     */
    private generateSecureToken(): string {
        return randomBytes(this.TOKEN_LENGTH).toString("hex");
    }

    /**
     * Calcula o tempo de expiração do token (15 minutos a partir de agora)
     */
    private getExpirationDate(): Date {
        return new Date(Date.now() + this.TOKEN_EXPIRATION_MINUTES * 60 * 1000);
    }

    /**
     * Cria um token de redefinição de senha para o usuário
     * Sempre retorna sucesso por motivos de segurança
     * Rejeita emails que não existem silenciosamente
     */
    async requestPasswordReset(data: ForgotPasswordInput, baseUrl: string): Promise<{ success: boolean; message: string }> {
        try {
            // Procura por usuário com esse email (case-insensitive)
            const [user] = await this.db
                .select({ id: users.id, email: users.email, name: users.name })
                .from(users)
                .where(eq(users.email, data.email.toLowerCase()))
                .limit(1);

            // Sempre retorna sucesso por segurança (mesmo se email não existir)
            if (!user) {
                return {
                    success: true,
                    message: "Se o email existe na nossa base, você receberá um link de redefinição",
                };
            }

            // Remove tokens anteriores não utilizados para esse usuário
            await this.db
                .delete(passwordResetTokens)
                .where(
                    and(
                        eq(passwordResetTokens.userId, user.id),
                        eq(passwordResetTokens.used, false)
                    )
                );

            // Gera novo token
            const token = this.generateSecureToken();
            const expiresAt = this.getExpirationDate();

            await this.db.insert(passwordResetTokens).values({
                userId: user.id,
                token,
                expiresAt,
            });

            // Constrói o link de redefinição
            const resetLink = `${baseUrl}/reset-password?token=${token}`;

            // Envia email
            try {
                await this.emailService.sendPasswordResetEmail(
                    user.email,
                    user.name,
                    resetLink
                );
            } catch (emailError) {
                console.error("[PASSWORD RESET] Erro ao enviar email:", emailError);
                // Mesmo que o email falhe, retorna sucesso para não informar a existência do email
            }

            return {
                success: true,
                message: "Se o email existe na nossa base, você receberá um link de redefinição",
            };
        } catch (error) {
            console.error("[PASSWORD RESET] Erro ao processar solicitação:", error);
            // Retorna sucesso mesmo em caso de erro interno por segurança
            return {
                success: true,
                message: "Se o email existe na nossa base, você receberá um link de redefinição",
            };
        }
    }

    /**
     * Valida o token e redefine a senha do usuário
     */
    async resetPassword(data: ResetPasswordInput): Promise<{ success: boolean; message: string }> {
        try {
            const now = new Date();

            // Procura o token
            const [tokenRecord] = await this.db
                .select({
                    id: passwordResetTokens.id,
                    userId: passwordResetTokens.userId,
                    used: passwordResetTokens.used,
                    expiresAt: passwordResetTokens.expiresAt,
                })
                .from(passwordResetTokens)
                .where(eq(passwordResetTokens.token, data.token))
                .limit(1);

            // Token inválido ou não encontrado
            if (!tokenRecord) {
                throw new Error("Token inválido ou expirado");
            }

            // Token já foi utilizado
            if (tokenRecord.used) {
                throw new Error("Este token de redefinição já foi utilizado");
            }

            // Token expirado
            if (new Date(tokenRecord.expiresAt) < now) {
                throw new Error("Token inválido ou expirado");
            }

            // Criptografa a nova senha
            const hashedPassword = await hash(data.password, 12);

            // Utiliza transação para garantir consistência
            return await this.db.transaction(async (tx) => {
                // Busca dados do usuário para enviar email de confirmação
                const [user] = await tx
                    .select({ id: users.id, name: users.name, email: users.email })
                    .from(users)
                    .where(eq(users.id, tokenRecord.userId))
                    .limit(1);

                if (!user) {
                    throw new Error("Usuário não encontrado");
                }

                // Atualiza a senha do usuário
                const [account] = await tx
                    .select({ id: accounts.id })
                    .from(accounts)
                    .where(eq(accounts.userId, tokenRecord.userId))
                    .limit(1);

                if (!account) {
                    throw new Error("Usuário não encontrado");
                }

                await tx
                    .update(accounts)
                    .set({ password: hashedPassword })
                    .where(eq(accounts.id, account.id));

                // Marca o token como utilizado
                await tx
                    .update(passwordResetTokens)
                    .set({
                        used: true,
                        usedAt: now,
                    })
                    .where(eq(passwordResetTokens.id, tokenRecord.id));

                // Limpa todos os tokens expirados do banco (limpeza)
                await tx
                    .delete(passwordResetTokens)
                    .where(lt(passwordResetTokens.expiresAt, now));

                // Envia email de confirmação
                try {
                    await this.emailService.sendPasswordChangedEmail(user.email, user.name);
                } catch (emailError) {
                    console.error("[PASSWORD RESET] Erro ao enviar email de confirmação:", emailError);
                    // Não falha o fluxo se o email de confirmação não puder ser enviado
                }

                return {
                    success: true,
                    message: "Senha redefinida com sucesso",
                };
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Erro ao redefinir senha";
            return {
                success: false,
                message,
            };
        }
    }

    /**
     * Valida se um token é válido (sem alterar seu estado)
     * Usado para validar no frontend antes do usuário digitar a senha
     */
    async validateToken(token: string): Promise<{ valid: boolean; message: string }> {
        try {
            const now = new Date();

            const [tokenRecord] = await this.db
                .select({
                    used: passwordResetTokens.used,
                    expiresAt: passwordResetTokens.expiresAt,
                })
                .from(passwordResetTokens)
                .where(eq(passwordResetTokens.token, token))
                .limit(1);

            if (!tokenRecord) {
                return { valid: false, message: "Token inválido" };
            }

            if (tokenRecord.used) {
                return { valid: false, message: "Token já foi utilizado" };
            }

            if (new Date(tokenRecord.expiresAt) < now) {
                return { valid: false, message: "Token expirado" };
            }

            return { valid: true, message: "Token válido" };
        } catch (error) {
            return { valid: false, message: "Erro ao validar token" };
        }
    }
}
