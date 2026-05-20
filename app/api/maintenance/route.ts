import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../lib/supabaseAdmin';

export async function GET() {
  try {
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin
      .from('settings')
      .select('key,value')
      .eq('key', 'MAINTENANCE_MODE')
      .maybeSingle();

    // If settings table doesn't exist or row missing, treat as maintenance off
    if (error && error.code !== '42P01') {
      console.error('Maintenance settings error:', error);
      return NextResponse.json({ ok: true, maintenance: false });
    }

    const raw = (data as any)?.value as string | undefined;
    const maintenance =
      raw === 'on' || raw === 'true' || raw === '1';

    return NextResponse.json({ ok: true, maintenance });
  } catch (e: any) {
    console.error('Maintenance endpoint error:', e);
    // Fail-open: if we cannot read the flag, do not break the site
    return NextResponse.json({ ok: true, maintenance: false });
  }
}


