import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('EMAIL_HOST', 'smtp.gmail.com'),
      port: this.configService.get<number>('EMAIL_PORT', 587),
      secure: this.configService.get<string>('SMTP_SECURE', 'false') === 'true',
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASS'),
      },
    });
  }

  async sendOtp(to: string, otp: string, purpose: 'verification' | 'password_reset'): Promise<void> {
    const from = this.configService.get<string>('EMAIL_FROM', 'no-reply@pokerank.app');
    const appName = 'Pokerank';

    const subject = purpose === 'verification'
      ? `${appName} — Verify your email`
      : `${appName} — Reset your password`;

    const heading = purpose === 'verification'
      ? 'Verify Your Email'
      : 'Reset Your Password';

    const message = purpose === 'verification'
      ? 'Thank you for signing up! Use the code below to verify your email address.'
      : 'We received a request to reset your password. Use the code below to proceed.';

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #1a1a2e; margin-bottom: 8px;">${heading}</h2>
        <p style="color: #555; font-size: 15px; line-height: 1.5;">${message}</p>
        <div style="background: #f4f4f8; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1a1a2e;">${otp}</span>
        </div>
        <p style="color: #999; font-size: 13px;">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
      </div>
    `;

    try {
      await this.transporter.sendMail({ from, to, subject, html });
      this.logger.log(`OTP email sent to ${to} (${purpose})`);
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${to}`, (error as Error).stack);
      throw error;
    }
  }
}
