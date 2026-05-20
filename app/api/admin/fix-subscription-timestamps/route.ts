import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';

/**
 * Admin endpoint to update updated_at timestamps for subscriptions
 * that have valid_until dates in the future but outdated updated_at timestamps.
 * 
 * This is useful for fixing subscriptions where autopay payments were processed
 * but the updated_at timestamp wasn't updated.
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

    // Get all subscriptions that are active and have valid_until in the future
    const now = new Date();
    const { data: subscriptions, error: subError } = await admin
      .from('subscriptions')
      .select('user_id, plan, valid_until, updated_at, is_active')
      .eq('is_active', true)
      .not('valid_until', 'is', null);

    if (subError) {
      return NextResponse.json({ ok: false, error: subError.message }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ 
        ok: true, 
        message: 'No active subscriptions found',
        updated: 0,
        skipped: 0
      });
    }

    const updated: Array<{ user_id: string; plan: string; old_updated_at: string; new_updated_at: string }> = [];
    const skipped: Array<{ user_id: string; reason: string }> = [];

    for (const sub of subscriptions) {
      try {
        const userId = sub.user_id as string;
        const plan = sub.plan as string;
        const validUntil = sub.valid_until ? new Date(sub.valid_until) : null;
        const currentUpdatedAt = sub.updated_at ? new Date(sub.updated_at) : null;

        // Skip if valid_until is in the past
        if (!validUntil || validUntil <= now) {
          skipped.push({
            user_id: userId,
            reason: 'Subscription expired'
          });
          continue;
        }

        // Update updated_at to current time if it's older than valid_until
        // or if it's more than 1 day older than now (likely missed update)
        const shouldUpdate = !currentUpdatedAt || 
          currentUpdatedAt < validUntil || 
          (now.getTime() - currentUpdatedAt.getTime()) > (24 * 60 * 60 * 1000); // More than 1 day old

        if (shouldUpdate) {
          const newUpdatedAt = new Date().toISOString();
          
          const { error: updateError } = await admin
            .from('subscriptions')
            .update({
              updated_at: newUpdatedAt,
            })
            .eq('user_id', userId);

          if (updateError) {
            skipped.push({
              user_id: userId,
              reason: `Update error: ${updateError.message}`
            });
          } else {
            updated.push({
              user_id: userId,
              plan: plan || 'unknown',
              old_updated_at: currentUpdatedAt ? currentUpdatedAt.toISOString() : 'null',
              new_updated_at: newUpdatedAt,
            });
            console.log(`Updated timestamp for user ${userId}: ${currentUpdatedAt?.toISOString() || 'null'} -> ${newUpdatedAt}`);
          }
        } else {
          skipped.push({
            user_id: userId,
            reason: 'Timestamp is already up to date'
          });
        }
      } catch (e: any) {
        skipped.push({
          user_id: sub.user_id as string,
          reason: e?.message || 'Unknown error processing subscription'
        });
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Processed ${subscriptions.length} subscriptions`,
      updated: updated.length,
      skipped: skipped.length,
      details: {
        updated,
        skipped,
      },
    });
  } catch (e: any) {
    console.error('Fix subscription timestamps error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}

