import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    // Get signature from headers
    const signature = req.headers.get('x-razorpay-signature');
    
    // Get webhook secret from database settings (fallback to env)
    const supabase = getSupabaseAdminClient();
    let secret: string | null = null;
    
    try {
      const { data: settings } = await supabase.from('settings').select('key,value');
      const settingsMap: Record<string, string> = {};
      (settings ?? []).forEach((row: any) => { settingsMap[row.key] = row.value; });
      secret = settingsMap.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_WEBHOOK_SECRET || null;
    } catch (e) {
      // If settings table doesn't exist, fallback to env
      secret = process.env.RAZORPAY_WEBHOOK_SECRET || null;
    }

    if (!signature || !secret) {
      return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 });
    }

    // Get raw body for signature verification
    // Note: For webhook signature verification, we need the exact raw body string
    const body = await req.text();
    const bodyObj = JSON.parse(body);

    // Verify signature
    const expected = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    if (expected !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = bodyObj.event;
    const payload = bodyObj.payload;

    console.log('Received event:', event);

    const admin = getSupabaseAdminClient();

    // ✅ SUBSCRIPTION LOGIC
    if (event === 'subscription.activated' || event === 'invoice.paid') {
      const userId =
        payload.subscription?.entity?.notes?.user_id ||
        payload.invoice?.entity?.notes?.user_id;

      if (userId) {
        // Update users table with subscription status
        await admin
          .from('users')
          .update({
            subscription_status: 'active',
            last_payment_status: 'success',
          })
          .eq('id', userId);

        // Also update subscriptions table for compatibility with existing code
        const subscriptionEntity = payload.subscription?.entity || payload.invoice?.entity;
        const razorpaySubscriptionId = subscriptionEntity?.id || null;
        const plan = subscriptionEntity?.plan_id
          ? subscriptionEntity.plan_id.includes('yearly')
            ? 'yearly'
            : 'monthly'
          : null;

        if (plan) {
          // Calculate valid_until based on plan
          const now = new Date();
          const validUntil = new Date(now);
          if (plan === 'yearly') {
            validUntil.setFullYear(validUntil.getFullYear() + 1);
          } else {
            validUntil.setMonth(validUntil.getMonth() + 1);
          }

          // Upsert subscription with Razorpay subscription ID
          await admin
            .from('subscriptions')
            .upsert(
              {
                user_id: userId,
                is_active: true,
                plan,
                valid_until: validUntil.toISOString(),
                razorpay_subscription_id: razorpaySubscriptionId,
              },
              { onConflict: 'user_id' }
            );
        }
      }
    }

    if (event === 'payment.failed' || event === 'subscription.cancelled') {
      const userId =
        payload.subscription?.entity?.notes?.user_id ||
        payload.payment?.entity?.notes?.user_id ||
        payload.invoice?.entity?.notes?.user_id;

      if (userId) {
        // Update users table
        await admin
          .from('users')
          .update({
            subscription_status: 'inactive',
            last_payment_status: 'failed',
          })
          .eq('id', userId);

        // Also update subscriptions table
        await admin
          .from('subscriptions')
          .update({
            is_active: false,
          })
          .eq('user_id', userId);
      }
    }

    // ✅ ONE-TIME PRODUCT LOGIC
    if (event === 'payment.captured') {
      const purchaseId = payload.payment?.entity?.notes?.purchase_id;
      const orderId = payload.payment?.entity?.order_id;

      if (purchaseId) {
        // Update purchases table
        await admin
          .from('purchases')
          .update({
            status: 'paid',
          })
          .eq('id', purchaseId);
      }

      // Also update orders table for compatibility
      if (orderId) {
        // Extract order_id from Razorpay order_id format
        // Razorpay order_id is like "order_xxxxx", we might need to map it
        // For now, we'll update any orders that match
        await admin
          .from('orders')
          .update({
            status: 'paid',
          })
          .eq('razorpay_order_id', orderId)
          .then(() => {
            // If no match by razorpay_order_id, try to find by notes
            // This is a fallback since we might not have stored razorpay_order_id
          });
      }
    }

    if (event === 'payment.failed') {
      const purchaseId = payload.payment?.entity?.notes?.purchase_id;
      const orderId = payload.payment?.entity?.order_id;

      if (purchaseId) {
        // Update purchases table
        await admin
          .from('purchases')
          .update({
            status: 'failed',
          })
          .eq('id', purchaseId);
      }

      // Also update orders table for compatibility
      if (orderId) {
        await admin
          .from('orders')
          .update({
            status: 'failed',
          })
          .eq('razorpay_order_id', orderId);
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (e: any) {
    console.error('Webhook error:', e);
    return NextResponse.json({ error: e?.message || 'Webhook processing failed' }, { status: 500 });
  }
}

