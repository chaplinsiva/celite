# Razorpay Webhook Testing Guide

## How to Verify Your Webhook is Working

### 1. **Check Razorpay Dashboard**

Go to your Razorpay Dashboard → Settings → Webhooks

- **URL**: `https://celite.netlify.app/api/razorpay/webhook`
- **Status**: Should show as "Active" or "Live"
- **Events**: Check that these events are subscribed:
  - `subscription.activated`
  - `invoice.paid`
  - `subscription.cancelled`
  - `payment.captured`
  - `payment.failed`

**View Webhook Logs**:
- In the Razorpay Dashboard, you can see webhook delivery attempts
- Check for any failed attempts (red status)
- Review response codes and response times

### 2. **Check Your Application Logs**

Your webhook logs console output. Check your hosting platform logs (Netlify):

- **Console Logs**: Look for `"Received event: <event_name>"`
- **Error Logs**: Look for `"Webhook error:"` messages
- **Success**: Should see `"Received event: <event_name>"` for successful deliveries

**Netlify Logs**:
1. Go to Netlify Dashboard → Your Site → Functions
2. Navigate to `/api/razorpay/webhook`
3. Check function logs for webhook calls

### 3. **Test with Real Transactions**

**For Subscription Payments**:
1. Make a test subscription purchase on your site
2. Complete the payment in Razorpay checkout
3. Check Razorpay Dashboard → Webhooks → Recent deliveries
4. Verify the webhook was triggered (`subscription.activated` or `invoice.paid`)
5. Check your database:
   - `subscriptions` table should show `is_active: true`
   - User subscription status should be updated

**For One-Time Payments**:
1. Make a test product purchase
2. Complete the payment
3. Check webhook delivery for `payment.captured` event
4. Verify in database:
   - `orders` table should show `status: 'paid'`

### 4. **Manual Testing with cURL**

You can manually trigger a test webhook (requires webhook secret):

```bash
# Replace YOUR_WEBHOOK_SECRET with your actual secret
WEBHOOK_SECRET="your_webhook_secret_here"

# Sample webhook payload
BODY='{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_test123",
        "order_id": "order_test123",
        "notes": {
          "user_id": "test_user_id",
          "slug": "test-template"
        }
      }
    }
  }
}'

# Generate signature
SIGNATURE=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | sed 's/^.* //')

# Send test webhook
curl -X POST https://celite.netlify.app/api/razorpay/webhook \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: $SIGNATURE" \
  -d "$BODY"
```

### 5. **Test Webhook Endpoint** (Optional)

I can create a test endpoint that allows you to trigger a test webhook with proper signature verification. This can be useful for local testing.

### 6. **Common Issues & Solutions**

**Issue**: Webhook returns 400 "Missing signature or secret"
- **Solution**: Ensure `RAZORPAY_WEBHOOK_SECRET` is set in:
  - Admin Settings Panel (`RAZORPAY_WEBHOOK_SECRET`)
  - Or environment variable `RAZORPAY_WEBHOOK_SECRET` on Netlify

**Issue**: Webhook returns 400 "Invalid signature"
- **Solution**: The webhook secret in your Razorpay Dashboard must match the one in your settings
- Double-check for any extra spaces or characters

**Issue**: Webhook is not being triggered
- **Solution**: 
  1. Verify the webhook URL is correct in Razorpay Dashboard
  2. Ensure the endpoint is publicly accessible (not behind authentication)
  3. Check that events are properly subscribed in Razorpay Dashboard

**Issue**: Webhook returns 500 errors
- **Solution**: Check application logs for specific error messages
- Verify database tables exist (`subscriptions`, `orders`, `users`)
- Check Supabase connection is working

### 7. **Monitoring Webhook Health**

**Regular Checks**:
- Monitor webhook success rate in Razorpay Dashboard
- Set up alerts for failed webhook deliveries
- Regularly check application logs for errors

**Health Indicators**:
- ✅ Webhook responds with `200 OK` status
- ✅ Database updates are successful
- ✅ No error messages in logs

### 8. **Webhook Secret Management**

**Where to Find/Set Webhook Secret**:

1. **Razorpay Dashboard**:
   - Settings → Webhooks → Your Webhook
   - Copy the webhook secret

2. **Your Application**:
   - Admin Panel → Settings → Razorpay → Webhook Secret
   - Or set as environment variable: `RAZORPAY_WEBHOOK_SECRET`

**Security Note**: Never commit webhook secrets to version control. Always use environment variables or secure settings storage.

---

## Quick Verification Checklist

- [ ] Webhook URL configured in Razorpay Dashboard
- [ ] Webhook secret set in admin panel or environment variable
- [ ] Events subscribed: `subscription.activated`, `invoice.paid`, `payment.captured`, `payment.failed`, `subscription.cancelled`
- [ ] Webhook shows as "Active" in Razorpay Dashboard
- [ ] Test transaction triggers webhook (check Razorpay Dashboard logs)
- [ ] Database updates correctly after webhook (check `subscriptions` or `orders` table)
- [ ] Application logs show successful webhook processing

