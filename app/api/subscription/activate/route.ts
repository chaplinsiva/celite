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

    // optional body: { plan: 'monthly' | 'yearly', razorpay_subscription_id?: string, autopay_enabled?: boolean }
    let plan: 'monthly' | 'yearly' = 'monthly';
    let razorpaySubscriptionId: string | null = null;
    let autopayEnabled: boolean | null = null;
    try {
      const body = await req.json();
      if (body && (body.plan === 'monthly' || body.plan === 'yearly')) plan = body.plan;
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

    // compute valid_until for monthly/yearly
    const now = Date.now();
    const expiresAt = plan === 'yearly'
      ? new Date(now + 365 * 24 * 60 * 60 * 1000)
      : new Date(now + 30 * 24 * 60 * 60 * 1000);

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
      updateData.autopay_enabled = true;
    }

    const { error: upErr } = await admin
      .from('subscriptions')
      .upsert(updateData, { onConflict: 'user_id' });
    if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

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
        
        const amountPaise = plan === 'monthly' 
          ? Number(settingsMap.RAZORPAY_MONTHLY_AMOUNT || '59900')
          : Number(settingsMap.RAZORPAY_YEARLY_AMOUNT || '549900');
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


