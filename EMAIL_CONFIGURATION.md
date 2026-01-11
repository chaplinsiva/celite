# Email Configuration - Quick Setup Guide

## ✅ Email Setup Complete

Your email system is already configured with the following features:

1. **Subscription Success Email** - Sent when a user successfully subscribes
2. **Payment Taken Email** - Sent when a subscription payment is processed (renewal)
3. **Subscription Expiring Email** - Sent 3 days before subscription expires
4. **Marketing Emails** - Admin can send emails to all active subscribers from the admin panel

## 🔧 Required: Update Your .env.local File

You need to update your `.env.local` file with the following environment variables:

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

## 📍 Where to Add These Variables

1. **Local Development**: Add to `.env.local` file in your project root
2. **Netlify**: Go to Site Settings → Environment Variables → Add each variable
3. **Vercel**: Go to Project Settings → Environment Variables → Add each variable

## 🎯 How It Works

### 1. Subscription Success Email
- **When**: Automatically sent when a user subscribes
- **Location**: `app/api/subscription/activate/route.ts`
- **Template**: `lib/emailService.ts` → `subscriptionSuccess`

### 2. Payment Taken Email
- **When**: Automatically sent when Razorpay processes a renewal payment
- **Location**: `app/api/razorpay/webhook/route.ts`
- **Template**: `lib/emailService.ts` → `subscriptionPaymentTaken`

### 3. Subscription Expiring Email
- **When**: Sent 3 days before subscription expires (via cron job)
- **Location**: `app/api/subscription/check-expiry/route.ts`
- **Template**: `lib/emailService.ts` → `subscriptionExpiring`
- **Setup**: Requires a daily cron job (see EMAIL_SETUP.md)

### 4. Marketing Emails
- **How**: Admin Panel → Marketing → Enter subject and content → Click "Send to All Subscribers"
- **Location**: `app/admin/components/MarketingPanel.tsx`
- **API**: `app/api/admin/marketing/send-email/route.ts`
- **Template**: `lib/emailService.ts` → `marketingEmail`

## 🧪 Testing

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

## ⚠️ Important Notes

- The password contains special characters (`@&`), make sure to quote it properly if needed
- Never commit `.env.local` to version control
- The email system uses Hostinger SMTP (smtp.hostinger.com)
- All emails are sent from `celitecontactsupport@celite.in`

## 🚀 Next Steps

1. Update your `.env.local` file with the credentials above
2. Update environment variables on your hosting platform (Netlify/Vercel)
3. Test the email functionality
4. Set up a cron job for subscription expiry emails (see EMAIL_SETUP.md)

