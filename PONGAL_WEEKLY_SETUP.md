# Pongal Weekly Subscription Setup

## Overview
This document describes the Pongal Weekly Offer subscription system:
- **Price**: ₹499
- **Duration**: 3 weeks
- **Downloads**: 3 downloads per week (resets weekly)
- **Auto-cancels**: After 3 weeks, subscription automatically cancels and autopay is disabled

## Database Schema

### Table: `pongal_weekly_subscriptions`
Created via migration `create_pongal_weekly_subscriptions_table`

Columns:
- `id`: UUID primary key
- `user_id`: References auth.users
- `subscription_id`: References subscriptions table
- `downloads_used`: Integer (0-3) - downloads used in current week
- `week_number`: Integer (1-3) - current week number
- `week_start_date`: Timestamp - when subscription started
- `current_week_start`: Timestamp - start of current week (resets weekly)
- `expires_at`: Timestamp - when subscription expires (3 weeks from start)
- `created_at`, `updated_at`: Timestamps

## Features Implemented

### 1. Pricing & Checkout
- ✅ Added Pongal plan to `PricingContent.tsx` (₹499, 3 weeks)
- ✅ Updated `PromoBanner.tsx` to show Pongal offer
- ✅ Updated checkout page to handle `pongal_weekly` as one-time payment
- ✅ Order summary shows Pongal plan details

### 2. Subscription Management
- ✅ Updated `app/api/subscription/activate/route.ts` to handle `pongal_weekly`
- ✅ Creates `pongal_weekly_subscriptions` record on activation
- ✅ Sets `autopay_enabled` to `false` for Pongal subscriptions
- ✅ Subscription expires after 3 weeks

### 3. Download Limits
- ✅ Updated `app/api/download/[slug]/route.ts` to check weekly limits
- ✅ Automatically resets downloads when new week starts
- ✅ Returns error with message when limit reached:
  - "Your credits will reset next week. Check next week."
  - Shows days until reset if applicable

### 4. Progress Tracking
- ✅ Created `app/api/pongal-weekly/status/route.ts` - API endpoint to get download status
- ✅ Created `components/PongalProgressBar.tsx` - Progress bar component
- ✅ Added progress bar to dashboard (shows when user has Pongal subscription)
- ✅ Progress bar shows:
  - Downloads used/available (e.g., "2 / 3 downloads available")
  - Week number (1/3, 2/3, 3/3)
  - Days until reset when limit reached

### 5. Auto-Cancellation
- ✅ Created `app/api/pongal-weekly/cancel-expired/route.ts` - Endpoint to cancel expired subscriptions
- ✅ Cancels subscriptions that have expired (3 weeks from start)
- ✅ Disables autopay for expired subscriptions
- ✅ Cancels Razorpay subscription if autopay was enabled

## API Endpoints

### GET `/api/pongal-weekly/status`
Returns current download status for user's Pongal subscription.

**Response:**
```json
{
  "ok": true,
  "hasSubscription": true,
  "downloadsUsed": 2,
  "downloadsAvailable": 1,
  "weekNumber": 2,
  "expiresAt": "2024-02-15T00:00:00Z",
  "nextWeekReset": "2024-02-08T00:00:00Z",
  "daysUntilReset": 3
}
```

### POST `/api/pongal-weekly/cancel-expired`
Cancels expired Pongal subscriptions. Should be called by a cron job.

**Headers:**
- `Authorization: Bearer {CRON_SECRET}`

**Response:**
```json
{
  "ok": true,
  "message": "Cancelled 5 expired Pongal subscriptions",
  "cancelled": 5
}
```

## Cron Job Setup

To automatically cancel expired subscriptions, set up a cron job to call:

```
POST https://your-domain.com/api/pongal-weekly/cancel-expired
Authorization: Bearer {CRON_SECRET}
```

**Recommended frequency**: Daily at midnight (00:00 UTC)

**Example using Vercel Cron:**
Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/pongal-weekly/cancel-expired",
    "schedule": "0 0 * * *"
  }]
}
```

**Environment Variable:**
Set `CRON_SECRET` in your environment variables for security.

## Weekly Reset Logic

Downloads automatically reset when:
1. A new week starts (7 days from `current_week_start`)
2. User makes a download request (checked in download API)
3. User views status (checked in status API)

The system calculates which week the user is in based on:
- `week_start_date`: When subscription started
- Current date: Now
- Week number = floor((now - week_start_date) / 7 days) + 1 (max 3)

## User Experience

### When Download Limit Reached
- User sees error message: "You reached your limit. Your credits will reset next week. Check next week."
- Progress bar shows red and displays limit message
- Download button is disabled (403 error)

### Progress Bar Display
- Shows on dashboard when user has active Pongal subscription
- Displays:
  - Week number (Week 1/3, Week 2/3, Week 3/3)
  - Downloads available (e.g., "1 / 3 downloads available")
  - Progress bar (visual indicator)
  - Days until reset when limit reached

### After 3 Weeks
- Subscription automatically expires
- Autopay is disabled
- User can no longer download (subscription inactive)
- Progress bar no longer shows

## Testing

1. **Create Pongal Subscription:**
   - Go to `/pricing`
   - Click "Subscribe Now" on Pongal Weekly plan
   - Complete payment (₹499)

2. **Test Download Limits:**
   - Download 3 templates (should work)
   - Try to download 4th template (should show limit message)

3. **Test Weekly Reset:**
   - Wait for new week or manually update `current_week_start` in database
   - Downloads should reset to 0

4. **Test Auto-Cancellation:**
   - Update `expires_at` to past date
   - Call `/api/pongal-weekly/cancel-expired` with cron secret
   - Subscription should be deactivated

## Notes

- Pongal subscriptions are one-time payments (not recurring)
- Autopay is automatically disabled for Pongal subscriptions
- Weekly reset happens automatically when user interacts with the system
- Progress bar refreshes every minute on dashboard

