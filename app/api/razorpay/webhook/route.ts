import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';

async function resolveSubscriptionIdentifiers(admin: any, payload: any) {
  const subscriptionEntity = payload.subscription?.entity;
  const invoiceEntity = payload.invoice?.entity;
  const paymentEntity = payload.payment?.entity;

  const userIdFromNotes =
    subscriptionEntity?.notes?.user_id ||
    invoiceEntity?.notes?.user_id ||
    paymentEntity?.notes?.user_id ||
    null;

  const razorpaySubscriptionId =
    subscriptionEntity?.id ||
    invoiceEntity?.subscription_id ||
    paymentEntity?.subscription_id ||
    null;

  let userId = userIdFromNotes;

  if (!userId && razorpaySubscriptionId) {
    const { data: match } = await admin
      .from('subscriptions')
      .select('user_id')
      .eq('razorpay_subscription_id', razorpaySubscriptionId)
      .maybeSingle();
    if (match?.user_id) userId = match.user_id;
  }

  return { userId, razorpaySubscriptionId };
}

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
      // Use resolveSubscriptionIdentifiers to handle cases where user_id might not be in notes
      const { userId, razorpaySubscriptionId } = await resolveSubscriptionIdentifiers(admin, payload);

      if (!userId && !razorpaySubscriptionId) {
        console.log('Subscription payment event received but no user or subscription could be resolved. Skipping update.');
        return NextResponse.json({ status: 'ok', message: 'No matching subscription found for payment event' });
      }

      // Check if this is a subscription payment (not one-time)
      const invoiceEntity = payload.invoice?.entity;
      const subscriptionEntity = payload.subscription?.entity;
      const paymentEntity = payload.payment?.entity;

      // Determine if this payment is for a subscription (has subscription_id in invoice or payment)
      const isSubscriptionPayment =
        invoiceEntity?.subscription_id ||
        subscriptionEntity?.id ||
        paymentEntity?.invoice_id || // Payments linked to invoices are subscription payments
        razorpaySubscriptionId !== null; // If we have a subscription ID, it's a subscription payment

      if (isSubscriptionPayment) {
        // Get existing subscription - try by user_id first, then by razorpay_subscription_id
        let existingSub: any = null;
        if (userId) {
          const { data } = await admin
            .from('subscriptions')
            .select('plan, is_active, razorpay_subscription_id, valid_until')
            .eq('user_id', userId)
            .maybeSingle();
          existingSub = data;
        }

        // If not found by user_id, try by razorpay_subscription_id
        let resolvedUserId = userId;
        if (!existingSub && razorpaySubscriptionId) {
          const { data } = await admin
            .from('subscriptions')
            .select('plan, is_active, razorpay_subscription_id, valid_until, user_id')
            .eq('razorpay_subscription_id', razorpaySubscriptionId)
            .maybeSingle();
          existingSub = data;
          if (existingSub && existingSub.user_id) {
            resolvedUserId = existingSub.user_id;
          }
        }

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
          console.log(`Using existing subscription plan for user ${resolvedUserId || existingSub.user_id}: ${finalPlan}`);
        } else {
          // No existing subscription - try to parse from webhook
          const subscriptionForPlan = subscriptionEntity || invoiceEntity;
          const planFromWebhook = subscriptionForPlan?.plan_id
            ? subscriptionForPlan.plan_id.includes('yearly')
              ? 'yearly'
              : subscriptionForPlan.plan_id.includes('weekly')
                ? 'monthly' // Convert weekly to monthly (legacy support)
                : 'monthly'
            : null;

          if (planFromWebhook) {
            finalPlan = planFromWebhook;
            console.log(`Parsed plan from webhook for user ${resolvedUserId || 'unknown'}: ${finalPlan}`);
          } else {
            // Last resort: default to monthly only if no existing subscription
            finalPlan = 'monthly';
            console.log(`No plan found, defaulting to monthly for user ${resolvedUserId || 'unknown'} (new subscription)`);
          }
        }

        // For renewals (existing active subscription), always process
        // For new subscriptions, process if no existing subscription
        const isRenewal = existingSub && existingSub.is_active === true;
        const isNewSubscription = !existingSub;

        // DO NOT reactivate if subscription is cancelled (is_active: false)
        // This prevents cancelled subscriptions from being reactivated by delayed webhook events
        if (existingSub && existingSub.is_active === false) {
          console.log(`Skipping reactivation: Subscription is cancelled for user ${resolvedUserId || existingSub.user_id}. Plan preserved: ${existingSub.plan}`);
          return NextResponse.json({ status: 'ok', message: 'Subscription is cancelled, not reactivating' });
        }

        if ((isRenewal || isNewSubscription) && finalPlan) {
          const targetUserId = resolvedUserId || existingSub?.user_id;
          if (!targetUserId) {
            console.log('Cannot process subscription payment: no user_id available');
            return NextResponse.json({ status: 'ok', message: 'No user_id available for subscription update' });
          }

          console.log(`${isRenewal ? 'Renewing' : 'Activating'} subscription for user: ${targetUserId}, plan: ${finalPlan}`);

          // Update users table with subscription status
          await admin
            .from('users')
            .update({
              subscription_status: 'active',
              last_payment_status: 'success',
            })
            .eq('id', targetUserId);

          // Determine valid_until based on Razorpay data when available
          // Prefer Razorpay's cycle end timestamps to avoid double-extending
          const now = new Date();
          let validUntil: Date | null = null;
          const cycleEndSeconds =
            subscriptionEntity?.current_end ||
            subscriptionEntity?.end_at ||
            invoiceEntity?.period_end ||
            invoiceEntity?.due_date ||
            null;

          if (cycleEndSeconds) {
            validUntil = new Date(cycleEndSeconds * 1000);
            console.log(`Using Razorpay cycle end for subscription: ${validUntil.toISOString()}`);
          }

          // Fallback to calculated duration if Razorpay data is unavailable
          // IMPORTANT: For renewals, always start from NOW (current payment date), not the old subscription end date
          // This ensures the billing period starts from when the payment was actually processed
          if (!validUntil) {
            // Always use current date as base for renewals to get correct next billing date
            const effectiveBase = now;
            validUntil = new Date(effectiveBase);

            if (finalPlan === 'yearly') {
              validUntil.setFullYear(validUntil.getFullYear() + 1);
            } else {
              // Monthly (weekly subscriptions converted to monthly)
              validUntil.setMonth(validUntil.getMonth() + 1);
            }

            console.log(`${isRenewal ? 'Renewal' : 'New subscription'} fallback: ${effectiveBase.toISOString()} → ${validUntil.toISOString()}`);
          }

          // Update subscription - but be very careful not to override cancelled subscriptions
          if (existingSub) {
            // Only update if subscription is currently active (extra safety check)
            // We already checked above, but double-check here to be safe
            if (existingSub.is_active === true) {
              const updateQuery = admin
                .from('subscriptions')
                .update({
                  is_active: true,
                  plan: finalPlan, // This should be the existing plan (preserved above)
                  valid_until: validUntil.toISOString(),
                  razorpay_subscription_id: razorpaySubscriptionId || existingSub.razorpay_subscription_id,
                  autopay_enabled: true,
                  updated_at: new Date().toISOString(), // Update timestamp when autopay renews
                });

              if (targetUserId) {
                updateQuery.eq('user_id', targetUserId);
              } else if (razorpaySubscriptionId) {
                updateQuery.eq('razorpay_subscription_id', razorpaySubscriptionId);
              }

              await updateQuery.eq('is_active', true); // Extra safety: only update if already active
              console.log(`Updated active subscription for user ${targetUserId} with plan: ${finalPlan}, valid_until: ${validUntil.toISOString()}`);
            } else {
              console.error(`CRITICAL: Attempted to update inactive subscription for user ${targetUserId}. This should not happen!`);
            }
          } else {
            // New subscription - create it (only if no existing subscription)
            await admin
              .from('subscriptions')
              .insert({
                user_id: targetUserId,
                is_active: true,
                plan: finalPlan,
                valid_until: validUntil.toISOString(),
                razorpay_subscription_id: razorpaySubscriptionId,
                autopay_enabled: true,
                updated_at: new Date().toISOString(),
              });
            console.log(`Created new subscription for user ${targetUserId} with plan: ${finalPlan}`);
          }

          console.log(`Subscription ${isRenewal ? 'renewed' : 'activated'} for user: ${targetUserId}, plan: ${finalPlan}, valid_until: ${validUntil.toISOString()}`);

          // Handle Pongal weekly subscription payment - update week payment status
          if (finalPlan === 'pongal_weekly' && targetUserId && isRenewal) {
            try {
              // Get pongal subscription details
              const { data: pongalSub } = await admin
                .from('pongal_weekly_subscriptions')
                .select('*')
                .eq('user_id', targetUserId)
                .maybeSingle();

              if (pongalSub) {
                // Calculate which week payment this is for
                const weekStartDate = new Date(pongalSub.week_start_date).getTime();
                const weekInMs = 7 * 24 * 60 * 60 * 1000;
                const now = Date.now();
                const weeksElapsed = Math.floor((now - weekStartDate) / weekInMs);
                const currentWeek = Math.min(weeksElapsed + 1, 3);

                console.log(`Pongal weekly payment received for user ${targetUserId}, week ${currentWeek}`);

                // Update payment status for current week
                const weekUpdateData: any = {
                  current_week_paid: true,
                  updated_at: new Date().toISOString(),
                };

                if (currentWeek === 2) {
                  weekUpdateData.week2_paid = true;
                  weekUpdateData.week2_paid_at = new Date().toISOString();
                  weekUpdateData.payment_status = 'week2_active';
                } else if (currentWeek === 3) {
                  weekUpdateData.week3_paid = true;
                  weekUpdateData.week3_paid_at = new Date().toISOString();
                  weekUpdateData.payment_status = 'week3_active';
                }

                await admin
                  .from('pongal_weekly_subscriptions')
                  .update(weekUpdateData)
                  .eq('id', pongalSub.id);

                // Also update pongal_tracking
                await admin
                  .from('pongal_tracking')
                  .update({
                    current_week_paid: true,
                    current_week_number: currentWeek,
                    subscription_status: 'active',
                    payment_status: `week${currentWeek}_active`,
                    last_payment_at: new Date().toISOString(),
                    ...(currentWeek === 2 ? { week2_paid: true } : {}),
                    ...(currentWeek === 3 ? { week3_paid: true } : {}),
                    updated_at: new Date().toISOString(),
                  })
                  .eq('user_id', targetUserId);

                console.log(`Pongal week ${currentWeek} payment recorded for user ${targetUserId}`);
              }
            } catch (pongalError) {
              console.error('Failed to update Pongal weekly payment status:', pongalError);
              // Don't fail the webhook if Pongal update fails
            }
          }

          // Send payment taken email for renewals only
          // Use payment/invoice ID to prevent duplicate emails from multiple webhook events
          if (isRenewal && targetUserId) {
            try {
              // Get payment ID or invoice ID for deduplication
              const paymentId = paymentEntity?.id || invoiceEntity?.id || null;

              // Check if we've already sent an email for this payment
              // We'll use a simple approach: only send email for invoice.paid event (not subscription.activated or invoice.payment_succeeded)
              // This prevents duplicate emails when multiple events are sent for the same payment
              const shouldSendEmail = event === 'invoice.paid';

              if (shouldSendEmail) {
                const { data: userData } = await admin.auth.admin.getUserById(targetUserId);
                if (!userData || !userData.user) {
                  console.error(`User data not found for user ${targetUserId}`);
                } else {
                  const userEmail = userData.user.email;
                  const userName = userData.user.email?.split('@')[0] || 'User';

                  // Get subscription amount from settings
                  const { data: settings } = await admin.from('settings').select('key,value');
                  const settingsMap: Record<string, string> = {};
                  (settings || []).forEach((row: any) => { settingsMap[row.key] = row.value; });

                  const amountPaise = finalPlan === 'monthly'
                    ? Number(settingsMap.RAZORPAY_MONTHLY_AMOUNT || '59900')
                    : Number(settingsMap.RAZORPAY_YEARLY_AMOUNT || '549900');
                  const amount = amountPaise >= 1000 ? amountPaise / 100 : amountPaise;

                  if (userEmail) {
                    const { sendSubscriptionPaymentEmail } = await import('../../../../lib/emailService');
                    await sendSubscriptionPaymentEmail(userEmail, userName, finalPlan as 'monthly' | 'yearly', Math.round(amount), validUntil.toISOString());
                    console.log(`Payment email sent to ${userEmail} for renewal. Next billing: ${validUntil.toISOString()}`);
                  }
                }
              } else {
                console.log(`Skipping payment email for event ${event} to prevent duplicates. Only sending for invoice.paid events.`);
              }
            } catch (emailError) {
              console.error('Failed to send payment email:', emailError);
              // Don't fail the webhook if email fails
            }
          }
        } else {
          console.log(`Skipping ${event} for user ${resolvedUserId || 'unknown'}. Is renewal: ${isRenewal}, Is new: ${isNewSubscription}, Final plan: ${finalPlan}, Existing sub:`, existingSub);
        }
      }
    }

    // ✅ SUBSCRIPTION LOGIC - Autopay mandate cancelled (do NOT cancel subscription)
    if (event === 'subscription.cancelled') {
      const { userId, razorpaySubscriptionId } = await resolveSubscriptionIdentifiers(admin, payload);

      if (!userId && !razorpaySubscriptionId) {
        console.log('subscription.cancelled event received but no user or subscription could be resolved. Skipping update.');
        return NextResponse.json({ status: 'ok', message: 'No matching subscription found for cancellation event' });
      }

      console.log(
        `Autopay/mandate cancelled for ${userId ? `user ${userId}` : `subscription ${razorpaySubscriptionId}`
        }. Keeping subscription active until payment fails.`,
      );

      const subscriptionUpdate = admin
        .from('subscriptions')
        .update({ autopay_enabled: false });

      if (userId) {
        subscriptionUpdate.eq('user_id', userId);
      } else if (razorpaySubscriptionId) {
        subscriptionUpdate.eq('razorpay_subscription_id', razorpaySubscriptionId);
      }

      await subscriptionUpdate;

      if (userId) {
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
      const { userId: resolvedUserId, razorpaySubscriptionId } = await resolveSubscriptionIdentifiers(admin, payload);
      let userId = resolvedUserId;

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
        let existingSub: any = null;

        if (userId) {
          const { data } = await admin
            .from('subscriptions')
            .select('plan, autopay_enabled')
            .eq('user_id', userId)
            .maybeSingle();
          existingSub = data;
        } else if (razorpaySubscriptionId) {
          const { data } = await admin
            .from('subscriptions')
            .select('user_id, plan, autopay_enabled')
            .eq('razorpay_subscription_id', razorpaySubscriptionId)
            .maybeSingle();
          if (data?.user_id) {
            userId = data.user_id;
          }
          existingSub = data;
        }

        if (!userId) {
          console.log('Subscription payment failure received but user could not be resolved. Skipping cancellation.');
          return NextResponse.json({ status: 'ok', message: 'No matching subscription found for payment failure' });
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
              planToPreserve = 'monthly'; // Convert weekly to monthly (legacy support)
            } else if (planName.toLowerCase().includes('monthly')) {
              planToPreserve = 'monthly';
            } else if (subscriptionForPlan.plan_id.toLowerCase().includes('yearly')) {
              planToPreserve = 'yearly';
            } else if (subscriptionForPlan.plan_id.toLowerCase().includes('weekly')) {
              planToPreserve = 'monthly'; // Convert weekly to monthly (legacy support)
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

        const subscriptionUpdate = admin
          .from('subscriptions')
          .update(updateData);

        if (userId) {
          subscriptionUpdate.eq('user_id', userId);
        } else if (razorpaySubscriptionId) {
          subscriptionUpdate.eq('razorpay_subscription_id', razorpaySubscriptionId);
        }

        await subscriptionUpdate;

        console.log(`Subscription cancelled for user: ${userId}, plan preserved: ${planToPreserve || existingSub?.plan || 'none'}`);

        // Send cancellation email to user
        try {
          const { data: userData } = await admin.auth.admin.getUserById(userId);
          if (userData?.user?.email) {
            const userEmail = userData.user.email;
            const userName = userData.user.email?.split('@')[0] || 'User';
            const cancelledPlan = planToPreserve || existingSub?.plan || 'monthly';

            const { sendSubscriptionCancelledEmail } = await import('../../../../lib/emailService');
            await sendSubscriptionCancelledEmail(
              userEmail,
              userName,
              cancelledPlan as 'monthly' | 'yearly' | 'pongal_weekly',
              'Payment failed'
            );
            console.log(`Cancellation email sent to ${userEmail}`);
          }
        } catch (emailError) {
          console.error('Failed to send cancellation email:', emailError);
          // Don't fail the webhook if email fails
        }
      }
      // If it's a one-time payment failure, we'll handle it in the ONE-TIME PRODUCT LOGIC section below
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

