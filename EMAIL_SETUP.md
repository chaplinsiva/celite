# Email Setup Guide

## Overview

The application now sends automatic email notifications for:
1. **Individual Product Purchases** - Confirmation email with purchased template names
2. **Subscription Payments** - Confirmation email when subscription is activated/renewed

**All email configuration is stored in Supabase settings table** - no need to set environment variables!

## Email Configuration via Supabase Settings

### Setup Steps:

1. **Sign up at Resend.com** (if you haven't already)
   - Visit [resend.com](https://resend.com)
   - Create a free account (generous free tier available)
   - Get your API key from the dashboard

2. **Verify your domain** (or use Resend's default domain for testing)
   - For production: Verify your domain in Resend dashboard
   - For testing: Use Resend's default domain `onboarding@resend.dev`

3. **Configure in Admin Panel**
   - Go to Admin Dashboard → Settings
   - Scroll to "Email (Resend API)" section
   - Enter your Resend API Key: `re_xxxxxxxxxxxxxxxxxxxxxxxx`
   - Enter From Email: `Celite <noreply@yourdomain.com>` or `Celite <onboarding@resend.dev>` (for testing)
   - Click "Save Email Settings"

**That's it!** All email settings are now stored securely in Supabase settings table.

### Fallback to Environment Variables

If you prefer using environment variables (optional fallback):
- Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in Netlify environment variables
- The system will use Supabase settings first, then fall back to environment variables

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

1. **Check Supabase Settings:**
   - Go to Admin Dashboard → Settings
   - Verify `RESEND_API_KEY` is saved in Supabase settings table
   - Verify `RESEND_FROM_EMAIL` is saved
   - Make sure you clicked "Save Email Settings" button

2. **Check Logs:**
   - View Netlify function logs for email errors
   - Check Resend dashboard for delivery status
   - Look for "Email sent successfully via Resend" in logs

3. **Verify Domain (Resend):**
   - For production, verify your domain in Resend dashboard
   - Use verified domain for `RESEND_FROM_EMAIL`
   - For testing, use `onboarding@resend.dev`

4. **Fallback to Environment Variables:**
   - If Supabase settings don't work, set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in Netlify
   - System will use Supabase settings first, then fall back to env vars

### Email Format Issues?

- Templates use HTML with inline CSS
- Tested for compatibility with major email clients
- Responsive design for mobile devices

## Production Checklist

- [ ] Set up Resend account and verify domain
- [ ] Configure `RESEND_API_KEY` in Admin Panel → Settings → Email
- [ ] Configure `RESEND_FROM_EMAIL` in Admin Panel → Settings → Email
- [ ] Verify settings are saved in Supabase settings table
- [ ] Test purchase confirmation email
- [ ] Test subscription confirmation email
- [ ] Verify emails are delivered correctly
- [ ] Check spam folder if emails not received

