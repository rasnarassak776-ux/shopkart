import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'SMTP_FROM') return '"Shopkart Test" <test@shopkart.com>';
              if (key === 'SMTP_HOST') return undefined; // local mock mode
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get<ConfigService>(ConfigService);
    await service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Local mock mode (no SMTP host)', () => {
    it('isHealthy should report true for development mock mode', () => {
      expect(service.isHealthy()).toBe(true);
    });

    it('verifyConnection should return false when no transporter is initialized', async () => {
      const result = await service.verifyConnection();
      expect(result).toBe(false);
    });

    it('sendMail should record delivery as pending and generate a local messageId', async () => {
      const result = await service.sendMail({
        to: 'customer@example.com',
        subject: 'Test Subject',
        html: '<p>Test</p>',
        text: 'Test',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('pending');
      expect(result.deliveryMethod).toBe('development-local');
      expect(result.recipient).toBe('customer@example.com');
      expect(result.messageId).toBeDefined();
      expect(result.messageId).toContain('dev_');
    });
  });

  describe('Domain event email wrappers', () => {
    it('sendCustomerWelcome sends welcome email', async () => {
      const result = await service.sendCustomerWelcome({
        name: 'Alice',
        email: 'alice@example.com',
      });
      expect(result.recipient).toBe('alice@example.com');
      expect(result.status).toBe('pending');
    });

    it('sendPasswordReset sends reset email with url and expiry', async () => {
      const result = await service.sendPasswordReset({
        recipientEmail: 'user@example.com',
        resetUrl: 'http://localhost:3000/reset-password?token=secret123',
        expiresInMinutes: 15,
      });
      expect(result.recipient).toBe('user@example.com');
      expect(result.status).toBe('pending');
    });

    it('sendOrderPlaced sends order confirmation', async () => {
      const result = await service.sendOrderPlaced({
        recipientEmail: 'customer@example.com',
        orderNumber: 'ORD-1001',
        recipientName: 'Bob',
        totalAmount: 1499.0,
        items: [
          {
            productName: 'Sneakers',
            quantity: 1,
            unitPrice: 1499.0,
            totalPrice: 1499.0,
          },
        ],
        shippingAddress: {
          fullName: 'Bob Smith',
          addressLine1: '123 Main St',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
        },
      });
      expect(result.recipient).toBe('customer@example.com');
      expect(result.status).toBe('pending');
    });

    it('sendOrderStatusUpdated sends status transition alert', async () => {
      const result = await service.sendOrderStatusUpdated({
        recipientEmail: 'customer@example.com',
        orderNumber: 'ORD-1001',
        previousStatus: 'PENDING',
        newStatus: 'CONFIRMED',
      });
      expect(result.recipient).toBe('customer@example.com');
      expect(result.status).toBe('pending');
    });

    it('sendMerchantOrderReceived sends merchant notification', async () => {
      const result = await service.sendMerchantOrderReceived({
        merchantEmail: 'merchant@example.com',
        merchantName: 'TechStore',
        orderNumber: 'ORD-1001',
        totalAmount: 2999.0,
        items: [
          {
            productName: 'Mechanical Keyboard',
            quantity: 1,
            unitPrice: 2999.0,
            totalPrice: 2999.0,
          },
        ],
      });
      expect(result.recipient).toBe('merchant@example.com');
      expect(result.status).toBe('pending');
    });

    it('sendOrderItemShipped sends dispatch confirmation', async () => {
      const result = await service.sendOrderItemShipped({
        recipientEmail: 'customer@example.com',
        orderNumber: 'ORD-1001',
        productName: 'Sneakers',
        quantity: 1,
        carrier: 'BlueDart',
        trackingNumber: 'BD123456789',
      });
      expect(result.recipient).toBe('customer@example.com');
      expect(result.status).toBe('pending');
    });

    it('sendMerchantWelcome sends merchant registration confirmation', async () => {
      const result = await service.sendMerchantWelcome({
        recipientEmail: 'vendor@example.com',
        businessName: 'Apex Goods',
        contactName: 'Charlie',
      });
      expect(result.recipient).toBe('vendor@example.com');
      expect(result.status).toBe('pending');
    });

    it('sendMerchantApproved sends merchant approval notification', async () => {
      const result = await service.sendMerchantApproved({
        recipientEmail: 'vendor@example.com',
        businessName: 'Apex Goods',
        contactName: 'Charlie',
      });
      expect(result.recipient).toBe('vendor@example.com');
      expect(result.status).toBe('pending');
    });
  });
});
