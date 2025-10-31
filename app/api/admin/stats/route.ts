import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';

export async function GET() {
  try {
    const admin = getSupabaseAdminClient();
    const templatesCount = await admin.from('templates').select('*', { count: 'exact', head: true });
    const ordersAgg = await admin.from('orders').select('total');
    const orders = (ordersAgg.data || []) as Array<{ total: number }>;
    const revenue = orders.reduce((s, o) => s + Number(o.total || 0), 0);
    return NextResponse.json({ ok: true, data: { templates: templatesCount.count || 0, orders: orders.length, revenue } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}


