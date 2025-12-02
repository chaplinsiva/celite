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
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://celite.netlify.app'}/pricing" class="button">Renew Subscription</a>
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
};

// Send email function
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const config = getEmailConfig();
    const transporter = getTransporter();

    const info = await transporter.sendMail({
      from: config.from,
      to,
      subject,
      html,
    });

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
  return sendEmail(userEmail, template.subject, template.html);
}

export async function sendSubscriptionPaymentEmail(
  userEmail: string,
  userName: string,
  plan: 'monthly' | 'yearly',
  amount: number,
  nextBillingDate: string
) {
  const template = emailTemplates.subscriptionPaymentTaken(userName, plan, amount, nextBillingDate);
  return sendEmail(userEmail, template.subject, template.html);
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

