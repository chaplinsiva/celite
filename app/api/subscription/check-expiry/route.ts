import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';
import { sendSubscriptionExpiringEmail } from '../../../../lib/emailService';

// This endpoint should be called by a cron job (e.g., daily) to check for expiring subscriptions
// and send reminder emails to users whose subscriptions expire in 3 days
export async function POST(req: Request) {
  try {
    // Optional: Add authentication/authorization check for cron job
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();
    
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

    if (!expiringSubscriptions || expiringSubscriptions.length === 0) {
      return NextResponse.json({ 
        ok: true, 
        message: 'No subscriptions expiring in 3 days',
        count: 0 
      });
    }

    let successCount = 0;
    let failCount = 0;

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

    return NextResponse.json({
      ok: true,
      message: `Processed ${expiringSubscriptions.length} expiring subscriptions`,
      successCount,
      failCount,
    });
  } catch (e: any) {
    console.error('Error checking subscription expiry:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}

