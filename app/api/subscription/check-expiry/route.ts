import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';
import { sendSubscriptionExpiringEmail } from '../../../../lib/emailService';

// This endpoint should be called by a cron job (e.g., daily) to:
// 1. Send reminder emails to users whose subscriptions expire in 3 days
// 2. Deactivate subscriptions whose valid_until has passed
export async function POST(req: Request) {
  try {
    // Optional: Add authentication/authorization check for cron job
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();
    const nowISO = new Date().toISOString();
    
    // ── PART 1: Deactivate expired subscriptions ──────────────────────────
    // Find subscriptions that are still marked active but valid_until has passed
    // This handles the case where a user cancelled autopay (is_active stays true,
    // autopay_enabled = false) and the billing period has ended.
    let deactivatedCount = 0;
    
    try {
      const { data: expiredSubs, error: expiredError } = await admin
        .from('subscriptions')
        .select('user_id, plan, valid_until, autopay_enabled')
        .eq('is_active', true)
        .lt('valid_until', nowISO);
      
      if (expiredError) {
        console.error('Error fetching expired subscriptions:', expiredError);
      } else if (expiredSubs && expiredSubs.length > 0) {
        for (const expired of expiredSubs) {
          try {
            // Deactivate the subscription
            await admin
              .from('subscriptions')
              .update({ 
                is_active: false,
                expiry_email_sent: null, // Reset for future subscriptions
              })
              .eq('user_id', expired.user_id)
              .eq('is_active', true); // Extra safety check

            console.log(`Deactivated expired subscription for user ${expired.user_id} (valid_until: ${expired.valid_until}, autopay: ${expired.autopay_enabled})`);
            deactivatedCount++;

            // Send cancellation email if autopay was off (user cancelled and period ended)
            if (expired.autopay_enabled === false) {
              try {
                const { data: userData } = await admin.auth.admin.getUserById(expired.user_id);
                if (userData?.user?.email) {
                  const userEmail = userData.user.email;
                  const userName = userEmail.split('@')[0] || 'User';
                  const { sendSubscriptionCancelledEmail } = await import('../../../../lib/emailService');
                  await sendSubscriptionCancelledEmail(
                    userEmail,
                    userName,
                    (expired.plan || 'monthly') as 'monthly' | 'yearly' | 'pongal_weekly',
                    'Subscription period ended'
                  );
                  console.log(`Expiry cancellation email sent to ${userEmail}`);
                }
              } catch (emailErr) {
                console.error(`Failed to send expiry cancellation email for user ${expired.user_id}:`, emailErr);
              }
            }
          } catch (deactivateErr) {
            console.error(`Failed to deactivate subscription for user ${expired.user_id}:`, deactivateErr);
          }
        }
      }
    } catch (partOneErr) {
      console.error('Error in Part 1 (deactivate expired):', partOneErr);
    }

    // ── PART 2: Send reminder emails for subscriptions expiring in 3 days ─
    // Calculate date 3 days from now
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const threeDaysFromNowISO = threeDaysFromNow.toISOString();
    
    // Calculate date 2 days from now (to avoid sending duplicate emails)
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    const twoDaysFromNowISO = twoDaysFromNow.toISOString();

    // Find subscriptions expiring in 3 days (between 2 and 3 days from now)
    const { data: expiringSubscriptions, error } = await admin
      .from('subscriptions')
      .select('user_id, plan, valid_until, expiry_email_sent')
      .eq('is_active', true)
      .gte('valid_until', twoDaysFromNowISO)
      .lte('valid_until', threeDaysFromNowISO)
      .is('expiry_email_sent', null); // Only send if not already sent

    if (error) {
      console.error('Error fetching expiring subscriptions:', error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    let successCount = 0;
    let failCount = 0;

    if (expiringSubscriptions && expiringSubscriptions.length > 0) {
      // Send emails to each user
      for (const subscription of expiringSubscriptions) {
        try {
          const { data: userData } = await admin.auth.admin.getUserById(subscription.user_id);
          if (!userData || !userData.user) {
            console.error(`User data not found for user ${subscription.user_id}`);
            failCount++;
            continue;
          }
          
          const userEmail = userData.user.email;
          const userName = userData.user.email?.split('@')[0] || 'User';

          if (userEmail && subscription.valid_until) {
            await sendSubscriptionExpiringEmail(
              userEmail,
              userName,
              subscription.plan as 'monthly' | 'yearly',
              subscription.valid_until
            );

            // Mark email as sent
            await admin
              .from('subscriptions')
              .update({ expiry_email_sent: new Date().toISOString() })
              .eq('user_id', subscription.user_id);

            successCount++;
          }
        } catch (emailError: any) {
          console.error(`Failed to send expiry email to user ${subscription.user_id}:`, emailError);
          failCount++;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Deactivated ${deactivatedCount} expired subscriptions. Sent ${successCount} expiry reminder emails.`,
      deactivatedCount,
      reminderEmailsSent: successCount,
      reminderEmailsFailed: failCount,
    });
  } catch (e: any) {
    console.error('Error checking subscription expiry:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}

