# Fix Subscription Renewals - Admin Guide

## Overview
This guide explains how to identify and fix users whose autopay payments were deducted but their subscription validity was not updated in the database.

## Problem
Some users had their autopay payments successfully deducted by Razorpay, but the database `valid_until` field was not extended. This caused:
- Users to lose access even though they paid
- Homepage renew option not refreshing
- Subscription status showing as expired despite active payments

## Solution
An admin API endpoint has been created to:
1. Find all active subscriptions with autopay enabled
2. Verify each subscription's status with Razorpay
3. Check if payment was deducted but `valid_until` wasn't extended
4. Update `valid_until` for affected users

## How to Run the Fix Script

### Option 1: Using cURL (Command Line)
```bash
curl -X POST https://your-domain.com/api/admin/fix-subscription-renewals \
  -H "Authorization: Bearer YOUR_ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

### Option 2: Using Postman or Similar Tool
1. Method: `POST`
2. URL: `https://your-domain.com/api/admin/fix-subscription-renewals`
3. Headers:
   - `Authorization: Bearer YOUR_ADMIN_ACCESS_TOKEN`
   - `Content-Type: application/json`
4. Body: (empty)

### Option 3: Using Browser Console (if logged in as admin)
```javascript
fetch('/api/admin/fix-subscription-renewals', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${YOUR_ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

## Response Format
The API returns:
```json
{
  "ok": true,
  "message": "Processed X subscriptions",
  "fixed": 5,
  "errors": 0,
  "skipped": 10,
  "details": {
    "fixed": [
      {
        "user_id": "uuid",
        "plan": "monthly",
        "old_valid_until": "2024-01-01T00:00:00Z",
        "new_valid_until": "2024-02-01T00:00:00Z"
      }
    ],
    "errors": [],
    "skipped": []
  }
}
```

## What Gets Fixed
- **Fixed**: Users whose `valid_until` was extended based on Razorpay subscription data
- **Skipped**: Users whose subscriptions are already up-to-date or cancelled in Razorpay
- **Errors**: Users where an error occurred (e.g., Razorpay API error, database error)

## Important Notes
1. **Admin Access Required**: Only users in the `admins` table can run this script
2. **Safe to Run Multiple Times**: The script is idempotent - running it multiple times won't cause issues
3. **No Data Loss**: The script only extends `valid_until`, never shortens it
4. **Razorpay API Limits**: If you have many subscriptions, the script may take a few minutes to complete

## Verification
After running the script:
1. Check the response to see how many subscriptions were fixed
2. Verify affected users can now access their subscriptions
3. Check the dashboard to ensure subscription status is correct

## Future Prevention
The webhook handler has been updated to:
- Properly extend `valid_until` from current date (not reset from now)
- Handle renewals correctly for all subscription types (weekly, monthly, yearly)
- Use better user identification when `user_id` is missing from webhook payload

The dashboard now auto-refreshes every 30 seconds and on window focus to catch subscription updates.

