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

    // ✅ SUBSCRIPTION LOGIC - Activation/Payment Success
    if (event === 'subscription.activated' || event === 'invoice.paid' || event === 'invoice.payment_succeeded') {
      const userId =
        payload.subscription?.entity?.notes?.user_id ||
        payload.invoice?.entity?.notes?.user_id ||
        payload.payment?.entity?.notes?.user_id;

      if (userId) {
        // Check if this is a subscription payment (not one-time)
        const invoiceEntity = payload.invoice?.entity;
        const subscriptionEntity = payload.subscription?.entity;
        const paymentEntity = payload.payment?.entity;
        
        // Determine if this payment is for a subscription (has subscription_id in invoice or payment)
        const isSubscriptionPayment = 
          invoiceEntity?.subscription_id || 
          subscriptionEntity?.id ||
          paymentEntity?.invoice_id; // Payments linked to invoices are subscription payments

        if (isSubscriptionPayment) {
          // Get existing subscription first to check if it was cancelled
          const { data: existingSub } = await admin
            .from('subscriptions')
            .select('plan, is_active, razorpay_subscription_id')
            .eq('user_id', userId)
            .maybeSingle();
          
          // Get subscription ID from various sources
          const razorpaySubscriptionId = 
            subscriptionEntity?.id || 
            invoiceEntity?.subscription_id || 
            payload.subscription?.entity?.id || 
            null;
          
          // CRITICAL: ALWAYS prioritize existing subscription's plan if it exists
          // This is the source of truth - don't override it based on webhook payload
          let finalPlan: string | null = null;
          
          // Priority order:
          // 1. ALWAYS use existing subscription's plan if it exists (most reliable)
          // 2. Only if no existing subscription, try to parse from webhook
          // 3. Only if no existing subscription and can't parse, default to monthly
          
          if (existingSub?.plan) {
            // Existing subscription has a plan - USE IT (this is the source of truth)
            finalPlan = existingSub.plan;
            console.log(`Using existing subscription plan for user ${userId}: ${finalPlan}`);
          } else {
            // No existing subscription - try to parse from webhook
            const subscriptionForPlan = subscriptionEntity || invoiceEntity;
            const planFromWebhook = subscriptionForPlan?.plan_id
              ? subscriptionForPlan.plan_id.includes('yearly')
                ? 'yearly'
                : subscriptionForPlan.plan_id.includes('weekly')
                ? 'weekly'
                : 'monthly'
              : null;
            
            if (planFromWebhook) {
              finalPlan = planFromWebhook;
              console.log(`Parsed plan from webhook for user ${userId}: ${finalPlan}`);
            } else {
              // Last resort: default to monthly only if no existing subscription
              finalPlan = 'monthly';
              console.log(`No plan found, defaulting to monthly for user ${userId} (new subscription)`);
            }
          }

          // CRITICAL: Only reactivate if subscription is already active OR it's a new subscription
          // DO NOT reactivate cancelled subscriptions from webhook events unless explicitly a renewal
          const shouldReactivate = 
            !existingSub || // New subscription (no existing record)
            (existingSub.is_active === true); // Existing subscription is already active
          
          // DO NOT reactivate if subscription is cancelled (is_active: false)
          // This prevents cancelled subscriptions from being reactivated by delayed webhook events
          if (existingSub && existingSub.is_active === false) {
            console.log(`Skipping reactivation: Subscription is cancelled for user ${userId}. Plan preserved: ${existingSub.plan}`);
            return NextResponse.json({ status: 'ok', message: 'Subscription is cancelled, not reactivating' });
          }
          
          if (shouldReactivate && finalPlan) {
            console.log(`Reactivating subscription for user: ${userId}, plan: ${finalPlan}`);
            
            // Update users table with subscription status
            await admin
              .from('users')
              .update({
                subscription_status: 'active',
                last_payment_status: 'success',
              })
              .eq('id', userId);

            // Calculate valid_until based on plan
            const now = new Date();
            const validUntil = new Date(now);
            if (finalPlan === 'yearly') {
              validUntil.setFullYear(validUntil.getFullYear() + 1);
            } else if (finalPlan === 'weekly') {
              validUntil.setDate(validUntil.getDate() + 7);
            } else {
              validUntil.setMonth(validUntil.getMonth() + 1);
            }

            // Update subscription - but be very careful not to override cancelled subscriptions
            if (existingSub) {
              // Only update if subscription is currently active (extra safety check)
              // We already checked above, but double-check here to be safe
              if (existingSub.is_active === true) {
                await admin
                  .from('subscriptions')
                  .update({
                    is_active: true,
                    plan: finalPlan, // This should be the existing plan (preserved above)
                    valid_until: validUntil.toISOString(),
                    razorpay_subscription_id: razorpaySubscriptionId,
                    autopay_enabled: true,
                  })
                  .eq('user_id', userId)
                  .eq('is_active', true); // Extra safety: only update if already active
                console.log(`Updated active subscription for user ${userId} with plan: ${finalPlan}`);
              } else {
                console.error(`CRITICAL: Attempted to update inactive subscription for user ${userId}. This should not happen!`);
              }
            } else {
              // New subscription - create it (only if no existing subscription)
              await admin
                .from('subscriptions')
                .insert({
                  user_id: userId,
                  is_active: true,
                  plan: finalPlan,
                  valid_until: validUntil.toISOString(),
                  razorpay_subscription_id: razorpaySubscriptionId,
                  autopay_enabled: true,
                });
              console.log(`Created new subscription for user ${userId} with plan: ${finalPlan}`);
            }
            
            console.log(`Subscription reactivated for user: ${userId}, plan: ${finalPlan}, valid_until: ${validUntil.toISOString()}`);
          } else {
            console.log(`Skipping reactivation for user: ${userId}. Should reactivate: ${shouldReactivate}, Final plan: ${finalPlan}, Existing sub:`, existingSub);
          }
        }
      }
    }

    // ✅ SUBSCRIPTION LOGIC - Autopay mandate cancelled (do NOT cancel subscription)
    if (event === 'subscription.cancelled') {
      const userId =
        payload.subscription?.entity?.notes?.user_id ||
        payload.payment?.entity?.notes?.user_id ||
        payload.invoice?.entity?.notes?.user_id;

      if (userId) {
        console.log(`Autopay/mandate cancelled for user: ${userId}. Keeping subscription active until payment fails.`);

        await admin
          .from('subscriptions')
          .update({ autopay_enabled: false })
          .eq('user_id', userId);

        await admin
          .from('users')
          .update({
            last_payment_status: 'mandate_cancelled',
          })
          .eq('id', userId);
      }

      return NextResponse.json({ status: 'ok', message: 'Autopay disabled; subscription remains active' });
    }

    // ✅ SUBSCRIPTION LOGIC - Cancellation/Payment Failure
    if (event === 'payment.failed' || event === 'invoice.payment_failed') {
      const userId =
        payload.subscription?.entity?.notes?.user_id ||
        payload.payment?.entity?.notes?.user_id ||
        payload.invoice?.entity?.notes?.user_id;

      if (userId) {
        // Check if this is a subscription payment failure (not one-time)
        const invoiceEntity = payload.invoice?.entity;
        const paymentEntity = payload.payment?.entity;
        const subscriptionEntity = payload.subscription?.entity;
        
        // Determine if this payment failure is for a subscription
        // Subscription payments are linked to invoices or have subscription_id
        const isSubscriptionPayment = 
          subscriptionEntity?.id ||
          invoiceEntity?.subscription_id ||
          paymentEntity?.invoice_id || // If payment is linked to an invoice, it's subscription
          event === 'invoice.payment_failed';

        if (isSubscriptionPayment) {
          // Get existing subscription to preserve plan - THIS IS THE MOST RELIABLE SOURCE
          const { data: existingSub } = await admin
            .from('subscriptions')
            .select('plan, autopay_enabled')
            .eq('user_id', userId)
            .maybeSingle();
          
          const autopayEnabled = existingSub?.autopay_enabled ?? true;
          const isAutoCancellationEvent = event === 'subscription.cancelled';
          
          if (isAutoCancellationEvent && !autopayEnabled) {
            console.log(`Skipping subscription.cancelled auto-cancel for user ${userId} because autopay/mandate is disabled`);
            return NextResponse.json({ status: 'ok', message: 'Autopay disabled; subscription left active' });
          }
          
          console.log(`Cancelling subscription due to payment failure/cancellation for user: ${userId}`);
          
          // CRITICAL: ALWAYS prioritize existing subscription's plan (it's what the user actually had)
          // This is the most reliable source - our database knows what plan the user had
          // Do NOT try to override it from webhook payload
          let planToPreserve = existingSub?.plan || null;
          
          // Only try to get plan from webhook payload if we don't have an existing subscription at all
          // This should rarely happen, but if it does, we'll try to parse from webhook
          if (!planToPreserve) {
            const subscriptionForPlan = subscriptionEntity || invoiceEntity;
            if (subscriptionForPlan?.plan_id) {
              // Try to match plan name - Razorpay sometimes includes plan name in subscription
              const planName = subscriptionForPlan.plan_name || subscriptionForPlan.item?.name || '';
              if (planName.toLowerCase().includes('yearly')) {
                planToPreserve = 'yearly';
              } else if (planName.toLowerCase().includes('weekly')) {
                planToPreserve = 'weekly';
              } else if (planName.toLowerCase().includes('monthly')) {
                planToPreserve = 'monthly';
              } else if (subscriptionForPlan.plan_id.toLowerCase().includes('yearly')) {
                planToPreserve = 'yearly';
              } else if (subscriptionForPlan.plan_id.toLowerCase().includes('weekly')) {
                planToPreserve = 'weekly';
              } else if (subscriptionForPlan.plan_id.toLowerCase().includes('monthly')) {
                planToPreserve = 'monthly';
              }
            }
          }
          
          // Update users table
          await admin
            .from('users')
            .update({
              subscription_status: 'inactive',
              last_payment_status: 'failed',
            })
            .eq('id', userId);

          // Update subscriptions table - CANCEL SUBSCRIPTION but preserve plan
          // Always update is_active to false, and ALWAYS preserve plan from existing subscription if it exists
          const updateData: any = { is_active: false, autopay_enabled: false };
          
          // CRITICAL: Always preserve the plan from existing subscription if it exists
          // This ensures yearly stays yearly, monthly stays monthly, etc.
          // existingSub.plan is the most reliable source
          if (existingSub?.plan) {
            updateData.plan = existingSub.plan; // Preserve the plan so user can renew with same plan
            planToPreserve = existingSub.plan; // Update for logging
          } else if (planToPreserve) {
            // Only use webhook-derived plan if we have no existing subscription at all
            updateData.plan = planToPreserve;
          }
          
          await admin
            .from('subscriptions')
            .update(updateData)
            .eq('user_id', userId);
          
          console.log(`Subscription cancelled for user: ${userId}, plan preserved: ${planToPreserve || existingSub?.plan || 'none'}`);
        }
        // If it's a one-time payment failure, we'll handle it in the ONE-TIME PRODUCT LOGIC section below
      }
    }

    // ✅ ONE-TIME PRODUCT LOGIC
    // Only process if this is NOT a subscription payment
    if (event === 'payment.captured') {
      const purchaseId = payload.payment?.entity?.notes?.purchase_id;
      const orderId = payload.payment?.entity?.order_id;
      const invoiceId = payload.payment?.entity?.invoice_id;

      // Skip if this payment is linked to an invoice (subscription payment)
      if (!invoiceId && (purchaseId || orderId)) {
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
    }

    // Handle one-time payment failures (not subscription)
    if (event === 'payment.failed') {
      const purchaseId = payload.payment?.entity?.notes?.purchase_id;
      const orderId = payload.payment?.entity?.order_id;
      const invoiceId = payload.payment?.entity?.invoice_id;

      // Only process one-time payments (not subscription invoices)
      if (!invoiceId && (purchaseId || orderId)) {
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
    }

    return NextResponse.json({ status: 'ok' });
  } catch (e: any) {
    console.error('Webhook error:', e);
    return NextResponse.json({ error: e?.message || 'Webhook processing failed' }, { status: 500 });
  }
}

