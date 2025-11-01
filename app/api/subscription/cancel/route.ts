import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';
import { razorpayRequest } from '../../../../lib/razorpay';

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
    if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const admin = getSupabaseAdminClient();
    const { data: { user }, error: userError } = await admin.auth.getUser(token);
    if (userError || !user) return NextResponse.json({ ok: false, error: 'Invalid session' }, { status: 401 });

    const userId = user.id;

    // Get user's subscription with Razorpay subscription ID
    const { data: subscription, error: subError } = await admin
      .from('subscriptions')
      .select('razorpay_subscription_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (subError) return NextResponse.json({ ok: false, error: subError.message }, { status: 400 });

    // Cancel subscription in Razorpay if subscription ID exists
    if (subscription?.razorpay_subscription_id) {
      try {
        // Cancel the subscription in Razorpay
        // This will stop future recurring payments
        await razorpayRequest(`/subscriptions/${subscription.razorpay_subscription_id}/cancel`, {
          method: 'POST',
          body: {
            cancel_at_cycle_end: 0, // Cancel immediately (0 = now, 1 = at end of current cycle)
          },
        });
      } catch (razorpayError: any) {
        // If subscription already cancelled or doesn't exist, continue with DB update
        console.error('Razorpay cancellation error:', razorpayError);
        // Still update database even if Razorpay cancel fails
      }
    }

    // Update subscription to inactive in database
    const { error } = await admin
      .from('subscriptions')
      .update({ is_active: false })
      .eq('user_id', userId);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    
    return NextResponse.json({ 
      ok: true, 
      message: subscription?.razorpay_subscription_id 
        ? 'Subscription cancelled in Razorpay and database' 
        : 'Subscription cancelled in database (no Razorpay subscription ID found)' 
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}

