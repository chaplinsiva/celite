import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';
import { razorpayRequest } from '../../../../lib/razorpay';

/**
 * Admin endpoint to identify and fix users whose autopay payments were deducted
 * but their subscription validity was not updated.
 * 
 * This script:
 * 1. Finds all active subscriptions with autopay enabled
 * 2. Verifies each subscription's status with Razorpay
 * 3. Checks if payment was deducted but valid_until wasn't extended
 * 4. Updates valid_until for affected users
 */
export async function POST(req: Request) {
  try {
    const admin = getSupabaseAdminClient();
    
    // Check if user is admin
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
    if (!token) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: userError } = await admin.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ ok: false, error: 'Invalid session' }, { status: 401 });
    }

    // Check if user is admin
    const { data: adminCheck } = await admin
      .from('admins')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!adminCheck) {
      return NextResponse.json({ ok: false, error: 'Admin access required' }, { status: 403 });
    }

    // Get all active subscriptions with autopay enabled and razorpay_subscription_id
    const { data: subscriptions, error: subError } = await admin
      .from('subscriptions')
      .select('user_id, plan, valid_until, razorpay_subscription_id, is_active, autopay_enabled')
      .eq('is_active', true)
      .eq('autopay_enabled', true)
      .not('razorpay_subscription_id', 'is', null);

    if (subError) {
      return NextResponse.json({ ok: false, error: subError.message }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ 
        ok: true, 
        message: 'No active autopay subscriptions found',
        fixed: [],
        errors: []
      });
    }

    const fixed: Array<{ user_id: string; plan: string; old_valid_until: string; new_valid_until: string }> = [];
    const errors: Array<{ user_id: string; error: string }> = [];
    const skipped: Array<{ user_id: string; reason: string }> = [];

    console.log(`Checking ${subscriptions.length} subscriptions...`);

    for (const sub of subscriptions) {
      try {
        const razorpaySubscriptionId = sub.razorpay_subscription_id as string;
        const userId = sub.user_id as string;
        const plan = sub.plan as string;
        const currentValidUntil = sub.valid_until ? new Date(sub.valid_until) : null;

        // Fetch subscription details from Razorpay
        let razorpaySub: any;
        try {
          razorpaySub = await razorpayRequest(`/subscriptions/${razorpaySubscriptionId}`, {
            method: 'GET',
          });
        } catch (razorpayError: any) {
          errors.push({
            user_id: userId,
            error: `Razorpay API error: ${razorpayError?.message || 'Unknown error'}`
          });
          continue;
        }

        // Check subscription status
        const razorpayStatus = razorpaySub.status; // 'active', 'cancelled', 'expired', etc.
        const razorpayCurrentStart = razorpaySub.current_start ? new Date(razorpaySub.current_start * 1000) : null;
        const razorpayCurrentEnd = razorpaySub.current_end ? new Date(razorpaySub.current_end * 1000) : null;
        const razorpayEndedAt = razorpaySub.ended_at ? new Date(razorpaySub.ended_at * 1000) : null;

        // If subscription is cancelled or expired in Razorpay, skip
        if (razorpayStatus === 'cancelled' || razorpayStatus === 'expired' || razorpayEndedAt) {
          skipped.push({
            user_id: userId,
            reason: `Subscription ${razorpayStatus} in Razorpay`
          });
          continue;
        }

        // Check if current cycle end is in the future and beyond our valid_until
        if (razorpayCurrentEnd && currentValidUntil) {
          // If Razorpay's current_end is after our valid_until, we need to update
          if (razorpayCurrentEnd > currentValidUntil) {
            // Calculate new valid_until based on plan
            const now = new Date();
            let newValidUntil: Date;
            
            // Use the later of: current valid_until or now as base
            const baseDate = currentValidUntil > now ? currentValidUntil : now;
            newValidUntil = new Date(baseDate);
            
            if (plan === 'yearly') {
              newValidUntil.setFullYear(newValidUntil.getFullYear() + 1);
            } else {
              // Monthly (weekly subscriptions treated as monthly for legacy support)
              newValidUntil.setMonth(newValidUntil.getMonth() + 1);
            }

            // Update subscription
            const { error: updateError } = await admin
              .from('subscriptions')
              .update({
                valid_until: newValidUntil.toISOString(),
                autopay_enabled: true,
              })
              .eq('user_id', userId);

            if (updateError) {
              errors.push({
                user_id: userId,
                error: `Database update error: ${updateError.message}`
              });
            } else {
              fixed.push({
                user_id: userId,
                plan,
                old_valid_until: currentValidUntil.toISOString(),
                new_valid_until: newValidUntil.toISOString(),
              });
              console.log(`Fixed subscription for user ${userId}: ${currentValidUntil.toISOString()} -> ${newValidUntil.toISOString()}`);
            }
          } else {
            skipped.push({
              user_id: userId,
              reason: 'valid_until is already up to date'
            });
          }
        } else if (razorpayCurrentEnd && !currentValidUntil) {
          // No valid_until set, but Razorpay has a current_end - set it
          const now = new Date();
          let newValidUntil: Date;
          
          // Use Razorpay's current_end or now, whichever is later
          const baseDate = razorpayCurrentEnd > now ? razorpayCurrentEnd : now;
          newValidUntil = new Date(baseDate);
          
          if (plan === 'yearly') {
            newValidUntil.setFullYear(newValidUntil.getFullYear() + 1);
          } else if (plan === 'weekly') {
            newValidUntil.setDate(newValidUntil.getDate() + 7);
          } else {
            newValidUntil.setMonth(newValidUntil.getMonth() + 1);
          }

          const { error: updateError } = await admin
            .from('subscriptions')
            .update({
              valid_until: newValidUntil.toISOString(),
              autopay_enabled: true,
            })
            .eq('user_id', userId);

          if (updateError) {
            errors.push({
              user_id: userId,
              error: `Database update error: ${updateError.message}`
            });
          } else {
            fixed.push({
              user_id: userId,
              plan,
              old_valid_until: 'null',
              new_valid_until: newValidUntil.toISOString(),
            });
            console.log(`Set valid_until for user ${userId}: ${newValidUntil.toISOString()}`);
          }
        } else {
          skipped.push({
            user_id: userId,
            reason: 'Cannot determine renewal status from Razorpay data'
          });
        }
      } catch (e: any) {
        errors.push({
          user_id: sub.user_id as string,
          error: e?.message || 'Unknown error processing subscription'
        });
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Processed ${subscriptions.length} subscriptions`,
      fixed: fixed.length,
      errors: errors.length,
      skipped: skipped.length,
      details: {
        fixed,
        errors,
        skipped,
      },
    });
  } catch (e: any) {
    console.error('Fix subscription renewals error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}

