# Email Setup Guide

This guide explains how to set up email functionality for Celite using your Hostinger email account.

## Features

1. **Subscription Success Email**: Sent when a user successfully subscribes
2. **Payment Taken Email**: Sent when a subscription payment is processed (renewal)
3. **Subscription Expiring Email**: Sent 3 days before subscription expires
4. **Marketing Emails**: Admin can send emails to all active subscribers from the admin panel

## Environment Variables Setup

Add these environment variables to your `.env.local` file and your hosting platform (Netlify/Vercel):

```env
# SMTP Configuration (Hostinger)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=celitecontactsupport@celite.in
SMTP_PASSWORD=Chaplin@&Focus12

# Email From Address
EMAIL_FROM=celitecontactsupport@celite.in
EMAIL_FROM_NAME=Celite

# Site URL (for email links)
NEXT_PUBLIC_SITE_URL=https://celite.netlify.app

# Optional: Cron Secret for subscription expiry check
CRON_SECRET=your_random_secret_here
```

## Hostinger SMTP Settings

For Hostinger email accounts, use these settings:

- **SMTP Host**: `smtp.hostinger.com`
- **SMTP Port**: `587` (TLS) or `465` (SSL)
- **SMTP Secure**: `false` for port 587, `true` for port 465
- **Username**: Your full email address (e.g., `celitecontactsupport@celite.in`)
- **Password**: Your email account password (e.g., `Chaplin@&Focus12`)

### Getting Your Email Password

1. Log in to your Hostinger control panel
2. Go to **Email** section
3. Find your email account and click **Manage**
4. Use the password you set for this email account

**Note**: If you're using 2FA on your email, you may need to create an app-specific password.

## Setting Up Subscription Expiry Emails

The subscription expiry check endpoint (`/api/subscription/check-expiry`) should be called daily via a cron job to check for subscriptions expiring in 3 days and send reminder emails.

### Option 1: Using Netlify Scheduled Functions

If you're hosting on Netlify, you can use scheduled functions or external cron services like:
- [cron-job.org](https://cron-job.org)
- [EasyCron](https://www.easycron.com)
- [Cronitor](https://cronitor.io)

Set up a daily cron job that calls:
```
POST https://your-site.netlify.app/api/subscription/check-expiry
Authorization: Bearer YOUR_CRON_SECRET
```

### Option 2: Using Vercel Cron

If using Vercel, add to `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/subscription/check-expiry",
    "schedule": "0 9 * * *"
  }]
}
```

And add the cron secret to your environment variables.

## Database Migration

Run the migration to add the `expiry_email_sent` column:

```bash
# Apply migration via Supabase dashboard or CLI
supabase migration up
```

Or manually run the SQL in `supabase_migrations/16_add_expiry_email_sent_to_subscriptions.sql`

## Testing Email Setup

1. **Test Subscription Success Email**:
   - Subscribe to a plan
   - Check your email inbox

2. **Test Marketing Email**:
   - Go to Admin Panel → Marketing
   - Enter subject and content
   - Click "Send to All Subscribers"
   - Check subscriber email inboxes

3. **Test Expiry Email**:
   - Manually call the expiry check endpoint:
   ```bash
   curl -X POST https://your-site.netlify.app/api/subscription/check-expiry \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

## Troubleshooting

### Emails Not Sending

1. **Check SMTP Credentials**: Verify your email and password are correct
2. **Check SMTP Port**: Try port 465 with `SMTP_SECURE=true` if 587 doesn't work
3. **Check Firewall**: Ensure your hosting platform allows outbound SMTP connections
4. **Check Logs**: Look for error messages in your application logs

### Common Errors

- **"SMTP credentials not configured"**: Make sure all SMTP environment variables are set
- **"Authentication failed"**: Check your email password
- **"Connection timeout"**: Verify SMTP host and port settings

## Email Templates

Email templates are defined in `lib/emailService.ts`. You can customize:
- Colors and styling
- Content and messaging
- HTML structure

All templates use a responsive design and include:
- Header with gradient background
- Content area with proper spacing
- Call-to-action buttons
- Footer with branding

## Security Notes

- Never commit email passwords to version control
- Use environment variables for all sensitive data
- Consider using an email service like SendGrid or Mailgun for production (more reliable than SMTP)
- The cron secret should be a long, random string

## Next Steps

1. Set up environment variables
2. Run the database migration
3. Test email sending
4. Set up cron job for expiry emails
5. Customize email templates if needed

