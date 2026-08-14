// agent-notes: { ctx: "Subscription activation endpoint", deps: ["lib/supabaseAdmin.ts", "lib/razorpay.ts", "lib/emailService.ts"], state: active, last: "sato@2026-08-13" }
import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';
import { razorpayRequest } from '../../../../lib/razorpay';
import { sendSubscriptionSuccessEmail } from '../../../../lib/emailService';

export async function POST(req: Request) {
  try {
    const admin = getSupabaseAdminClient();
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
    if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { data: userRes, error } = await admin.auth.getUser(token);
    if (error || !userRes.user) return NextResponse.json({ ok: false, error: 'Invalid session' }, { status: 401 });
    const userId = userRes.user.id;

    // optional body: { plan: 'monthly' | 'yearly' | 'pongal_weekly', razorpay_subscription_id?: string, autopay_enabled?: boolean }
    let plan: 'monthly' | 'yearly' | 'pongal_weekly' = 'monthly';
    let razorpaySubscriptionId: string | null = null;
    let autopayEnabled: boolean | null = null;
    try {
      const body = await req.json();
      if (body && (body.plan === 'monthly' || body.plan === 'yearly' || body.plan === 'pongal_weekly')) plan = body.plan;
      if (body?.razorpay_subscription_id) razorpaySubscriptionId = body.razorpay_subscription_id;
      if (typeof body?.autopay_enabled === 'boolean') autopayEnabled = body.autopay_enabled;
    } catch { }

    // Cancel any existing Razorpay subscription before creating a new one
    const { data: existingSub } = await admin
      .from('subscriptions')
      .select('razorpay_subscription_id, is_active, plan, valid_until')
      .eq('user_id', userId)
      .maybeSingle();

    // Idempotency check: if this exact razorpay_subscription_id is already active,
    // skip re-activation to prevent duplicate processing from double-clicks or retries
    if (
      razorpaySubscriptionId &&
      existingSub?.razorpay_subscription_id === razorpaySubscriptionId &&
      existingSub?.is_active === true
    ) {
      console.log(`Idempotency: Subscription ${razorpaySubscriptionId} already active for user ${userId}, skipping re-activation`);
      return NextResponse.json({
        ok: true,
        plan: existingSub.plan || plan,
        valid_until: existingSub.valid_until,
        message: 'Subscription already active',
      });
    }

    let usdPpp: number | null = null;

    // Verify the Razorpay subscription is actually paid/active before activating
    if (razorpaySubscriptionId) {
      try {
        const rzSub = await razorpayRequest(`/subscriptions/${razorpaySubscriptionId}`);
        const validStatuses = ['active', 'authenticated', 'completed'];
        if (!validStatuses.includes(rzSub.status)) {
          console.error(`Razorpay subscription ${razorpaySubscriptionId} has invalid status: ${rzSub.status}`);
          return NextResponse.json({ ok: false, error: `Subscription not active (status: ${rzSub.status})` }, { status: 400 });
        }
        if (rzSub?.notes?.usd_ppp) {
          usdPpp = Number(rzSub.notes.usd_ppp);
        }
      } catch (verifyError: any) {
        console.error('Failed to verify Razorpay subscription:', verifyError?.message);
        // Don't block activation if Razorpay API is temporarily unavailable
        // The webhook will also handle activation
      }
    }

    // If not resolved from Razorpay subscription, try fetching from checkout details
    if (!usdPpp) {
      try {
        const { data: latestCheckout } = await admin
          .from('checkout_details')
          .select('usd_ppp')
          .eq('user_id', userId)
          .eq('subscription_plan', plan)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (latestCheckout?.usd_ppp) {
          usdPpp = Number(latestCheckout.usd_ppp);
        }
      } catch (e) {
        console.error('Failed to resolve usd_ppp from checkout_details:', e);
      }
    }

    // Only cancel existing Razorpay subscription if it's a DIFFERENT one
    if (
      existingSub?.razorpay_subscription_id &&
      existingSub.razorpay_subscription_id !== razorpaySubscriptionId
    ) {
      try {
        console.log(`Cancelling existing Razorpay subscription: ${existingSub.razorpay_subscription_id}`);
        await razorpayRequest(`/subscriptions/${existingSub.razorpay_subscription_id}/cancel`, {
          method: 'POST',
          body: {
            cancel_at_cycle_end: 0, // Cancel immediately
          },
        });
        console.log('Existing Razorpay subscription cancelled successfully');
      } catch (razorpayError: any) {
        console.error('Error cancelling existing Razorpay subscription:', razorpayError?.message);
        // Continue with activation even if Razorpay cancel fails
      }
    }

    // compute valid_until for monthly/yearly/pongal_weekly
    const now = Date.now();
    let expiresAt: Date;
    if (plan === 'pongal_weekly') {
      // Pongal weekly: First payment covers 1 week
      expiresAt = new Date(now + 7 * 24 * 60 * 60 * 1000);
    } else if (plan === 'yearly') {
      expiresAt = new Date(now + 365 * 24 * 60 * 60 * 1000);
    } else {
      expiresAt = new Date(now + 30 * 24 * 60 * 60 * 1000);
    }

    const updateData: any = {
      user_id: userId,
      is_active: true,
      plan,
      valid_until: expiresAt.toISOString(),
      usd_ppp: usdPpp || null
    };

    // Store Razorpay subscription ID if provided
    if (razorpaySubscriptionId) {
      updateData.razorpay_subscription_id = razorpaySubscriptionId;
    } else {
      // Clear old Razorpay subscription ID if not provided
      updateData.razorpay_subscription_id = null;
    }
    if (typeof autopayEnabled === 'boolean') {
      updateData.autopay_enabled = autopayEnabled;
    } else {
      // For pongal_weekly, enable autopay (recurring for 3 weeks)
      updateData.autopay_enabled = true;
    }

    const { data: subscriptionData, error: upErr } = await admin
      .from('subscriptions')
      .upsert(updateData, { onConflict: 'user_id' })
      .select()
      .single();
    if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

    // Create or update pongal_weekly_subscriptions record if plan is pongal_weekly
    if (plan === 'pongal_weekly' && subscriptionData) {
      // Get settings for Pongal subscription
      const { data: settings } = await admin.from('settings').select('key,value');
      const settingsMap: Record<string, string> = {};
      (settings || []).forEach((row: any) => { settingsMap[row.key] = row.value; });

      const durationWeeks = Number(settingsMap.PONGAL_WEEKLY_DURATION_WEEKS || '3');
      const downloadsPerWeek = Number(settingsMap.PONGAL_WEEKLY_DOWNLOADS_PER_WEEK || '3');

      const weekStartDate = new Date();
      const expiresAtDate = new Date(now + durationWeeks * 7 * 24 * 60 * 60 * 1000);

      // Use upsert to prevent duplicate records (update existing if user_id + subscription_id exists)
      const { data: pongalSub } = await admin.from('pongal_weekly_subscriptions').upsert({
        user_id: userId,
        subscription_id: subscriptionData.id,
        downloads_used: 0,
        week_number: 1,
        week_start_date: weekStartDate.toISOString(),
        current_week_start: weekStartDate.toISOString(),
        expires_at: expiresAtDate.toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,subscription_id' }).select().single();

      // Use upsert for comprehensive tracking record to prevent duplicates
      if (pongalSub) {
        await admin.from('pongal_tracking').upsert({
          user_id: userId,
          subscription_id: subscriptionData.id,
          pongal_subscription_id: pongalSub.id,
          download_count: 0,
          download_limit: downloadsPerWeek * durationWeeks,
          downloads_this_week: 0,
          subscription_status: 'active',
          subscription_plan: 'pongal_weekly',
          subscription_start_date: weekStartDate.toISOString(),
          subscription_expires_at: expiresAtDate.toISOString(),
          subscription_weeks_remaining: durationWeeks,
          current_week_number: 1,
          autopay_enabled: false,
          autopay_status: 'disabled',
          weekly_limit: downloadsPerWeek,
          limit_reached_count: 0,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,subscription_id' });
      }
    }

    // Send subscription success email
    try {
      const { data: userData } = await admin.auth.admin.getUserById(userId);
      if (!userData || !userData.user) {
        console.error(`User data not found for user ${userId}`);
      } else {
        const userEmail = userData.user.email;
        const userName = userData.user.email?.split('@')[0] || 'User';

        // Get subscription amount from settings
        const { data: settings } = await admin.from('settings').select('key,value');
        const settingsMap: Record<string, string> = {};
        (settings || []).forEach((row: any) => { settingsMap[row.key] = row.value; });

        let amountPaise: number;
        if (plan === 'pongal_weekly') {
          amountPaise = Number(settingsMap.PONGAL_WEEKLY_PRICE || settingsMap.RAZORPAY_PONGAL_WEEKLY_AMOUNT || '49900');
        } else if (plan === 'monthly') {
          amountPaise = Number(settingsMap.RAZORPAY_MONTHLY_AMOUNT || '79900');
        } else {
          amountPaise = Number(settingsMap.RAZORPAY_YEARLY_AMOUNT || '549900');
        }
        const { paiseToINR } = await import('../../../../lib/priceUtils');
        const amount = paiseToINR(amountPaise);

        if (userEmail) {
          await sendSubscriptionSuccessEmail(userEmail, userName, plan, Math.round(amount));
        }
      }
    } catch (emailError) {
      console.error('Failed to send subscription success email:', emailError);
      // Don't fail the activation if email fails
    }

    // Record immutable attribution snapshot for this subscription
    try {
      const { data: latestCheckout } = await admin
        .from('checkout_details')
        .select('id, total_amount')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const checkoutDetailId = latestCheckout?.id || null;

      // Check if snapshot already exists
      let hasSnapshot = false;
      if (checkoutDetailId) {
        const { data: existingSnap } = await admin
          .from('subscription_attributions')
          .select('id')
          .eq('checkout_detail_id', checkoutDetailId)
          .maybeSingle();
        hasSnapshot = Boolean(existingSnap);
      }

      if (!hasSnapshot) {
        const { data: visitorAttr } = await admin
          .from('visitor_attributions')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        await admin.from('subscription_attributions').insert({
          checkout_detail_id: checkoutDetailId,
          user_id: userId,
          razorpay_subscription_id: razorpaySubscriptionId,
          subscription_plan: plan,
          amount: latestCheckout?.total_amount ? Number(latestCheckout.total_amount) : (usdPpp || (plan === 'yearly' ? 5499 : 799)),
          currency: usdPpp ? 'USD' : 'INR',
          first_source: visitorAttr?.first_source || 'Direct',
          first_medium: visitorAttr?.first_medium || null,
          first_campaign: visitorAttr?.first_campaign || null,
          first_content: visitorAttr?.first_content || null,
          first_term: visitorAttr?.first_term || null,
          first_landing_page: visitorAttr?.first_landing_page || '/',
          first_referrer: visitorAttr?.first_referrer || null,
          first_product_viewed: visitorAttr?.first_product_viewed || null,
          first_visit_at: visitorAttr?.first_visit_at || null,
          last_source: visitorAttr?.last_source || visitorAttr?.first_source || 'Direct',
          last_medium: visitorAttr?.last_medium || visitorAttr?.first_medium || null,
          last_campaign: visitorAttr?.last_campaign || visitorAttr?.first_campaign || null,
          last_content: visitorAttr?.last_content || visitorAttr?.first_content || null,
          last_term: visitorAttr?.last_term || visitorAttr?.first_term || null,
          last_landing_page: visitorAttr?.last_landing_page || visitorAttr?.first_landing_page || '/',
          last_referrer: visitorAttr?.last_referrer || visitorAttr?.first_referrer || null,
          last_product_viewed: visitorAttr?.last_product_viewed || visitorAttr?.first_product_viewed || null,
          last_visit_at: visitorAttr?.last_visit_at || null,
          created_at: new Date().toISOString(),
        });
      }
    } catch (attrSnapErr) {
      console.warn('Failed to record subscription attribution snapshot in activate endpoint:', attrSnapErr);
    }

    return NextResponse.json({ ok: true, plan, valid_until: expiresAt.toISOString() });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}


