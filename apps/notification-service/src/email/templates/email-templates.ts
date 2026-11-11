/**
 * Shopkart Email Notification Templates
 * Responsive HTML + Plain Text Fallbacks
 */

export interface EmailRenderOutput {
  subject: string;
  html: string;
  text: string;
}

const baseStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 0; line-height: 1.6; }
  .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
  .header { background: #0f172a; padding: 24px; text-align: center; }
  .header h1 { color: #ffffff; margin: 0; font-size: 24px; letter-spacing: -0.5px; }
  .header span { color: #f97316; }
  .content { padding: 32px 24px; }
  .footer { background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
  .button { display: inline-block; background-color: #f97316; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; margin: 20px 0; }
  .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  .table th { background: #f8fafc; border-bottom: 2px solid #e2e8f0; padding: 10px; text-align: left; font-size: 13px; color: #475569; }
  .table td { border-bottom: 1px solid #e2e8f0; padding: 10px; font-size: 14px; }
  .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
  .badge-success { background: #dcfce7; color: #166534; }
  .badge-info { background: #e0f2fe; color: #0369a1; }
  .badge-warning { background: #fef3c7; color: #92400e; }
  .notice { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 16px 0; font-size: 13px; color: #92400e; }
`;

function wrapEmail(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Shop<span>kart</span></h1>
    </div>
    <div class="content">
      ${bodyHtml}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Shopkart Inc. All rights reserved.</p>
      <p>This is an automated operational notification. Please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>`;
}

// 1. Customer Welcome
export function renderCustomerWelcomeEmail(data: { name: string; email: string }): EmailRenderOutput {
  const subject = 'Welcome to Shopkart!';
  const html = wrapEmail(
    subject,
    `<h2>Welcome to Shopkart, ${data.name}!</h2>
    <p>We're thrilled to have you join our marketplace. Discover thousands of curated products from trusted merchants with lightning-fast delivery.</p>
    <p>Your registered email is: <strong>${data.email}</strong></p>
    <p style="text-align: center;">
      <a href="http://localhost:3000" class="button">Start Shopping</a>
    </p>
    <p>If you have any questions, our support team is always ready to assist you.</p>`
  );

  const text = `Welcome to Shopkart, ${data.name}!

We're thrilled to have you join our marketplace. Discover thousands of curated products with lightning-fast delivery.
Your registered email is: ${data.email}

Start shopping at: http://localhost:3000

Shopkart Support Team`;

  return { subject, html, text };
}

// 2. Password Reset
export function renderPasswordResetEmail(data: {
  recipientName?: string;
  resetUrl: string;
  expiresInMinutes: number;
}): EmailRenderOutput {
  const subject = 'Reset your Shopkart password';
  const greeting = data.recipientName ? `Hi ${data.recipientName},` : 'Hello,';
  const html = wrapEmail(
    subject,
    `<h2>Password Reset Request</h2>
    <p>${greeting}</p>
    <p>We received a request to reset your password for your Shopkart account. Click the button below to choose a new password:</p>
    <p style="text-align: center;">
      <a href="${data.resetUrl}" class="button">Reset Password</a>
    </p>
    <div class="notice">
      <strong>Important:</strong> This link will expire in <strong>${data.expiresInMinutes} minutes</strong>.
      If you did not request a password reset, please ignore this email or contact support immediately.
    </div>
    <p style="font-size: 12px; color: #64748b;">If the button above does not work, copy and paste this link into your browser:<br>
    <a href="${data.resetUrl}" style="color: #f97316; word-break: break-all;">${data.resetUrl}</a></p>`
  );

  const text = `Password Reset Request

${greeting}

We received a request to reset your password for your Shopkart account.
Use the following link to choose a new password:
${data.resetUrl}

This link will expire in ${data.expiresInMinutes} minutes.
If you did not request this, you can safely ignore this email.

Shopkart Security Team`;

  return { subject, html, text };
}

// 3. Order Placed Confirmation
export function renderOrderPlacedEmail(data: {
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
}): EmailRenderOutput {
  const subject = `Order Confirmed: #${data.orderNumber}`;
  const rows = data.items
    .map(
      (item) => `<tr>
      <td>${item.productName}</td>
      <td style="text-align: center;">${item.quantity}</td>
      <td style="text-align: right;">₹${item.unitPrice.toFixed(2)}</td>
      <td style="text-align: right;">₹${item.totalPrice.toFixed(2)}</td>
    </tr>`
    )
    .join('');

  const html = wrapEmail(
    subject,
    `<h2>Thank you for your order, ${data.recipientName}!</h2>
    <p>Your order <strong>#${data.orderNumber}</strong> has been received and is being processed by our merchants.</p>

    <h3>Order Summary</h3>
    <table class="table">
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Price</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="text-align: right; font-weight: bold; padding-top: 14px;">Total Amount:</td>
          <td style="text-align: right; font-weight: bold; padding-top: 14px; color: #f97316; font-size: 16px;">₹${data.totalAmount.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>

    <h3>Shipping Address</h3>
    <p style="background: #f8fafc; padding: 12px; border-radius: 6px; font-size: 14px; margin: 0;">
      <strong>${data.shippingAddress.fullName}</strong><br>
      ${data.shippingAddress.addressLine1}<br>
      ${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.postalCode}
    </p>

    <p style="text-align: center; margin-top: 24px;">
      <a href="http://localhost:3000/orders" class="button">View Order History</a>
    </p>`
  );

  const text = `Order Confirmation #${data.orderNumber}

Thank you for your order, ${data.recipientName}!
Your order #${data.orderNumber} has been received.

Total: ₹${data.totalAmount.toFixed(2)}
Shipping To: ${data.shippingAddress.fullName}, ${data.shippingAddress.addressLine1}, ${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.postalCode}

Items:
${data.items.map((i) => `- ${i.productName} x ${i.quantity} @ ₹${i.unitPrice.toFixed(2)} = ₹${i.totalPrice.toFixed(2)}`).join('\n')}

View orders: http://localhost:3000/orders`;

  return { subject, html, text };
}

// 4. Order Status Updated
export function renderOrderStatusUpdatedEmail(data: {
  orderNumber: string;
  recipientName?: string;
  previousStatus: string;
  newStatus: string;
  notes?: string;
}): EmailRenderOutput {
  const subject = `Order #${data.orderNumber} Status Update: ${data.newStatus}`;
  const greeting = data.recipientName ? `Hi ${data.recipientName},` : 'Hello,';

  const html = wrapEmail(
    subject,
    `<h2>Order Status Update</h2>
    <p>${greeting}</p>
    <p>Your order <strong>#${data.orderNumber}</strong> status has been updated:</p>
    <div style="margin: 20px 0; text-align: center;">
      <span class="badge badge-info" style="font-size: 15px; padding: 8px 16px;">Status: ${data.newStatus}</span>
    </div>
    ${data.notes ? `<p><strong>Update notes:</strong> ${data.notes}</p>` : ''}
    <p style="text-align: center;">
      <a href="http://localhost:3000/orders" class="button">Track Order</a>
    </p>`
  );

  const text = `Order #${data.orderNumber} Status Update

${greeting}
Your order #${data.orderNumber} status changed from ${data.previousStatus} to: ${data.newStatus}.
${data.notes ? `Notes: ${data.notes}\n` : ''}
Track your order at: http://localhost:3000/orders`;

  return { subject, html, text };
}

// 5. Merchant Order Received
export function renderMerchantOrderReceivedEmail(data: {
  orderNumber: string;
  merchantName: string;
  totalAmount: number;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}): EmailRenderOutput {
  const subject = `New Order Received: #${data.orderNumber}`;
  const rows = data.items
    .map(
      (item) => `<tr>
      <td>${item.productName}</td>
      <td style="text-align: center;">${item.quantity}</td>
      <td style="text-align: right;">₹${item.unitPrice.toFixed(2)}</td>
      <td style="text-align: right;">₹${item.totalPrice.toFixed(2)}</td>
    </tr>`
    )
    .join('');

  const html = wrapEmail(
    subject,
    `<h2>New Customer Order Alert</h2>
    <p>Hello <strong>${data.merchantName}</strong>,</p>
    <p>You have received a new order <strong>#${data.orderNumber}</strong> for your products on Shopkart.</p>

    <h3>Items to Fulfill</h3>
    <table class="table">
      <thead>
        <tr>
          <th>Product</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Unit Price</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="text-align: right; font-weight: bold;">Merchant Subtotal:</td>
          <td style="text-align: right; font-weight: bold; color: #f97316;">₹${data.totalAmount.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>

    <p style="text-align: center;">
      <a href="http://localhost:3000/admin/orders" class="button">Open Merchant Portal</a>
    </p>
    <p>Please prepare and dispatch the items promptly according to our merchant SLA.</p>`
  );

  const text = `New Order Received #${data.orderNumber}

Hello ${data.merchantName},
You have received a new order #${data.orderNumber} for your products on Shopkart.

Subtotal: ₹${data.totalAmount.toFixed(2)}
Items:
${data.items.map((i) => `- ${i.productName} x ${i.quantity} = ₹${i.totalPrice.toFixed(2)}`).join('\n')}

Manage order at: http://localhost:3000/admin/orders`;

  return { subject, html, text };
}

// 6. Order Item Shipped
export function renderOrderItemShippedEmail(data: {
  orderNumber: string;
  recipientName?: string;
  productName: string;
  quantity: number;
  trackingNumber?: string;
  carrier?: string;
}): EmailRenderOutput {
  const subject = `Item Shipped from Order #${data.orderNumber}`;
  const greeting = data.recipientName ? `Hi ${data.recipientName},` : 'Hello,';

  const html = wrapEmail(
    subject,
    `<h2>Great news! Your item is on the way</h2>
    <p>${greeting}</p>
    <p>The following item from your order <strong>#${data.orderNumber}</strong> has been shipped:</p>
    <div style="background: #f8fafc; padding: 16px; border-radius: 6px; margin: 16px 0;">
      <h3 style="margin-top: 0;">${data.productName}</h3>
      <p style="margin-bottom: 0;">Quantity: <strong>${data.quantity}</strong></p>
      ${data.carrier ? `<p style="margin: 4px 0 0 0;">Carrier: <strong>${data.carrier}</strong></p>` : ''}
      ${data.trackingNumber ? `<p style="margin: 4px 0 0 0;">Tracking Number: <strong>${data.trackingNumber}</strong></p>` : ''}
    </div>
    <p style="text-align: center;">
      <a href="http://localhost:3000/orders" class="button">Track Delivery</a>
    </p>`
  );

  const text = `Item Shipped from Order #${data.orderNumber}

${greeting}
Your item "${data.productName}" (Qty: ${data.quantity}) from order #${data.orderNumber} has been shipped!
${data.carrier ? `Carrier: ${data.carrier}\n` : ''}${data.trackingNumber ? `Tracking: ${data.trackingNumber}\n` : ''}
Track at: http://localhost:3000/orders`;

  return { subject, html, text };
}

// 7. Merchant Welcome
export function renderMerchantWelcomeEmail(data: {
  businessName: string;
  contactName: string;
}): EmailRenderOutput {
  const subject = `Welcome to Shopkart Merchant Partner Program`;
  const html = wrapEmail(
    subject,
    `<h2>Welcome, ${data.businessName}!</h2>
    <p>Dear ${data.contactName},</p>
    <p>Thank you for submitting your merchant partner registration with Shopkart. Your merchant account has been created and submitted for verification.</p>
    <p>Our team will review your business credentials shortly. Once approved, you will receive full access to list and sell your products on our storefront.</p>
    <p style="text-align: center;">
      <a href="http://localhost:3000/admin" class="button">Merchant Console</a>
    </p>`
  );

  const text = `Welcome to Shopkart Merchant Partner Program

Dear ${data.contactName},
Thank you for registering ${data.businessName} on Shopkart.
Your account has been created and submitted for verification.
You can monitor your account status at: http://localhost:3000/admin`;

  return { subject, html, text };
}

// 8. Merchant Approved
export function renderMerchantApprovedEmail(data: {
  businessName: string;
  contactName: string;
}): EmailRenderOutput {
  const subject = `Congratulations! Your Shopkart Merchant Account is Approved`;
  const html = wrapEmail(
    subject,
    `<h2>Your Merchant Account is Active!</h2>
    <p>Dear ${data.contactName},</p>
    <p>We are delighted to inform you that <strong>${data.businessName}</strong> has been officially approved to sell on Shopkart!</p>
    <p>You can now log in to the Merchant Console to create products, upload images, manage inventory, and fulfill customer orders.</p>
    <p style="text-align: center;">
      <a href="http://localhost:3000/admin/products" class="button">Go to Merchant Dashboard</a>
    </p>`
  );

  const text = `Your Shopkart Merchant Account is Approved!

Dear ${data.contactName},
Congratulations! ${data.businessName} has been approved to sell on Shopkart.
Log in to start adding products: http://localhost:3000/admin/products`;

  return { subject, html, text };
}
