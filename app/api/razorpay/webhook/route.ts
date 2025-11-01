import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';
import { sendEmail, generateSubscriptionEmail } from '../../../../lib/email';

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
          console.log(`Reactivating subscription for user: ${userId}`);
          
          // Update users table with subscription status
          await admin
            .from('users')
            .update({
              subscription_status: 'active',
              last_payment_status: 'success',
            })
            .eq('id', userId);

          // Get subscription ID from various sources
          const razorpaySubscriptionId = 
            subscriptionEntity?.id || 
            invoiceEntity?.subscription_id || 
            payload.subscription?.entity?.id || 
            null;
          
          // Determine plan from subscription entity or invoice
          const subscriptionForPlan = subscriptionEntity || invoiceEntity;
          const plan = subscriptionForPlan?.plan_id
            ? subscriptionForPlan.plan_id.includes('yearly')
              ? 'yearly'
              : 'monthly'
            : null;

          // If we can't determine plan from webhook, try to get it from existing subscription
          let finalPlan = plan;
          if (!finalPlan) {
            const { data: existingSub } = await admin
              .from('subscriptions')
              .select('plan')
              .eq('user_id', userId)
              .maybeSingle();
            finalPlan = existingSub?.plan === 'yearly' || existingSub?.plan === 'monthly' 
              ? existingSub.plan 
              : 'monthly'; // Default to monthly
          }

          // Calculate valid_until based on plan
          const now = new Date();
          const validUntil = new Date(now);
          if (finalPlan === 'yearly') {
            validUntil.setFullYear(validUntil.getFullYear() + 1);
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
          
          // Send subscription confirmation email
          try {
            // Get user email from auth or notes
            let userEmail: string | null = null;
            let userName: string = 'User';
            
            if (invoiceEntity?.customer_email) {
              userEmail = invoiceEntity.customer_email;
            } else if (subscriptionEntity?.notes?.customer_email) {
              userEmail = subscriptionEntity.notes.customer_email;
            } else {
              // Get from Supabase auth
              const { data: userData } = await admin.auth.admin.getUserById(userId);
              if (userData?.user?.email) {
                userEmail = userData.user.email;
                const metadata = userData.user.user_metadata as any;
                if (metadata?.first_name) {
                  userName = metadata.first_name + (metadata?.last_name ? ` ${metadata.last_name}` : '');
                } else {
                  userName = userEmail.split('@')[0];
                }
              }
            }
            
            if (userEmail) {
              // Validate finalPlan is 'monthly' or 'yearly' before calling generateSubscriptionEmail
              if (finalPlan === 'monthly' || finalPlan === 'yearly') {
                const emailHtml = generateSubscriptionEmail(finalPlan, userEmail, userName, validUntil.toISOString());
                await sendEmail({
                  to: userEmail,
                  subject: `Subscription Activated - ${finalPlan === 'yearly' ? 'Yearly' : 'Monthly'} Pro Plan`,
                  html: emailHtml,
                });
                console.log(`Subscription confirmation email sent to: ${userEmail}`);
              } else {
                // Fallback to monthly if plan is invalid or null
                console.warn(`Invalid plan value: ${finalPlan}, defaulting to monthly for email`);
                const emailHtml = generateSubscriptionEmail('monthly', userEmail, userName, validUntil.toISOString());
                await sendEmail({
                  to: userEmail,
                  subject: `Subscription Activated - Monthly Pro Plan`,
                  html: emailHtml,
                });
              }
            }
          } catch (emailError: any) {
            // Don't fail webhook if email fails
            console.error('Failed to send subscription confirmation email:', emailError);
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
          console.log(`Cancelling subscription due to payment failure for user: ${userId}`);
          
          // Update users table
          await admin
            .from('users')
            .update({
              subscription_status: 'inactive',
              last_payment_status: 'failed',
            })
            .eq('id', userId);

          // Update subscriptions table - CANCEL SUBSCRIPTION
          await admin
            .from('subscriptions')
            .update({
              is_active: false,
            })
            .eq('user_id', userId);
          
          console.log(`Subscription cancelled for user: ${userId}`);
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

