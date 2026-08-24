// agent-notes: { ctx: "Admin API to export subscription attribution records as CSV", deps: ["lib/supabaseAdmin.ts", "lib/attribution.ts"], state: active, last: "sato@2026-08-16" }
import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../../../lib/supabaseAdmin';
import { formatAttributionCsvRow } from '../../../../../../lib/attribution';

export async function GET(req: Request) {
  try {
    const admin = getSupabaseAdminClient();
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
    if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { data: me, error: meErr } = await admin.auth.getUser(token);
    if (meErr || !me.user) return NextResponse.json({ ok: false, error: 'Invalid session' }, { status: 401 });
    const { data: isAdmin } = await admin.from('admins').select('user_id').eq('user_id', me.user.id).maybeSingle();
    if (!isAdmin) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

    const { data: records, error } = await admin
      .from('subscription_attributions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const headers = [
      'Subscription ID',
      'User ID',
      'Plan',
      'Amount',
      'Currency',
      'First Source',
      'First Medium',
      'First Campaign',
      'First Content',
      'First Landing Page',
      'First Product',
      'Last Source',
      'Last Medium',
      'Last Campaign',
      'Last Content',
      'Last Landing Page',
      'Last Product',
      'Touch Count',
      'Confidence',
      'Created At',
    ].join(',');

    const rows = (records || []).map((r) => formatAttributionCsvRow(r));
    const csvContent = [headers, ...rows].join('\n');

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="celite-attribution-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (e: unknown) {
    console.error('Attribution export error:', e);
    const msg = e instanceof Error ? e.message : 'Error exporting CSV';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
