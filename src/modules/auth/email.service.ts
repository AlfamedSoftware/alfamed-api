import { getPasswordResetEmailHTML, getPasswordChangedEmailHTML } from "./email-templates.js";

export interface EmailService {
    sendPasswordResetEmail(email: string, userName: string, resetLink: string): Promise<void>;
    sendPasswordChangedEmail(email: string, userName: string): Promise<void>;
}

/**
 * Serviço de email em desenvolvimento
 * Registra em log por enquanto, pronto para integração com SendGrid, AWS SES, etc
 */
export class LoggingEmailService implements EmailService {
    async sendPasswordResetEmail(email: string, userName: string, resetLink: string): Promise<void> {
        const html = getPasswordResetEmailHTML(userName, resetLink);

        console.log(`
═══════════════════════════════════════════════════════════════
[EMAIL SERVICE] Password Reset Email
═══════════════════════════════════════════════════════════════
To: ${email}
Subject: Redefinir sua senha - Alfamed
═══════════════════════════════════════════════════════════════
${html}
═══════════════════════════════════════════════════════════════
        `);
    }

    async sendPasswordChangedEmail(email: string, userName: string): Promise<void> {
        const html = getPasswordChangedEmailHTML(userName);

        console.log(`
═══════════════════════════════════════════════════════════════
[EMAIL SERVICE] Password Changed Confirmation Email
═══════════════════════════════════════════════════════════════
To: ${email}
Subject: Sua senha foi alterada - Alfamed
═══════════════════════════════════════════════════════════════
${html}
═══════════════════════════════════════════════════════════════
        `);
    }
}

/**
 * Implementação SendGrid (carregada dinamicamente)
 * Requer a variável de ambiente SENDGRID_API_KEY e opcionalmente SENDGRID_FROM_EMAIL
 */
export class SendGridEmailService implements EmailService {
    private from: string;

    constructor() {
        this.from = process.env.SENDGRID_FROM_EMAIL ?? "vinicius_engelmann@estudante.sc.senai.br";
    }

    private async getClient() {
        try {
            const mod = await import("@sendgrid/mail");
            const sg = (mod as any).default ?? mod;
            if (!process.env.SENDGRID_API_KEY) throw new Error("SENDGRID_API_KEY not set");
            sg.setApiKey(process.env.SENDGRID_API_KEY);
            return sg as any;
        } catch (error) {
            console.error("[EMAIL SERVICE] Failed to load SendGrid client:", error);
            throw error;
        }
    }

    async sendPasswordResetEmail(email: string, userName: string, resetLink: string): Promise<void> {
        const html = getPasswordResetEmailHTML(userName, resetLink);

        try {
            const sg = await this.getClient();
            const res = await sg.send({
                to: email,
                from: this.from,
                subject: "Redefinir sua senha - Alfamed",
                html,
            });
            try {
                console.log("[EMAIL SERVICE] SendGrid send result:", JSON.stringify(res));
            } catch (e) {
                console.log("[EMAIL SERVICE] SendGrid send result (raw):", res);
            }
        } catch (error: any) {
            console.error("[EMAIL SERVICE] SendGrid send failed, falling back to log:", error);
            if (error && error.response) {
                try {
                    console.error("[EMAIL SERVICE] SendGrid response status:", error.response.status);
                    console.error("[EMAIL SERVICE] SendGrid response body:", JSON.stringify(error.response.body));
                } catch (e) {
                    console.error("[EMAIL SERVICE] Failed to stringify SendGrid response", e);
                }
            }
            console.log(html);
        }
    }

    async sendPasswordChangedEmail(email: string, userName: string): Promise<void> {
        const html = getPasswordChangedEmailHTML(userName);

        try {
            const sg = await this.getClient();
            const res = await sg.send({
                to: email,
                from: this.from,
                subject: "Sua senha foi alterada - Alfamed",
                html,
            });
            try {
                console.log("[EMAIL SERVICE] SendGrid send result:", JSON.stringify(res));
            } catch (e) {
                console.log("[EMAIL SERVICE] SendGrid send result (raw):", res);
            }
        } catch (error: any) {
            console.error("[EMAIL SERVICE] SendGrid send failed, falling back to log:", error);
            if (error && error.response) {
                try {
                    console.error("[EMAIL SERVICE] SendGrid response status:", error.response.status);
                    console.error("[EMAIL SERVICE] SendGrid response body:", JSON.stringify(error.response.body));
                } catch (e) {
                    console.error("[EMAIL SERVICE] Failed to stringify SendGrid response", e);
                }
            }
            console.log(html);
        }
    }
}

/**
 * Factory para criar instância de email service
 * Permite fácil troca de implementação
 */
export function createEmailService(): EmailService {
    // Usa SendGrid se a variável estiver configurada, caso contrário faz logging
    if (process.env.SENDGRID_API_KEY) {
        return new SendGridEmailService();
    }

    return new LoggingEmailService();
}
