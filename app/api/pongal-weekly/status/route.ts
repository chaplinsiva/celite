import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';

export async function GET(req: Request) {
  try {
    const admin = getSupabaseAdminClient();
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
    if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { data: userRes, error } = await admin.auth.getUser(token);
    if (error || !userRes.user) return NextResponse.json({ ok: false, error: 'Invalid session' }, { status: 401 });
    const userId = userRes.user.id;

    // Get settings
    const { data: settings } = await admin.from('settings').select('key,value');
    const settingsMap: Record<string, string> = {};
    (settings || []).forEach((row: any) => { settingsMap[row.key] = row.value; });
    const weeklyLimit = Number(settingsMap.PONGAL_WEEKLY_DOWNLOADS_PER_WEEK || '3');

    // Get pongal subscription
    const { data: sub } = await admin
      .from('subscriptions')
      .select('id, plan, is_active, valid_until, autopay_enabled')
      .eq('user_id', userId)
      .eq('plan', 'pongal_weekly')
      .maybeSingle();

    if (!sub || !sub.is_active) {
      return NextResponse.json({
        ok: true,
        hasSubscription: false,
        downloadsUsed: 0,
        downloadsAvailable: 0,
        weekNumber: 0,
        expiresAt: null,
      });
    }

    // Check if expired
    const expiresAt = new Date(sub.valid_until).getTime();
    if (Date.now() > expiresAt) {
      return NextResponse.json({
        ok: true,
        hasSubscription: false,
        expired: true,
        downloadsUsed: 0,
        downloadsAvailable: 0,
        weekNumber: 0,
        expiresAt: sub.valid_until,
      });
    }

    // Get pongal weekly subscription details
    const { data: pongalSub } = await admin
      .from('pongal_weekly_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('subscription_id', sub.id)
      .maybeSingle();

    if (!pongalSub) {
      return NextResponse.json({
        ok: true,
        hasSubscription: true,
        downloadsUsed: 0,
        downloadsAvailable: weeklyLimit,
        weekNumber: 1,
        expiresAt: sub.valid_until,
        weeklyLimit,
        currentWeekPaid: true,
        autopayEnabled: sub.autopay_enabled,
      });
    }

    // Check if we need to reset for a new week
    const currentWeekStart = new Date(pongalSub.current_week_start).getTime();
    const weekInMs = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    let downloadsUsed = pongalSub.downloads_used;
    let weekNumber = pongalSub.week_number;
    let newWeekStart = new Date(pongalSub.current_week_start);
    let currentWeekPaid = pongalSub.current_week_paid ?? true;

    // If a new week has started, check payment status and reset downloads
    if (now - currentWeekStart >= weekInMs) {
      // Calculate which week we're in
      const weeksElapsed = Math.floor((now - new Date(pongalSub.week_start_date).getTime()) / weekInMs);
      weekNumber = Math.min(weeksElapsed + 1, 3);

      // Check if payment for this week has been made
      if (weekNumber === 2) {
        currentWeekPaid = pongalSub.week2_paid === true;
      } else if (weekNumber === 3) {
        currentWeekPaid = pongalSub.week3_paid === true;
      } else {
        currentWeekPaid = pongalSub.week1_paid === true;
      }

      // Reset downloads for new week
      downloadsUsed = 0;
      newWeekStart = new Date(Math.floor(now / weekInMs) * weekInMs); // Start of current week

      // Update the record
      await admin
        .from('pongal_weekly_subscriptions')
        .update({
          downloads_used: 0,
          week_number: weekNumber,
          current_week_start: newWeekStart.toISOString(),
          current_week_paid: currentWeekPaid,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pongalSub.id);
    }

    const downloadsAvailable = currentWeekPaid ? Math.max(0, weeklyLimit - downloadsUsed) : 0;
    const nextWeekStart = new Date(newWeekStart.getTime() + weekInMs);
    const daysUntilReset = Math.ceil((nextWeekStart.getTime() - now) / (24 * 60 * 60 * 1000));

    return NextResponse.json({
      ok: true,
      hasSubscription: true,
      downloadsUsed,
      downloadsAvailable,
      weekNumber,
      expiresAt: sub.valid_until,
      nextWeekReset: nextWeekStart.toISOString(),
      daysUntilReset: Math.max(0, daysUntilReset),
      weeklyLimit,
      // Payment status
      currentWeekPaid,
      autopayEnabled: sub.autopay_enabled,
      week1Paid: pongalSub.week1_paid ?? true,
      week2Paid: pongalSub.week2_paid ?? false,
      week3Paid: pongalSub.week3_paid ?? false,
      paymentStatus: pongalSub.payment_status,
      // If payment required, show message
      paymentRequired: weekNumber >= 2 && !currentWeekPaid,
      paymentMessage: weekNumber >= 2 && !currentWeekPaid
        ? (sub.autopay_enabled
          ? 'Your weekly payment is being processed. Please try again shortly.'
          : 'Your autopay is disabled. Please enable autopay to continue.')
        : null,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}

