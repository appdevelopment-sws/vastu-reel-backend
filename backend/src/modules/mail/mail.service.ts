import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly templateCache = new Map<string, handlebars.TemplateDelegate>();

  constructor(private readonly configService: ConfigService) {
    this.initTransporter();
  }

  /**
   * Initialize Nodemailer Transporter using MAIL_EMAIL and MAIL_PASSWORD
   */
  private initTransporter() {
    const user = this.configService.get<string>('MAIL_EMAIL')?.trim();
    const pass = this.configService.get<string>('MAIL_PASSWORD')?.trim();

    if (!user || !pass) {
      this.logger.warn(
        '⚠️ MAIL_EMAIL or MAIL_PASSWORD is not set in environment. Outgoing emails will be mocked in console.',
      );
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user,
          pass,
        },
      });

      this.logger.log(`📧 MailService initialized with sender: ${user}`);
    } catch (error: any) {
      this.logger.error('Failed to initialize nodemailer transporter', error?.stack || error);
    }
  }

  /**
   * Compile and cache Handlebars template from file system
   */
  private getCompiledTemplate(templateName: string): handlebars.TemplateDelegate {
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!;
    }

    // Check multiple candidate directories (src vs dist)
    const candidatePaths = [
      path.join(__dirname, 'templates', `${templateName}.hbs`),
      path.join(process.cwd(), 'src', 'modules', 'mail', 'templates', `${templateName}.hbs`),
      path.join(process.cwd(), 'dist', 'modules', 'mail', 'templates', `${templateName}.hbs`),
    ];

    let templateContent: string | null = null;
    for (const candidatePath of candidatePaths) {
      if (fs.existsSync(candidatePath)) {
        templateContent = fs.readFileSync(candidatePath, 'utf8');
        break;
      }
    }

    if (!templateContent) {
      throw new Error(`Email template '${templateName}.hbs' not found in candidate paths: ${candidatePaths.join(', ')}`);
    }

    const compiled = handlebars.compile(templateContent);
    this.templateCache.set(templateName, compiled);
    return compiled;
  }

  /**
   * Send Email with HTML template
   */
  async sendEmail(options: {
    to: string;
    subject: string;
    template: string;
    context: Record<string, any>;
  }): Promise<boolean> {
    const senderEmail = this.configService.get<string>('MAIL_EMAIL')?.trim() || 'noreply@vastureel.com';
    const fromAddress = `"VastuReel" <${senderEmail}>`;

    const template = this.getCompiledTemplate(options.template);
    const html = template({
      ...options.context,
      currentYear: new Date().getFullYear(),
    });

    // If transporter is not configured (e.g. local test without env set), log fallback
    if (!this.transporter) {
      this.logger.warn(
        `[DEV-MOCK] Email not sent via SMTP (Missing credentials). Destination: ${options.to}, Subject: "${options.subject}"`,
      );
      this.logger.debug(`[DEV-MOCK-CONTENT] ${JSON.stringify(options.context)}`);
      return true;
    }

    try {
      const info = await this.transporter.sendMail({
        from: fromAddress,
        to: options.to,
        subject: options.subject,
        html,
      });

      this.logger.log(`✅ Email sent to ${options.to}. MessageId: ${info.messageId}`);
      return true;
    } catch (error: any) {
      this.logger.error(`❌ Failed to send email to ${options.to}: ${error?.message || error}`);
      throw error;
    }
  }

  /**
   * Send Registration Verification OTP Email
   */
  async sendRegistrationOtp(
    to: string,
    name: string,
    otp: string,
    expiresInMinutes: number = 10,
  ): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: `${otp} is your VastuReel verification code`,
      template: 'registration-otp',
      context: {
        name,
        otp,
        expiresInMinutes,
      },
    });
  }

  /**
   * Send Forgot Password Reset OTP Email
   */
  async sendPasswordResetOtp(
    to: string,
    name: string,
    otp: string,
    expiresInMinutes: number = 10,
  ): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: `${otp} is your VastuReel password reset code`,
      template: 'password-reset-otp',
      context: {
        name,
        otp,
        expiresInMinutes,
      },
    });
  }
}
