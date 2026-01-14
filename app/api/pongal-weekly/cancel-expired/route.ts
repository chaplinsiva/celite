import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';
import { razorpayRequest } from '../../../../lib/razorpay';

/**
 * This endpoint should be called by a cron job to auto-cancel expired Pongal weekly subscriptions
 * It cancels subscriptions that have expired (3 weeks from start) and disables autopay
 */
export async function POST(req: Request) {
  try {
    // Check for cron secret to prevent unauthorized access
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();
    const now = new Date();

    // Find all expired pongal_weekly subscriptions
    const { data: expiredSubs, error: subError } = await admin
      .from('subscriptions')
      .select('id, user_id, razorpay_subscription_id, autopay_enabled')
      .eq('plan', 'pongal_weekly')
      .eq('is_active', true)
      .lt('valid_until', now.toISOString());

    if (subError) {
      return NextResponse.json({ ok: false, error: subError.message }, { status: 500 });
    }

    if (!expiredSubs || expiredSubs.length === 0) {
      return NextResponse.json({ 
        ok: true, 
        message: 'No expired Pongal subscriptions found',
        cancelled: 0 
      });
    }

    let cancelledCount = 0;
    const errors: string[] = [];

    for (const sub of expiredSubs) {
      try {
        // Cancel Razorpay subscription if it exists and autopay is enabled
        if (sub.razorpay_subscription_id && sub.autopay_enabled) {
          try {
            await razorpayRequest(`/subscriptions/${sub.razorpay_subscription_id}/cancel`, {
              method: 'POST',
              body: {
                cancel_at_cycle_end: 0, // Cancel immediately
              },
            });
          } catch (razorpayError: any) {
            console.error(`Failed to cancel Razorpay subscription ${sub.razorpay_subscription_id}:`, razorpayError);
            // Continue with deactivation even if Razorpay cancel fails
          }
        }

        // Deactivate subscription in database
        await admin
          .from('subscriptions')
          .update({
            is_active: false,
            autopay_enabled: false,
            updated_at: now.toISOString(),
          })
          .eq('id', sub.id);
        
        // Update tracking table
        const { data: tracking } = await admin
          .from('pongal_tracking')
          .select('*')
          .eq('subscription_id', sub.id)
          .maybeSingle();
        
        if (tracking) {
          await admin
            .from('pongal_tracking')
            .update({
              subscription_status: 'expired',
              autopay_enabled: false,
              autopay_status: 'expired',
              autopay_cancelled_at: now.toISOString(),
              autopay_cancellation_reason: 'Subscription expired after 3 weeks',
              updated_at: now.toISOString(),
            })
            .eq('id', tracking.id);
        }

        cancelledCount++;
      } catch (error: any) {
        errors.push(`Failed to cancel subscription ${sub.id}: ${error.message}`);
      }
    }

    return NextResponse.json({ 
      ok: true, 
      message: `Cancelled ${cancelledCount} expired Pongal subscriptions`,
      cancelled: cancelledCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}

