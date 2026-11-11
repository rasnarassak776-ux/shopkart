import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import {
  EmailRenderOutput,
  renderCustomerWelcomeEmail,
  renderPasswordResetEmail,
  renderOrderPlacedEmail,
  renderOrderStatusUpdatedEmail,
  renderMerchantOrderReceivedEmail,
  renderOrderItemShippedEmail,
  renderMerchantWelcomeEmail,
  renderMerchantApprovedEmail,
} from './templates/email-templates';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailSendResult {
  success: boolean;
  status: 'delivered' | 'pending' | 'failed';
  deliveryMethod: 'smtp' | 'development-local';
  recipient: string;
  messageId?: string;
  error?: string;
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly fromAddress: string;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {
    this.fromAddress =
      this.configService.get<string>('SMTP_FROM') ||
      process.env.SMTP_FROM ||
      '"Shopkart" <no-reply@shopkart.com>';
  }

  async onModuleInit() {
    await this.initTransporter();
  }

  private async initTransporter(): Promise<void> {
    const host =
      this.configService.get<string>('SMTP_HOST') || process.env.SMTP_HOST;
    const port = Number(
      this.configService.get<number>('SMTP_PORT') ||
        process.env.SMTP_PORT ||
        1025,
    );
    const user =
      this.configService.get<string>('SMTP_USER') || process.env.SMTP_USER;
    const pass =
      this.configService.get<string>('SMTP_PASSWORD') ||
      process.env.SMTP_PASSWORD;
    const secure =
      this.configService.get<string>('SMTP_SECURE') === 'true' ||
      process.env.SMTP_SECURE === 'true' ||
      port === 465;

    if (!host) {
      this.logger.log(
        'SMTP_HOST not specified; EmailService running in local mock mode (emails logged, marked as pending).',
      );
      this.transporter = null;
      this.isConnected = false;
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: user && pass ? { user, pass } : undefined,
        connectionTimeout: 5000,
        greetingTimeout: 5000,
      });

      await this.transporter.verify();
      this.isConnected = true;
      this.logger.log(`SMTP transport successfully connected to ${host}:${port}`);
    } catch (error: any) {
      this.isConnected = false;
      this.logger.warn(
        `SMTP connection verification failed (${host}:${port}): ${error.message}. Emails will be queued or logged safely.`,
      );
    }
  }

  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) return false;
    try {
      await this.transporter.verify();
      this.isConnected = true;
      return true;
    } catch (err: any) {
      this.isConnected = false;
      return false;
    }
  }

  isHealthy(): boolean {
    // If SMTP is explicitly configured, health depends on connectivity.
    // If not configured, development mock is considered healthy.
    const host =
      this.configService.get<string>('SMTP_HOST') || process.env.SMTP_HOST;
    return host ? this.isConnected : true;
  }

  async sendMail(options: SendMailOptions): Promise<EmailSendResult> {
    const recipient = options.to;

    if (!this.transporter) {
      this.logger.log(
        `[DEV MODE] Simulated email to: ${recipient} | Subject: "${options.subject}" (SMTP not configured).`,
      );
      return {
        success: true,
        status: 'pending',
        deliveryMethod: 'development-local',
        recipient,
        messageId: `dev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      };
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      this.logger.log(
        `Email sent successfully to ${recipient} | messageId: ${info.messageId}`,
      );

      return {
        success: true,
        status: 'delivered',
        deliveryMethod: 'smtp',
        recipient,
        messageId: info.messageId,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to send email to ${recipient}: ${error.message}`,
      );

      return {
        success: false,
        status: 'failed',
        deliveryMethod: 'smtp',
        recipient,
        error: error.message,
      };
    }
  }

  // --- Domain Event Email Senders ---

  async sendCustomerWelcome(data: { name: string; email: string }): Promise<EmailSendResult> {
    const rendered = renderCustomerWelcomeEmail(data);
    return this.sendMail({
      to: data.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  async sendPasswordReset(data: {
    recipientEmail: string;
    recipientName?: string;
    resetUrl: string;
    expiresInMinutes: number;
  }): Promise<EmailSendResult> {
    const rendered = renderPasswordResetEmail(data);
    return this.sendMail({
      to: data.recipientEmail,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  async sendOrderPlaced(data: {
    recipientEmail: string;
    orderNumber: string;
    recipientName: string;
    totalAmount: number;
    items: Array<{
      productName: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
    shippingAddress: {
      fullName: string;
      addressLine1: string;
      city: string;
      state: string;
      postalCode: string;
    };
  }): Promise<EmailSendResult> {
    const rendered = renderOrderPlacedEmail(data);
    return this.sendMail({
      to: data.recipientEmail,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  async sendOrderStatusUpdated(data: {
    recipientEmail: string;
    orderNumber: string;
    recipientName?: string;
    previousStatus: string;
    newStatus: string;
    notes?: string;
  }): Promise<EmailSendResult> {
    const rendered = renderOrderStatusUpdatedEmail(data);
    return this.sendMail({
      to: data.recipientEmail,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  async sendMerchantOrderReceived(data: {
    merchantEmail: string;
    merchantName: string;
    orderNumber: string;
    totalAmount: number;
    items: Array<{
      productName: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
  }): Promise<EmailSendResult> {
    const rendered = renderMerchantOrderReceivedEmail(data);
    return this.sendMail({
      to: data.merchantEmail,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  async sendOrderItemShipped(data: {
    recipientEmail: string;
    orderNumber: string;
    recipientName?: string;
    productName: string;
    quantity: number;
    trackingNumber?: string;
    carrier?: string;
  }): Promise<EmailSendResult> {
    const rendered = renderOrderItemShippedEmail(data);
    return this.sendMail({
      to: data.recipientEmail,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  async sendMerchantWelcome(data: {
    recipientEmail: string;
    businessName: string;
    contactName: string;
  }): Promise<EmailSendResult> {
    const rendered = renderMerchantWelcomeEmail(data);
    return this.sendMail({
      to: data.recipientEmail,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  async sendMerchantApproved(data: {
    recipientEmail: string;
    businessName: string;
    contactName: string;
  }): Promise<EmailSendResult> {
    const rendered = renderMerchantApprovedEmail(data);
    return this.sendMail({
      to: data.recipientEmail,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }
}
