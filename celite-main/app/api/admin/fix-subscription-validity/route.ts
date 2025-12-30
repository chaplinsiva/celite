import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';

type PlanType = 'monthly' | 'yearly' | 'weekly'; // 'weekly' for legacy support only

const PLAN_DURATION_MS: Record<PlanType, number> = {
  weekly: 30 * 24 * 60 * 60 * 1000, // Treat weekly as monthly (legacy)
  monthly: 30 * 24 * 60 * 60 * 1000,
  yearly: 365 * 24 * 60 * 60 * 1000,
};

function getExpectedValidUntil(plan: PlanType, referenceDate: Date) {
  const duration = PLAN_DURATION_MS[plan];
  const expected = new Date(referenceDate);
  expected.setTime(referenceDate.getTime() + duration);
  return expected;
}

export async function POST(req: Request) {
  try {
    const admin = getSupabaseAdminClient();

    // Authenticate admin user
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
    if (!token) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: userError } = await admin.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ ok: false, error: 'Invalid session' }, { status: 401 });
    }

    const { data: adminCheck } = await admin
      .from('admins')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!adminCheck) {
      return NextResponse.json({ ok: false, error: 'Admin access required' }, { status: 403 });
    }

    // Fetch active subscriptions with plan and timestamps
    const { data: subscriptions, error: subError } = await admin
      .from('subscriptions')
      .select('user_id, plan, valid_until, created_at, updated_at, is_active')
      .eq('is_active', true);

    if (subError) {
      return NextResponse.json({ ok: false, error: subError.message }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        ok: true,
        message: 'No active subscriptions found',
        fixed: 0,
        skipped: 0,
      });
    }

    const now = Date.now();
    const toleranceMs = 24 * 60 * 60 * 1000; // 1 day tolerance
    const fixed: Array<{ user_id: string; old_valid_until: string; new_valid_until: string; reference_date: string; plan: string }> = [];
    const skipped: Array<{ user_id: string; reason: string }> = [];

    for (const sub of subscriptions) {
      try {
        const plan = (sub.plan || 'monthly') as PlanType;
        if (!PLAN_DURATION_MS[plan]) {
          skipped.push({ user_id: sub.user_id, reason: `Unknown plan "${sub.plan}"` });
          continue;
        }

        const referenceDate = new Date(sub.updated_at || sub.created_at || sub.valid_until || now);
        const expectedValidUntil = getExpectedValidUntil(plan, referenceDate);
        const currentValidUntil = sub.valid_until ? new Date(sub.valid_until) : null;

        if (!currentValidUntil) {
          skipped.push({ user_id: sub.user_id, reason: 'No valid_until set' });
          continue;
        }

        // Only adjust if current validity exceeds expected by more than tolerance
        if (currentValidUntil.getTime() > expectedValidUntil.getTime() + toleranceMs) {
          const { error: updateError } = await admin
            .from('subscriptions')
            .update({
              valid_until: expectedValidUntil.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', sub.user_id);

          if (updateError) {
            skipped.push({ user_id: sub.user_id, reason: updateError.message });
          } else {
            fixed.push({
              user_id: sub.user_id,
              plan,
              old_valid_until: currentValidUntil.toISOString(),
              new_valid_until: expectedValidUntil.toISOString(),
              reference_date: referenceDate.toISOString(),
            });
            console.log(`Fixed validity for user ${sub.user_id}: ${currentValidUntil.toISOString()} -> ${expectedValidUntil.toISOString()}`);
          }
        } else {
          skipped.push({ user_id: sub.user_id, reason: 'Validity within expected range' });
        }
      } catch (e: any) {
        skipped.push({ user_id: sub.user_id, reason: e?.message || 'Unknown error' });
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Processed ${subscriptions.length} subscriptions`,
      fixed: fixed.length,
      skipped: skipped.length,
      details: {
        fixed,
        skipped,
      },
    });
  } catch (e: any) {
    console.error('Fix subscription validity error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}

