import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';
import { razorpayRequest } from '../../../../lib/razorpay';

export async function POST(req: Request) {
  try {
    const admin = getSupabaseAdminClient();
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
    if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { data: { user }, error: userError } = await admin.auth.getUser(token);
    if (userError || !user) return NextResponse.json({ ok: false, error: 'Invalid session' }, { status: 401 });

    const userId = user.id;

    // Get existing subscription to get plan and Razorpay subscription ID
    const { data: existingSub } = await admin
      .from('subscriptions')
      .select('plan, razorpay_subscription_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existingSub || !existingSub.plan) {
      return NextResponse.json({ ok: false, error: 'No existing subscription found to renew' }, { status: 400 });
    }

    const plan = existingSub.plan as 'monthly' | 'yearly' | 'weekly'; // Allow 'weekly' for legacy subscriptions
    const razorpaySubscriptionId = existingSub.razorpay_subscription_id as string | null;

    // Cancel old Razorpay subscription if it exists
    if (razorpaySubscriptionId) {
      try {
        console.log(`Cancelling old Razorpay subscription: ${razorpaySubscriptionId}`);
        await razorpayRequest(`/subscriptions/${razorpaySubscriptionId}/cancel`, {
          method: 'POST',
          body: {
            cancel_at_cycle_end: 0, // Cancel immediately
          },
        });
        console.log('Old Razorpay subscription cancelled successfully');
      } catch (razorpayError: any) {
        console.error('Error cancelling old Razorpay subscription:', razorpayError?.message);
        // Continue with renewal even if Razorpay cancel fails
      }
    }

    // Calculate new valid_until based on plan
    // Legacy weekly subscriptions are converted to monthly
    const now = Date.now();
    const expiresAt = plan === 'yearly'
      ? new Date(now + 365 * 24 * 60 * 60 * 1000)
      : plan === 'weekly'
      ? new Date(now + 30 * 24 * 60 * 60 * 1000) // Convert weekly to monthly
      : new Date(now + 30 * 24 * 60 * 60 * 1000);
    
    // Convert weekly to monthly for legacy subscriptions
    const finalPlan = plan === 'weekly' ? 'monthly' : plan;

    // Create new subscription (cancel old and start new)
    const updateData: any = {
      user_id: userId,
      is_active: true,
      plan: finalPlan,
      valid_until: expiresAt.toISOString(),
      razorpay_subscription_id: null, // Clear old Razorpay subscription ID
    };

    const { error: upErr } = await admin
      .from('subscriptions')
      .update(updateData)
      .eq('user_id', userId);

    if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      plan: finalPlan,
      valid_until: expiresAt.toISOString(),
      message: 'Subscription renewed successfully',
    });
  } catch (e: any) {
    console.error('Renew subscription error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}

