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

    // Get user's subscription with Razorpay subscription ID (if column exists)
    let razorpaySubscriptionId: string | null = null;
    
    // Try to get subscription with razorpay_subscription_id column
    // If column doesn't exist, we'll get an error and fall back to selecting all columns
    const { data: sub, error: subError } = await admin
      .from('subscriptions')
      .select('razorpay_subscription_id')
      .eq('user_id', userId)
      .maybeSingle();
    
    // If error indicates column doesn't exist, try selecting all columns
    if (subError && (subError.message?.includes('column') || subError.message?.includes('does not exist'))) {
      console.log('razorpay_subscription_id column may not exist, trying select *');
      
      // Fallback: select all columns and extract razorpay_subscription_id if it exists
      const { data: subAll } = await admin
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (subAll) {
        razorpaySubscriptionId = (subAll as any).razorpay_subscription_id || null;
      }
    } else if (!subError && sub) {
      // Successfully got subscription with razorpay_subscription_id column
      razorpaySubscriptionId = sub.razorpay_subscription_id || null;
    } else if (subError) {
      // Some other error occurred
      console.error('Error fetching subscription:', subError);
      // Continue anyway - we'll still try to cancel in database
    }

    // Cancel subscription in Razorpay if subscription ID exists
    if (razorpaySubscriptionId) {
      try {
        // Cancel the subscription in Razorpay
        // This will stop future recurring payments
        await razorpayRequest(`/subscriptions/${razorpaySubscriptionId}/cancel`, {
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
      message: razorpaySubscriptionId 
        ? 'Subscription cancelled in Razorpay and database' 
        : 'Subscription cancelled in database (no Razorpay subscription ID found)' 
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}

