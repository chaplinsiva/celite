/**
 * Email utility for sending transactional emails
 * Uses Supabase settings table for email configuration
 * Falls back to environment variables if not in Supabase
 * 
 * Email configuration is stored in Supabase settings table:
 * - RESEND_API_KEY: Resend API key
 * - RESEND_FROM_EMAIL: Sender email address
 */

import { getSupabaseAdminClient } from './supabaseAdmin';

type EmailOptions = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

type EmailConfig = {
  resendApiKey: string | null;
  resendFromEmail: string | null;
  smtpHost?: string | null;
  smtpPort?: string | null;
  smtpUser?: string | null;
  smtpPass?: string | null;
};

/**
 * Get email configuration from Supabase settings (fallback to env)
 */
async function getEmailConfig(): Promise<EmailConfig> {
  const supabase = getSupabaseAdminClient();
  let settingsMap: Record<string, string> = {};
  
  try {
    const { data: settings } = await supabase.from('settings').select('key,value');
    (settings ?? []).forEach((row: any) => { settingsMap[row.key] = row.value; });
  } catch (e) {
    console.log('Settings table not accessible, using environment variables');
  }
  
  return {
    resendApiKey: settingsMap.RESEND_API_KEY || process.env.RESEND_API_KEY || null,
    resendFromEmail: settingsMap.RESEND_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || 'Celite <noreply@celite.netlify.app>',
    smtpHost: settingsMap.SMTP_HOST || process.env.SMTP_HOST || null,
    smtpPort: settingsMap.SMTP_PORT || process.env.SMTP_PORT || null,
    smtpUser: settingsMap.SMTP_USER || process.env.SMTP_USER || null,
    smtpPass: settingsMap.SMTP_PASS || process.env.SMTP_PASS || null,
  };
}

/**
 * Send email using available service from Supabase settings
 * Falls back to console log if no email service is configured
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const config = await getEmailConfig();
    
    // Try Resend API first (from Supabase settings or env)
    if (config.resendApiKey) {
      return await sendEmailWithResend(options, config.resendApiKey, config.resendFromEmail || 'Celite <noreply@celite.netlify.app>');
    }

    // Try SMTP (if configured in Supabase settings or env)
    if (config.smtpHost) {
      return await sendEmailWithSMTP(options, config);
    }

    // Fallback: Log email (for development)
    console.log('Email would be sent (no email service configured in Supabase settings):', {
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    return true;
  } catch (error: any) {
    console.error('Email sending error:', error);
    return false;
  }
}

/**
 * Send email using Resend API
 */
async function sendEmailWithResend(options: EmailOptions, apiKey: string, fromEmail: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Resend API error');
    }

    console.log('Email sent successfully via Resend:', { to: options.to, subject: options.subject });
    return true;
  } catch (error: any) {
    console.error('Resend email error:', error);
    return false;
  }
}

/**
 * Send email using SMTP
 */
async function sendEmailWithSMTP(options: EmailOptions, config: EmailConfig): Promise<boolean> {
  // For SMTP, you would need to install nodemailer
  // For now, we'll just log that SMTP is not yet implemented
  console.log('SMTP email sending not implemented yet. Please configure Resend API in Supabase settings.');
  return false;
}

/**
 * Generate purchase confirmation email HTML
 */
export function generatePurchaseEmail(productNames: string[], userEmail: string, userName: string): string {
  const productList = productNames.map(name => `<li>${name}</li>`).join('');
  const productsCount = productNames.length;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Purchase Confirmation - Celite</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 30px; border-radius: 10px; color: white;">
    <h1 style="color: #fff; margin-top: 0;">Purchase Successful!</h1>
    <p style="color: #ccc;">Hi ${userName},</p>
    <p style="color: #ccc;">Thank you for your purchase! Your payment has been confirmed and your template${productsCount > 1 ? 's' : ''} are now available.</p>
    
    <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h2 style="color: #fff; margin-top: 0;">Purchased Template${productsCount > 1 ? 's' : ''}:</h2>
      <ul style="color: #ccc; padding-left: 20px;">
        ${productList}
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://celite.netlify.app/dashboard" style="background: #fff; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">View Your Purchases</a>
    </div>
    
    <p style="color: #ccc; margin-top: 30px;">You can access and download your purchased templates anytime from your dashboard.</p>
    
    <p style="color: #ccc;">If you have any questions, feel free to contact us at <a href="mailto:elitechaplin@gmail.com" style="color: #fff;">elitechaplin@gmail.com</a></p>
    
    <p style="color: #999; font-size: 12px; margin-top: 30px;">© 2025 Celite. All rights reserved.</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate subscription confirmation email HTML
 */
export function generateSubscriptionEmail(plan: 'monthly' | 'yearly', userEmail: string, userName: string, validUntil: string | null): string {
  const planName = plan === 'yearly' ? 'Yearly Pro Plan' : 'Monthly Pro Plan';
  const validUntilText = validUntil ? `Your subscription is valid until ${new Date(validUntil).toLocaleDateString()}.` : '';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Confirmed - Celite</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 30px; border-radius: 10px; color: white;">
    <h1 style="color: #fff; margin-top: 0;">Subscription Activated!</h1>
    <p style="color: #ccc;">Hi ${userName},</p>
    <p style="color: #ccc;">Your ${planName} subscription has been successfully activated! You now have unlimited access to all premium templates.</p>
    
    <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h2 style="color: #fff; margin-top: 0;">Subscription Details:</h2>
      <p style="color: #ccc; margin: 5px 0;"><strong>Plan:</strong> ${planName}</p>
      ${validUntilText ? `<p style="color: #ccc; margin: 5px 0;"><strong>Valid Until:</strong> ${new Date(validUntil).toLocaleDateString()}</p>` : ''}
      <p style="color: #ccc; margin: 5px 0;"><strong>Status:</strong> Active</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://celite.netlify.app/dashboard" style="background: #fff; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">Go to Dashboard</a>
    </div>
    
    <p style="color: #ccc; margin-top: 30px;">You can now download unlimited premium templates and enjoy exclusive features.</p>
    
    <p style="color: #ccc;">If you have any questions, feel free to contact us at <a href="mailto:elitechaplin@gmail.com" style="color: #fff;">elitechaplin@gmail.com</a></p>
    
    <p style="color: #999; font-size: 12px; margin-top: 30px;">© 2025 Celite. All rights reserved.</p>
  </div>
</body>
</html>
  `.trim();
}

