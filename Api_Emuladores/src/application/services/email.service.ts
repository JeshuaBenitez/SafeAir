import nodemailer from "nodemailer";
import { env } from "../../shared/config/env";
import { logger } from "../../shared/config/logger";

/** Timeout en ms para crear cuenta Ethereal (10 segundos) */
const ETHEREAL_TIMEOUT_MS = 10_000;

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  private async getTransporter(): Promise<nodemailer.Transporter | null> {
    if (this.transporter) {
      return this.transporter;
    }

    // ── SMTP real configurado ──────────────────────────────────────────
    if (env.smtpHost) {
      logger.info(`[EmailService] Utilizando servidor SMTP real configurado: ${env.smtpHost}`);
      this.transporter = nodemailer.createTransport({
        host: env.smtpHost,
        port: env.smtpPort,
        secure: env.smtpSecure,
        auth: {
          user: env.smtpUser,
          pass: env.smtpPass
        }
      });
      return this.transporter;
    }

    // ── Ethereal fallback (desarrollo local) ───────────────────────────
    logger.info("[EmailService] No hay SMTP_HOST configurado. Intentando generar cuenta de pruebas Ethereal Mail...");

    try {
      const testAccount = await Promise.race([
        nodemailer.createTestAccount(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout al crear cuenta Ethereal")), ETHEREAL_TIMEOUT_MS)
        )
      ]);

      logger.info(`[EmailService] Cuenta Ethereal temporal generada con éxito: ${testAccount.user}`);
      this.transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });

      return this.transporter;
    } catch (error) {
      logger.warn("==========================================================================");
      logger.warn("[EmailService] No se pudo conectar a Ethereal Mail (probable fallo DNS/red en Docker).");
      logger.warn("[EmailService] Se activará el modo FALLBACK DE CONSOLA: los códigos OTP se imprimirán en los logs.");
      logger.warn("==========================================================================");
      return null;
    }
  }

  async sendOtpEmail(toEmail: string, fullName: string, code: string): Promise<string | null> {
    let transporter: nodemailer.Transporter | null;

    try {
      transporter = await this.getTransporter();
    } catch (error) {
      logger.error("[EmailService] Error inesperado al obtener transporter SMTP", error);
      transporter = null;
    }

    // ── Fallback de consola: si no hay transporter disponible ─────────
    if (!transporter) {
      logger.info("==========================================================================");
      logger.info(`[OTP-FALLBACK] ┌─────────────────────────────────────────┐`);
      logger.info(`[OTP-FALLBACK] │  CÓDIGO OTP (modo consola)              │`);
      logger.info(`[OTP-FALLBACK] ├─────────────────────────────────────────┤`);
      logger.info(`[OTP-FALLBACK] │  Usuario: ${fullName}`);
      logger.info(`[OTP-FALLBACK] │  Correo:  ${toEmail}`);
      logger.info(`[OTP-FALLBACK] │  Código:  ${code}`);
      logger.info(`[OTP-FALLBACK] │  Expira:  5 minutos`);
      logger.info(`[OTP-FALLBACK] └─────────────────────────────────────────┘`);
      logger.info("==========================================================================");
      return null;
    }

    // HTML premium con diseño de SafeAir en modo oscuro
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Tu Código de Verificación SafeAir</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: #080c14;
          font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #e2e8f0;
          -webkit-font-smoothing: antialiased;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background: linear-gradient(135deg, #0d1527 0%, #070b16 100%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        }
        .header {
          padding: 32px 40px;
          text-align: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(255, 255, 255, 0.02);
        }
        .logo-text {
          font-size: 26px;
          font-weight: 800;
          letter-spacing: 1px;
          background: linear-gradient(90deg, #38bdf8 0%, #34d399 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0;
        }
        .logo-sub {
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-top: 4px;
        }
        .content {
          padding: 40px;
        }
        h1 {
          font-size: 22px;
          font-weight: 700;
          color: #f8fafc;
          margin-top: 0;
          margin-bottom: 16px;
        }
        p {
          font-size: 15px;
          line-height: 1.6;
          color: #94a3b8;
          margin-bottom: 24px;
        }
        .otp-container {
          text-align: center;
          margin: 32px 0;
          padding: 24px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px dashed rgba(56, 189, 248, 0.3);
          border-radius: 12px;
        }
        .otp-code {
          font-size: 38px;
          font-weight: 800;
          letter-spacing: 8px;
          color: #38bdf8;
          font-family: 'Courier New', Courier, monospace;
          margin: 0;
        }
        .timer-warning {
          font-size: 13px;
          color: #ef4444;
          text-align: center;
          margin-top: 12px;
          font-weight: 500;
        }
        .footer {
          padding: 24px 40px;
          background: rgba(0, 0, 0, 0.2);
          text-align: center;
          font-size: 12px;
          color: #475569;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }
        .footer a {
          color: #38bdf8;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo-text">SafeAir</div>
          <div class="logo-sub">Monitoreo y Control Distribuido</div>
        </div>
        <div class="content">
          <h1>Hola, ${fullName}</h1>
          <p>Para completar tu acceso al panel inteligente de SafeAir, ingresa el siguiente código de verificación de un solo uso (OTP) en la pantalla de inicio de sesión.</p>
          <div class="otp-container">
            <div class="otp-code">${code}</div>
            <div class="timer-warning">⚠️ Este código expira en 5 minutos.</div>
          </div>
          <p>Si tú no solicitaste este código, por favor ignora este correo de forma segura. Tu cuenta seguirá protegida.</p>
        </div>
        <div class="footer">
          <p>SafeAir Distributed Services • Despliegue en Render Cloud</p>
          <p>Desarrollado con fines académicos de alto rendimiento por <a href="#">lapajara</a>.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    try {
      const info = await transporter.sendMail({
        from: env.smtpFrom,
        to: toEmail,
        subject: `🔑 Código OTP de Verificación: ${code} - SafeAir`,
        html: htmlContent
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        logger.info("==========================================================================");
        logger.info(`[Email] OTP enviado a: ${toEmail}`);
        logger.info(`[Email] Enlace de vista previa Ethereal: ${previewUrl}`);
        logger.info("==========================================================================");
        return previewUrl;
      }

      logger.info(`[Email] OTP enviado exitosamente a: ${toEmail}`);
      return null;
    } catch (error) {
      logger.error(`[EmailService] Error al enviar OTP a ${toEmail}`, error);

      // Si falla el envío SMTP, usar fallback de consola en vez de bloquear
      logger.info("==========================================================================");
      logger.info(`[OTP-FALLBACK] Envío SMTP falló. Mostrando código en consola:`);
      logger.info(`[OTP-FALLBACK] ┌─────────────────────────────────────────┐`);
      logger.info(`[OTP-FALLBACK] │  Usuario: ${fullName}`);
      logger.info(`[OTP-FALLBACK] │  Correo:  ${toEmail}`);
      logger.info(`[OTP-FALLBACK] │  Código:  ${code}`);
      logger.info(`[OTP-FALLBACK] │  Expira:  5 minutos`);
      logger.info(`[OTP-FALLBACK] └─────────────────────────────────────────┘`);
      logger.info("==========================================================================");
      return null;
    }
  }
}
