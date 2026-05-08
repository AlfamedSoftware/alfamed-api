/**
 * Email template para redefinição de senha
 * Profissional e responsivo
 */

export function getPasswordResetEmailHTML(userName: string, resetLink: string): string {
    const year = new Date().getFullYear();

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Redefinir Senha - Alfamed</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .email-wrapper {
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 24px;
            margin-bottom: 5px;
        }
        
        .header p {
            font-size: 14px;
            opacity: 0.9;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .greeting {
            font-size: 16px;
            margin-bottom: 20px;
            color: #333;
        }
        
        .greeting strong {
            color: #4f46e5;
        }
        
        .message {
            font-size: 14px;
            color: #666;
            margin-bottom: 30px;
            line-height: 1.8;
        }
        
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);
            color: white;
            padding: 14px 40px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            font-size: 16px;
            margin-bottom: 30px;
            transition: transform 0.2s, box-shadow 0.2s;
            box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
        }
        
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(79, 70, 229, 0.4);
        }
        
        .warning-box {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin-bottom: 30px;
            border-radius: 4px;
            font-size: 13px;
            color: #92400e;
        }
        
        .warning-box strong {
            display: block;
            margin-bottom: 5px;
        }
        
        .security-box {
            background-color: #ecfdf5;
            border: 1px solid #d1fae5;
            padding: 15px;
            border-radius: 4px;
            font-size: 13px;
            color: #065f46;
            margin-bottom: 30px;
        }
        
        .security-box strong {
            display: block;
            margin-bottom: 5px;
        }
        
        .link-section {
            background-color: #f9fafb;
            padding: 20px;
            border-radius: 4px;
            margin-bottom: 30px;
            word-break: break-all;
        }
        
        .link-section p {
            font-size: 12px;
            color: #9ca3af;
            margin-bottom: 10px;
        }
        
        .link-section a {
            color: #4f46e5;
            text-decoration: none;
            font-size: 13px;
            word-break: break-all;
        }
        
        .footer {
            background-color: #f9fafb;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #9ca3af;
            border-top: 1px solid #e5e7eb;
        }
        
        .footer p {
            margin-bottom: 10px;
        }
        
        .social-links {
            margin-bottom: 10px;
        }
        
        .social-links a {
            color: #9ca3af;
            text-decoration: none;
            margin: 0 10px;
        }
        
        @media (max-width: 600px) {
            .content {
                padding: 20px 15px;
            }
            
            .header {
                padding: 20px 15px;
            }
            
            .header h1 {
                font-size: 20px;
            }
            
            .cta-button {
                display: block;
                text-align: center;
                width: 100%;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="email-wrapper">
            <!-- Header -->
            <div class="header">
                <h1>🔐 Redefinir Senha</h1>
                <p>Sistema Alfamed</p>
            </div>
            
            <!-- Content -->
            <div class="content">
                <div class="greeting">
                    Olá <strong>${userName}</strong>,
                </div>
                
                <div class="message">
                    Você solicitou a redefinição de senha para sua conta. Clique no botão abaixo para criar uma nova senha.
                </div>
                
                <!-- CTA Button -->
                <div style="text-align: center;">
                    <a href="${resetLink}" class="cta-button">
                        Redefinir Minha Senha
                    </a>
                </div>
                
                <!-- Expiration Warning -->
                <div class="warning-box">
                    <strong>⏰ Link expira em 15 minutos</strong>
                    Este link é válido apenas por 15 minutos. Se não redefinir sua senha neste prazo, deverá solicitar um novo link.
                </div>
                
                <!-- Security Message -->
                <div class="security-box">
                    <strong>🛡️ Não reconhece esta solicitação?</strong>
                    Se você não solicitou uma redefinição de senha, pode ignorar este email com segurança. Sua conta não será alterada.
                </div>
                
                <!-- Alternative Link -->
                <div class="link-section">
                    <p>Ou copie e cole este link no seu navegador:</p>
                    <a href="${resetLink}">${resetLink}</a>
                </div>
                
                <div class="message">
                    Por motivos de segurança:
                    <ul style="margin-left: 20px; margin-top: 10px;">
                        <li>Nunca compartilhe este link com outras pessoas</li>
                        <li>Use uma senha forte e única</li>
                        <li>Não responda este email com informações pessoais</li>
                    </ul>
                </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
                <p>
                    © ${year} Alfamed. Todos os direitos reservados.
                </p>
                <p>
                    Este é um email automático. Por favor, não responda a esta mensagem.
                </p>
                <div class="social-links">
                    <a href="https://alfamed.com">Visitar Site</a> • 
                    <a href="https://alfamed.com/support">Suporte</a> • 
                    <a href="https://alfamed.com/privacy">Privacidade</a>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
    `.trim();
}

/**
 * Template de confirmação de redefinição bem-sucedida
 */
export function getPasswordChangedEmailHTML(userName: string): string {
    const year = new Date().getFullYear();

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Senha Alterada - Alfamed</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .email-wrapper {
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 24px;
            margin-bottom: 5px;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .success-icon {
            text-align: center;
            font-size: 48px;
            margin-bottom: 20px;
        }
        
        .greeting {
            font-size: 16px;
            margin-bottom: 20px;
            color: #333;
            text-align: center;
        }
        
        .message {
            font-size: 14px;
            color: #666;
            margin-bottom: 20px;
            line-height: 1.8;
            text-align: center;
        }
        
        .footer {
            background-color: #f9fafb;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #9ca3af;
            border-top: 1px solid #e5e7eb;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="email-wrapper">
            <div class="header">
                <h1>✓ Senha Alterada com Sucesso</h1>
            </div>
            
            <div class="content">
                <div class="success-icon">✅</div>
                
                <div class="greeting">
                    Olá <strong>${userName}</strong>,
                </div>
                
                <div class="message">
                    Sua senha foi redefinida com sucesso. Você já pode fazer login com sua nova senha.
                </div>
                
                <div class="message" style="background-color: #ecfdf5; padding: 15px; border-radius: 4px; border-left: 4px solid #10b981; color: #065f46;">
                    Se não foi você quem fez essa alteração, entre em contato conosco imediatamente através do suporte.
                </div>
            </div>
            
            <div class="footer">
                <p>© ${year} Alfamed. Todos os direitos reservados.</p>
            </div>
        </div>
    </div>
</body>
</html>
    `.trim();
}
