import { logger } from "./logger";

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class EmailService {
  private provider: string;
  private from: string;
  private apiKey?: string;

  constructor() {
    this.provider = process.env.EMAIL_PROVIDER || "resend";
    this.from = process.env.EMAIL_FROM || "Immerse <noreply@immerse.app>";
    this.apiKey = process.env.EMAIL_API_KEY;
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    // If no API key configured, log and return success (dev mode)
    if (!this.apiKey) {
      logger.warn({ to: options.to, subject: options.subject }, "Email not sent: no API key configured");
      return { success: true, messageId: "dev-mode" };
    }

    try {
      if (this.provider === "resend") {
        return await this.sendWithResend(options);
      }

      // Fallback: log the email
      logger.info({ to: options.to, subject: options.subject }, "Email would be sent");
      return { success: true, messageId: "logged" };
    } catch (error) {
      logger.error({ error, to: options.to }, "Email send failed");
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async sendWithResend(options: EmailOptions): Promise<EmailResult> {
    const Resend = (await import("resend")).Resend;
    const resend = new Resend(this.apiKey!);

    const payload: any = {
      from: options.from || this.from,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
    };

    if (options.html) {
      payload.html = options.html;
    } else if (options.text) {
      payload.text = options.text;
    }

    const { data, error } = await resend.emails.send(payload);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true, messageId: data?.id };
  }

  // Pre-built email templates
  async sendPasswordReset(email: string, resetToken: string, resetUrl: string): Promise<EmailResult> {
    return this.send({
      to: email,
      subject: "Reset your Immerse password",
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>You requested to reset your password for your Immerse account.</p>
          <p>Click the link below to reset your password. This link expires in 1 hour.</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #0f172a; color: white; text-decoration: none; border-radius: 6px;">Reset Password</a>
          <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
      text: `Reset your password: ${resetUrl}\n\nThis link expires in 1 hour.`,
    });
  }

  async sendWelcome(email: string, name: string, orgName: string): Promise<EmailResult> {
    return this.send({
      to: email,
      subject: "Welcome to Immerse!",
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
          <h2>Welcome to Immerse, ${name}!</h2>
          <p>Your organization "${orgName}" has been created and is ready to use.</p>
          <p>You can now sign in and start managing your work immersion programs.</p>
        </div>
      `,
      text: `Welcome to Immerse, ${name}! Your organization "${orgName}" is ready.`,
    });
  }

  async sendTrialEnding(email: string, orgName: string, daysLeft: number): Promise<EmailResult> {
    return this.send({
      to: email,
      subject: `Your Immerse trial ends in ${daysLeft} days`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
          <h2>Trial Ending Soon</h2>
          <p>Your organization "${orgName}"'s trial period ends in ${daysLeft} days.</p>
          <p>Upgrade to a paid plan to continue using all features.</p>
        </div>
      `,
      text: `Your trial for ${orgName} ends in ${daysLeft} days. Upgrade to continue.`,
    });
  }
}

export const emailService = new EmailService();
