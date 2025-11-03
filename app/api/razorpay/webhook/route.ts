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
          
          // Determine plan from subscription entity or invoice
          const subscriptionForPlan = subscriptionEntity || invoiceEntity;
          const planFromWebhook = subscriptionForPlan?.plan_id
            ? subscriptionForPlan.plan_id.includes('yearly')
              ? 'yearly'
              : subscriptionForPlan.plan_id.includes('weekly')
              ? 'weekly'
              : 'monthly'
            : null;

          // Determine final plan:
          // 1. Use plan from webhook if available
          // 2. If subscription was cancelled (is_active: false), use existing plan (preserved)
          // 3. If active subscription exists, use existing plan
          // 4. Default to monthly only if no existing subscription
          let finalPlan = planFromWebhook;
          if (!finalPlan) {
            if (existingSub?.plan) {
              // Use existing plan if subscription exists (preserves cancelled plan)
              finalPlan = existingSub.plan;
            } else {
              // Only default to monthly if no existing subscription
              finalPlan = 'monthly';
            }
          } else if (existingSub && !existingSub.is_active && existingSub.plan) {
            // If subscription was cancelled, preserve the cancelled plan instead of using webhook plan
            // This prevents cancelled yearly from becoming active monthly
            finalPlan = existingSub.plan;
          }

          // Only reactivate if:
          // 1. Existing subscription is active, OR
          // 2. No existing subscription exists, OR
          // 3. Subscription was cancelled but Razorpay subscription ID matches (renewal)
          const shouldReactivate = 
            !existingSub || // New subscription
            existingSub.is_active || // Already active
            (razorpaySubscriptionId && existingSub.razorpay_subscription_id === razorpaySubscriptionId); // Same subscription renewed
          
          if (shouldReactivate) {
            console.log(`Reactivating subscription for user: ${userId}`);
            
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

            // Upsert subscription with Razorpay subscription ID - REACTIVATE
            await admin
              .from('subscriptions')
              .upsert(
                {
                  user_id: userId,
                  is_active: true,
                  plan: finalPlan,
                  valid_until: validUntil.toISOString(),
                  razorpay_subscription_id: razorpaySubscriptionId,
                },
                { onConflict: 'user_id' }
              );
            
            console.log(`Subscription reactivated for user: ${userId}, plan: ${finalPlan}`);
          } else {
            console.log(`Skipping reactivation for cancelled subscription (user: ${userId}). Plan preserved: ${existingSub?.plan}`);
          }
        }
      }
    }

    // ✅ SUBSCRIPTION LOGIC - Cancellation/Payment Failure
    if (event === 'payment.failed' || event === 'subscription.cancelled' || event === 'invoice.payment_failed') {
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
          event === 'subscription.cancelled' ||
          event === 'invoice.payment_failed';

        if (isSubscriptionPayment) {
          console.log(`Cancelling subscription due to payment failure/cancellation for user: ${userId}`);
          
          // Get existing subscription to preserve plan - THIS IS THE MOST RELIABLE SOURCE
          const { data: existingSub } = await admin
            .from('subscriptions')
            .select('plan')
            .eq('user_id', userId)
            .maybeSingle();
          
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
          const updateData: any = { is_active: false };
          
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

