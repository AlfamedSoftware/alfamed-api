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
            color: #1f2937;
            background-color: #eef2ff;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .email-wrapper {
            background-color: #ffffff;
            border-radius: 14px;
            box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
            overflow: hidden;
            border: 1px solid #e5e7eb;
        }
        
        .header {
            background: #4338ca;
            background-image: linear-gradient(135deg, #4338ca 0%, #2563eb 100%);
            color: white;
            padding: 34px 20px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 26px;
            margin-bottom: 5px;
            color: #ffffff;
        }
        
        .header p {
            font-size: 14px;
            opacity: 0.95;
            color: #e0e7ff;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .greeting {
            font-size: 16px;
            margin-bottom: 20px;
            color: #111827;
        }
        
        .greeting strong {
            color: #4338ca;
        }
        
        .message {
            font-size: 14px;
            color: #374151;
            margin-bottom: 30px;
            line-height: 1.8;
        }
        
        .cta-button {
            display: inline-block;
            background: #2563eb;
            background-image: linear-gradient(135deg, #4338ca 0%, #2563eb 100%);
            color: white;
            padding: 14px 40px;
            border-radius: 10px;
            text-decoration: none;
            font-weight: 600;
            font-size: 16px;
            margin-bottom: 30px;
            transition: transform 0.2s, box-shadow 0.2s;
            box-shadow: 0 10px 22px rgba(37, 99, 235, 0.28);
            color: #ffffff !important;
            text-decoration: none !important;
        }
        
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 26px rgba(37, 99, 235, 0.34);
        }
        
        .warning-box {
            background-color: #fff7ed;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin-bottom: 30px;
            border-radius: 10px;
            font-size: 13px;
            color: #9a3412;
        }
        
        .warning-box strong {
            display: block;
            margin-bottom: 5px;
        }
        
        .security-box {
            background-color: #f0fdf4;
            border: 1px solid #bbf7d0;
            padding: 15px;
            border-radius: 10px;
            font-size: 13px;
            color: #166534;
            margin-bottom: 30px;
        }
        
        .security-box strong {
            display: block;
            margin-bottom: 5px;
        }
        
        .link-section {
            background-color: #f8fafc;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 30px;
            word-break: break-all;
            border: 1px solid #e2e8f0;
        }
        
        .link-section p {
            font-size: 12px;
            color: #64748b;
            margin-bottom: 10px;
        }
        
        .link-section a {
            color: #1d4ed8;
            text-decoration: none;
            font-size: 13px;
            word-break: break-all;
        }
        
        .footer {
            background-color: #f8fafc;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #64748b;
            border-top: 1px solid #e5e7eb;
        }
        
        .footer p {
            margin-bottom: 10px;
        }
        
        .social-links {
            margin-bottom: 10px;
        }
        
        .social-links a {
            color: #64748b;
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
                    <a href="${resetLink}" class="cta-button" style="color:#ffffff !important; text-decoration:none !important;">
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
            color: #1f2937;
            background-color: #eef2ff;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .email-wrapper {
            background-color: #ffffff;
            border-radius: 14px;
            box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
            overflow: hidden;
            border: 1px solid #e5e7eb;
        }
        
        .header {
            background: #047857;
            background-image: linear-gradient(135deg, #047857 0%, #059669 100%);
            color: white;
            padding: 34px 20px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 26px;
            margin-bottom: 5px;
            color: #ffffff;
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
            color: #111827;
            text-align: center;
        }

        .greeting strong {
            color: #047857;
        }
        
        .message {
            font-size: 14px;
            color: #374151;
            margin-bottom: 20px;
            line-height: 1.8;
            text-align: center;
        }

        .alert-box {
            background-color: #ecfdf5;
            border: 1px solid #bbf7d0;
            border-left: 4px solid #10b981;
            padding: 15px;
            border-radius: 10px;
            color: #166534;
            margin-top: 20px;
        }
        
        .footer {
            background-color: #f8fafc;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #64748b;
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
                
                <div class="alert-box">
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
