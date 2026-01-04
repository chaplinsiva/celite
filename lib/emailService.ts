import nodemailer from 'nodemailer';

// Email configuration from environment variables
const getEmailConfig = () => {
  const host = process.env.SMTP_HOST || 'smtp.hostinger.com';
  const port = parseInt(process.env.SMTP_PORT || '587');
  const secure = process.env.SMTP_SECURE === 'true'; // true for 465, false for other ports
  const user = process.env.SMTP_USER || process.env.EMAIL_FROM;
  const password = process.env.SMTP_PASSWORD;
  const fromEmail = process.env.EMAIL_FROM || 'celitecontactsupport@celite.in';
  const fromName = process.env.EMAIL_FROM_NAME || 'Celite';

  if (!user || !password) {
    throw new Error('SMTP credentials not configured. Please set SMTP_USER and SMTP_PASSWORD environment variables.');
  }

  return {
    host,
    port,
    secure,
    auth: {
      user,
      pass: password,
    },
    from: `${fromName} <${fromEmail}>`,
  };
};

// Create transporter
let transporter: nodemailer.Transporter | null = null;

const getTransporter = () => {
  if (!transporter) {
    const config = getEmailConfig();
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });
  }
  return transporter;
};

// Email templates
export const emailTemplates = {
  subscriptionSuccess: (userName: string, plan: string, amount: number) => ({
    subject: '🎉 Welcome to Celite - Your Subscription is Active!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Celite!</h1>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>Thank you for subscribing to Celite! Your <strong>${plan}</strong> subscription is now active.</p>
            <p><strong>Subscription Details:</strong></p>
            <ul>
              <li>Plan: ${plan === 'monthly' ? 'Monthly' : 'Yearly'} Pro</li>
              <li>Amount: ₹${amount.toLocaleString('en-IN')}</li>
              <li>Status: Active</li>
            </ul>
            <p>You now have unlimited access to:</p>
            <ul>
              <li>Premium After Effects templates</li>
              <li>Full source file access</li>
              <li>Commercial license</li>
              <li>Priority support</li>
            </ul>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://celite.netlify.app'}/dashboard" class="button">Go to Dashboard</a>
            <p style="margin-top: 30px; color: #666; font-size: 14px;">If you have any questions, feel free to reach out to our support team.</p>
            <p style="color: #666; font-size: 14px;">Best regards,<br>The Celite Team</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  subscriptionPaymentTaken: (userName: string, plan: string, amount: number, nextBillingDate: string) => ({
    subject: '✅ Payment Received - Celite Subscription',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Received</h1>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>We've successfully processed your payment for your Celite subscription.</p>
            <p><strong>Payment Details:</strong></p>
            <ul>
              <li>Plan: ${plan === 'monthly' ? 'Monthly' : 'Yearly'} Pro</li>
              <li>Amount: ₹${amount.toLocaleString('en-IN')}</li>
              <li>Next billing date: ${new Date(nextBillingDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</li>
            </ul>
            <p>Your subscription continues to be active. Thank you for being a valued member!</p>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://celite.netlify.app'}/dashboard" style="display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px;">View Dashboard</a>
            <p style="margin-top: 30px; color: #666; font-size: 14px;">Best regards,<br>The Celite Team</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  adminNotificationPayment: (customerEmail: string, customerName: string, plan: string, amount: number, nextBillingDate: string) => ({
    subject: `[Admin] Payment Received - ${customerEmail} - ${plan === 'monthly' ? 'Monthly' : 'Yearly'} Plan`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .details { background: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
          .details-row { margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
          .details-row:last-child { border-bottom: none; }
          .label { font-weight: bold; color: #555; }
          .value { color: #333; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Received - Admin Notification</h1>
          </div>
          <div class="content">
            <p>A payment has been successfully processed for a Celite subscription.</p>
            <div class="details">
              <div class="details-row">
                <span class="label">Customer Email:</span>
                <span class="value">${customerEmail}</span>
              </div>
              <div class="details-row">
                <span class="label">Customer Name:</span>
                <span class="value">${customerName}</span>
              </div>
              <div class="details-row">
                <span class="label">Plan:</span>
                <span class="value">${plan === 'monthly' ? 'Monthly' : 'Yearly'} Pro</span>
              </div>
              <div class="details-row">
                <span class="label">Amount:</span>
                <span class="value">₹${amount.toLocaleString('en-IN')}</span>
              </div>
              <div class="details-row">
                <span class="label">Payment Date:</span>
                <span class="value">${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div class="details-row">
                <span class="label">Next Billing Date:</span>
                <span class="value">${new Date(nextBillingDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>
            <p style="margin-top: 30px; color: #666; font-size: 14px;">This is an automated notification from Celite.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  adminNotificationSubscription: (customerEmail: string, customerName: string, plan: string, amount: number) => ({
    subject: `[Admin] New Subscription - ${customerEmail} - ${plan === 'monthly' ? 'Monthly' : 'Yearly'} Plan`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .details { background: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
          .details-row { margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
          .details-row:last-child { border-bottom: none; }
          .label { font-weight: bold; color: #555; }
          .value { color: #333; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Subscription - Admin Notification</h1>
          </div>
          <div class="content">
            <p>A new subscription has been successfully activated.</p>
            <div class="details">
              <div class="details-row">
                <span class="label">Customer Email:</span>
                <span class="value">${customerEmail}</span>
              </div>
              <div class="details-row">
                <span class="label">Customer Name:</span>
                <span class="value">${customerName}</span>
              </div>
              <div class="details-row">
                <span class="label">Plan:</span>
                <span class="value">${plan === 'monthly' ? 'Monthly' : 'Yearly'} Pro</span>
              </div>
              <div class="details-row">
                <span class="label">Amount:</span>
                <span class="value">₹${amount.toLocaleString('en-IN')}</span>
              </div>
              <div class="details-row">
                <span class="label">Subscription Date:</span>
                <span class="value">${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div class="details-row">
                <span class="label">Status:</span>
                <span class="value">Active</span>
              </div>
            </div>
            <p style="margin-top: 30px; color: #666; font-size: 14px;">This is an automated notification from Celite.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  subscriptionExpiring: (userName: string, plan: string, expiryDate: string) => ({
    subject: '⏰ Your Celite Subscription is Ending Soon',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #f5576c; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Subscription Ending Soon</h1>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>This is a friendly reminder that your Celite <strong>${plan === 'monthly' ? 'Monthly' : 'Yearly'}</strong> subscription will expire on <strong>${new Date(expiryDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>.</p>
            <p>To continue enjoying unlimited access to premium templates, please renew your subscription before it expires.</p>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://celite.netlify.app'}/video-templates" class="button">Browse Templates</a>
            <p style="margin-top: 30px; color: #666; font-size: 14px;">If you have any questions, feel free to reach out to our support team.</p>
            <p style="color: #666; font-size: 14px;">Best regards,<br>The Celite Team</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  marketingEmail: (userName: string, subject: string, content: string) => ({
    subject,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Celite Update</h1>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            ${content}
            <p style="margin-top: 30px; color: #666; font-size: 14px;">Best regards,<br>The Celite Team</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  orderSuccess: (
    userName: string,
    items: Array<{ item_id: string; item_name: string; price: number; quantity: number; thumbnail_url?: string | null }>,
    total: number,
    siteUrl: string
  ) => {
    const itemsHtml = items
      .map(
        (item) => `
        <div class="details-row">
          <div style="display:flex; gap:12px; align-items:center;">
            ${item.thumbnail_url
              ? `<div style="width:64px; height:48px; border-radius:6px; overflow:hidden; background:#f4f4f5; border:1px solid #e5e7eb;">
                  <img src="${item.thumbnail_url}" alt="${item.item_name}" style="width:100%; height:100%; object-fit:cover;" />
                </div>`
              : `<div style="width:64px; height:48px; border-radius:6px; background:#eef2ff; display:flex; align-items:center; justify-content:center; color:#4f46e5; font-weight:700;">DL</div>`
            }
            <div>
              <span class="label" style="display:block;">${item.item_name}</span>
              <span class="value">₹${Number(item.price || 0).toLocaleString('en-IN')} • Qty ${item.quantity}</span>
            </div>
          </div>
          <div style="margin-top:6px;">
            <a href="${siteUrl}/product/${item.item_id}" class="button">Download now</a>
          </div>
        </div>
      `
      )
      .join('');

    return {
      subject: 'Your Celite purchase is ready to download',
      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 640px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 26px; text-align: center; border-radius: 14px 14px 0 0; }
          .content { background: #f9fafb; padding: 28px; border-radius: 0 0 14px 14px; }
          .details { background: #fff; padding: 16px; border-radius: 10px; margin: 18px 0; border-left: 4px solid #2563eb; }
          .details-row { margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #eee; }
          .details-row:last-child { border-bottom: none; }
          .label { font-weight: 600; color: #111827; display:block; }
          .value { color: #374151; }
          .button { display: inline-block; padding: 10px 18px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Thanks for your purchase!</h1>
          </div>
          <div class="content">
            <p>Hi ${userName || 'there'},</p>
            <p>Your payment was successful. Your downloads are ready:</p>
            <div class="details">
              ${itemsHtml}
              <div class="details-row">
                <span class="label">Total Paid</span>
                <span class="value">₹${Number(total || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
            <p>If the button doesn't work, open your items from your dashboard or directly at ${siteUrl}.</p>
            <p style="margin-top: 24px; color: #6b7280; font-size: 13px;">Need help? Reply to this email and we’ll assist you.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    };
  },
};

// Admin email for notifications
const ADMIN_EMAIL = 'celiteproofficial@gmail.com';

// Send email function
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  bcc?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const config = getEmailConfig();
    const transporter = getTransporter();

    const mailOptions: any = {
      from: config.from,
      to,
      subject,
      html,
    };

    if (bcc) {
      mailOptions.bcc = bcc;
    }

    const info = await transporter.sendMail(mailOptions);

    console.log('Email sent successfully:', info.messageId);
    return { success: true };
  } catch (error: any) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
}

// Helper functions for specific email types
export async function sendSubscriptionSuccessEmail(
  userEmail: string,
  userName: string,
  plan: 'monthly' | 'yearly',
  amount: number
) {
  const template = emailTemplates.subscriptionSuccess(userName, plan, amount);
  const result = await sendEmail(userEmail, template.subject, template.html);
  
  // Send admin notification copy
  try {
    const adminTemplate = emailTemplates.adminNotificationSubscription(userEmail, userName, plan, amount);
    await sendEmail(ADMIN_EMAIL, adminTemplate.subject, adminTemplate.html);
    console.log(`Admin notification sent for new subscription: ${userEmail}`);
  } catch (adminError) {
    console.error('Failed to send admin notification for subscription success:', adminError);
    // Don't fail the main email if admin notification fails
  }
  
  return result;
}

export async function sendSubscriptionPaymentEmail(
  userEmail: string,
  userName: string,
  plan: 'monthly' | 'yearly',
  amount: number,
  nextBillingDate: string
) {
  const template = emailTemplates.subscriptionPaymentTaken(userName, plan, amount, nextBillingDate);
  const result = await sendEmail(userEmail, template.subject, template.html);
  
  // Send admin notification copy
  try {
    const adminTemplate = emailTemplates.adminNotificationPayment(userEmail, userName, plan, amount, nextBillingDate);
    await sendEmail(ADMIN_EMAIL, adminTemplate.subject, adminTemplate.html);
    console.log(`Admin notification sent for payment: ${userEmail}`);
  } catch (adminError) {
    console.error('Failed to send admin notification for payment:', adminError);
    // Don't fail the main email if admin notification fails
  }
  
  return result;
}

export async function sendSubscriptionExpiringEmail(
  userEmail: string,
  userName: string,
  plan: 'monthly' | 'yearly',
  expiryDate: string
) {
  const template = emailTemplates.subscriptionExpiring(userName, plan, expiryDate);
  return sendEmail(userEmail, template.subject, template.html);
}

export async function sendMarketingEmail(
  userEmail: string,
  userName: string,
  subject: string,
  content: string
) {
  const template = emailTemplates.marketingEmail(userName, subject, content);
  return sendEmail(userEmail, template.subject, template.html);
}

