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

    // Get user's subscription with Razorpay subscription ID and valid_until
    let razorpaySubscriptionId: string | null = null;
    let validUntil: string | null = null;
    
    // Try to get subscription with razorpay_subscription_id column
    const { data: sub, error: subError } = await admin
      .from('subscriptions')
      .select('razorpay_subscription_id, valid_until')
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
        validUntil = (subAll as any).valid_until || null;
      }
    } else if (!subError && sub) {
      // Successfully got subscription with razorpay_subscription_id column
      razorpaySubscriptionId = sub.razorpay_subscription_id || null;
      validUntil = sub.valid_until || null;
    } else if (subError) {
      // Some other error occurred
      console.error('Error fetching subscription:', subError);
      // Continue anyway - we'll still try to cancel in database
    }

    console.log('Razorpay subscription ID:', razorpaySubscriptionId);

    // Cancel subscription in Razorpay if subscription ID exists
    // Use cancel_at_cycle_end: 1 so user retains access until billing period ends
    let razorpayCancelSuccess = false;
    let razorpayCancelError: string | null = null;
    
    if (razorpaySubscriptionId) {
      try {
        console.log(`Attempting to cancel Razorpay subscription: ${razorpaySubscriptionId}`);
        
        // Cancel the subscription in Razorpay at end of current billing cycle
        // cancel_at_cycle_end: 1 = cancel at end of period (user keeps access until then)
        const cancelResponse = await razorpayRequest(`/subscriptions/${razorpaySubscriptionId}/cancel`, {
          method: 'POST',
          body: {
            cancel_at_cycle_end: 1, // Cancel at end of current billing period (user keeps remaining days)
          },
        });
        
        console.log('Razorpay cancellation (end of period) successful:', cancelResponse);
        razorpayCancelSuccess = true;
      } catch (razorpayError: any) {
        // Log the full error for debugging
        const errorMessage = razorpayError?.message || JSON.stringify(razorpayError);
        console.error('Razorpay cancellation error:', errorMessage);
        razorpayCancelError = errorMessage;
        // Still update database even if Razorpay cancel fails
      }
    } else {
      console.log('No Razorpay subscription ID found, skipping Razorpay cancellation');
    }

    // Get existing subscription to preserve plan
    const { data: existingSub } = await admin
      .from('subscriptions')
      .select('plan')
      .eq('user_id', userId)
      .maybeSingle();
    
    // KEEP is_active = true — user retains access until valid_until expires
    // Only disable autopay so the subscription won't auto-renew
    // The check-expiry cron job will set is_active = false after valid_until passes
    const updateData: any = { autopay_enabled: false };
    if (existingSub?.plan) {
      updateData.plan = existingSub.plan; // Preserve the plan so user can renew with same plan
    }
    
    const { error } = await admin
      .from('subscriptions')
      .update(updateData)
      .eq('user_id', userId);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

    // Format the valid_until date for user-friendly message
    const validUntilFormatted = validUntil 
      ? new Date(validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : null;
    
    // Return detailed response about what happened
    return NextResponse.json({ 
      ok: true, 
      message: validUntilFormatted
        ? `Autopay cancelled. Your subscription remains active until ${validUntilFormatted}.`
        : 'Autopay cancelled. Your subscription remains active until the end of your billing period.',
      valid_until: validUntil,
      razorpay_cancelled: razorpayCancelSuccess,
      razorpay_error: razorpayCancelError,
      razorpay_subscription_id: razorpaySubscriptionId
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}

