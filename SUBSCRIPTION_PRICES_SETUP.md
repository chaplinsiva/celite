# Subscription Prices Setup

## Overview
Subscription amounts are now fetched from the database settings table:
- **Monthly**: ₹799 (79,900 paise)
- **Yearly**: ₹5,499 (549,900 paise)

## Database Setup

### Initial Setup
Go to your Admin Dashboard → Settings → Razorpay section and enter:
- **Monthly Amount (paise)**: `79900`
- **Yearly Amount (paise)**: `549900`

Or insert directly into the `settings` table:
```sql
INSERT INTO public.settings (key, value) VALUES 
  ('RAZORPAY_MONTHLY_AMOUNT', '79900'),
  ('RAZORPAY_YEARLY_AMOUNT', '549900')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

## How It Works

1. **Settings Panel (Admin)**: Admins can update subscription prices in the Settings panel
2. **Pricing Component**: Fetches prices from the database and displays them
3. **Subscription API**: Uses `getRazorpayCreds()` which reads from the database
4. **Razorpay Integration**: Uses the amounts from database (in paise) for payment processing

## Default Values
If no values are set in the database, the system defaults to:
- Monthly: ₹799 (79,900 paise)
- Yearly: ₹5,499 (549,900 paise)

## Files Updated
- `lib/razorpay.ts` - Default values updated
- `app/api/payments/razorpay/subscription/route.ts` - Now uses database values
- `components/Pricing.tsx` - Fetches and displays prices from database
- `app/admin/components/SettingsPanel.tsx` - Default values updated
- `app/dashboard/DashboardClient.tsx` - Display values updated

