# Email Setup Guide

## Overview

The application now sends automatic email notifications for:
1. **Individual Product Purchases** - Confirmation email with purchased template names
2. **Subscription Payments** - Confirmation email when subscription is activated/renewed

## Email Service Options

### Option 1: Resend API (Recommended - Easiest)

1. Sign up at [resend.com](https://resend.com)
2. Get your API key from the dashboard
3. Verify your domain (or use Resend's default domain for testing)
4. Set environment variables in Netlify:

```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=Celite <noreply@yourdomain.com>
```

**For Netlify:**
- Go to Site Settings → Environment Variables
- Add `RESEND_API_KEY` with your Resend API key
- Add `RESEND_FROM_EMAIL` with your sender email (e.g., `Celite <noreply@yourdomain.com>`)

### Option 2: SMTP (Custom Email Server)

If you prefer using your own SMTP server:

1. Set environment variables:

```
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_USER=your-email@yourdomain.com
SMTP_PASS=your-password
SMTP_FROM=Celite <noreply@yourdomain.com>
```

**Note:** SMTP functionality requires additional implementation. Currently, only Resend API is fully implemented.

## Email Templates

### Purchase Confirmation Email
- **Trigger:** When individual product purchase is successful
- **Content:** Lists purchased template names and link to dashboard
- **Subject:** "Purchase Successful - X Template(s) from Celite"

### Subscription Confirmation Email
- **Trigger:** When subscription is activated or renewed
- **Content:** Subscription details, plan type, validity date
- **Subject:** "Subscription Activated - [Monthly/Yearly] Pro Plan"

## Testing

To test email functionality:

1. **With Resend API:**
   - Make a test purchase
   - Check Resend dashboard for email delivery logs
   - Verify email is received

2. **Without Email Service (Development):**
   - Emails will be logged to console
   - Check Netlify function logs to see email content

## Email Content

### Purchase Confirmation Includes:
- User name
- List of purchased templates
- Link to dashboard (https://celite.netlify.app/dashboard)
- Contact information

### Subscription Confirmation Includes:
- User name
- Plan type (Monthly/Yearly)
- Valid until date
- Link to dashboard
- Contact information

## Troubleshooting

### Emails Not Sending?

1. **Check Environment Variables:**
   - Verify `RESEND_API_KEY` is set in Netlify
   - Verify `RESEND_FROM_EMAIL` is set

2. **Check Logs:**
   - View Netlify function logs for email errors
   - Check Resend dashboard for delivery status

3. **Verify Domain (Resend):**
   - For production, verify your domain in Resend
   - Use verified domain for `RESEND_FROM_EMAIL`

### Email Format Issues?

- Templates use HTML with inline CSS
- Tested for compatibility with major email clients
- Responsive design for mobile devices

## Production Checklist

- [ ] Set up Resend account and verify domain
- [ ] Add `RESEND_API_KEY` to Netlify environment variables
- [ ] Add `RESEND_FROM_EMAIL` to Netlify environment variables
- [ ] Test purchase confirmation email
- [ ] Test subscription confirmation email
- [ ] Verify emails are delivered correctly
- [ ] Check spam folder if emails not received

