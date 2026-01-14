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
    } catch {}

    // Cancel any existing Razorpay subscription before creating a new one
    const { data: existingSub } = await admin
      .from('subscriptions')
      .select('razorpay_subscription_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingSub?.razorpay_subscription_id) {
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
      // 3 weeks from now
      expiresAt = new Date(now + 3 * 7 * 24 * 60 * 60 * 1000);
    } else if (plan === 'yearly') {
      expiresAt = new Date(now + 365 * 24 * 60 * 60 * 1000);
    } else {
      expiresAt = new Date(now + 30 * 24 * 60 * 60 * 1000);
    }

    const updateData: any = { 
      user_id: userId, 
      is_active: true, 
      plan, 
      valid_until: expiresAt.toISOString() 
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
      // For pongal_weekly, disable autopay (auto-cancels after 3 weeks)
      updateData.autopay_enabled = plan === 'pongal_weekly' ? false : true;
    }

    const { data: subscriptionData, error: upErr } = await admin
      .from('subscriptions')
      .upsert(updateData, { onConflict: 'user_id' })
      .select()
      .single();
    if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

    // Create pongal_weekly_subscriptions record if plan is pongal_weekly
    if (plan === 'pongal_weekly' && subscriptionData) {
      // Get settings for Pongal subscription
      const { data: settings } = await admin.from('settings').select('key,value');
      const settingsMap: Record<string, string> = {};
      (settings || []).forEach((row: any) => { settingsMap[row.key] = row.value; });
      
      const durationWeeks = Number(settingsMap.PONGAL_WEEKLY_DURATION_WEEKS || '3');
      const downloadsPerWeek = Number(settingsMap.PONGAL_WEEKLY_DOWNLOADS_PER_WEEK || '3');
      
      const weekStartDate = new Date();
      const expiresAtDate = new Date(now + durationWeeks * 7 * 24 * 60 * 60 * 1000);
      
      // Create pongal_weekly_subscriptions record
      const { data: pongalSub } = await admin.from('pongal_weekly_subscriptions').insert({
        user_id: userId,
        subscription_id: subscriptionData.id,
        downloads_used: 0,
        week_number: 1,
        week_start_date: weekStartDate.toISOString(),
        current_week_start: weekStartDate.toISOString(),
        expires_at: expiresAtDate.toISOString(),
      }).select().single();
      
      // Create comprehensive tracking record
      if (pongalSub) {
        await admin.from('pongal_tracking').insert({
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
        });
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
          amountPaise = 49900; // ₹499 in paise
        } else if (plan === 'monthly') {
          amountPaise = Number(settingsMap.RAZORPAY_MONTHLY_AMOUNT || '59900');
        } else {
          amountPaise = Number(settingsMap.RAZORPAY_YEARLY_AMOUNT || '549900');
        }
        const amount = amountPaise >= 1000 ? amountPaise / 100 : amountPaise;

        if (userEmail) {
          await sendSubscriptionSuccessEmail(userEmail, userName, plan, Math.round(amount));
        }
      }
    } catch (emailError) {
      console.error('Failed to send subscription success email:', emailError);
      // Don't fail the activation if email fails
    }

    return NextResponse.json({ ok: true, plan, valid_until: expiresAt.toISOString() });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}


