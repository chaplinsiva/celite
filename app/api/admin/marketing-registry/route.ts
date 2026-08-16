// agent-notes: { ctx: "Admin API for Marketing Content Registry CRUD operations", deps: ["lib/supabaseAdmin.ts"], state: active, last: "sato@2026-08-16" }
import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';

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

    const { searchParams } = new URL(req.url);
    const platform = searchParams.get('platform');
    const search = searchParams.get('search');

    let query = admin.from('marketing_sources_registry').select('*').order('created_at', { ascending: false });

    if (platform && platform !== 'all') {
      query = query.eq('platform', platform);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    let records = data || [];
    if (search) {
      const q = search.toLowerCase();
      records = records.filter(
        (r) =>
          r.campaign_name?.toLowerCase().includes(q) ||
          r.campaign_id?.toLowerCase().includes(q) ||
          r.ad_or_video_name?.toLowerCase().includes(q) ||
          r.ad_or_video_id?.toLowerCase().includes(q) ||
          r.content_name?.toLowerCase().includes(q) ||
          r.product_slug?.toLowerCase().includes(q) ||
          r.platform?.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({ ok: true, data: records });
  } catch (e: any) {
    console.error('Marketing registry fetch error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Failed to fetch registry' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = getSupabaseAdminClient();
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
    if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { data: me, error: meErr } = await admin.auth.getUser(token);
    if (meErr || !me.user) return NextResponse.json({ ok: false, error: 'Invalid session' }, { status: 401 });

    const { data: isAdmin } = await admin.from('admins').select('user_id').eq('user_id', me.user.id).maybeSingle();
    if (!isAdmin) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const {
      id,
      platform,
      source,
      medium,
      campaign_name,
      campaign_id,
      adset_name,
      adset_id,
      ad_or_video_name,
      ad_or_video_id,
      content_name,
      content_id,
      product_slug,
      destination_url,
      start_date,
      end_date,
      is_active,
      notes,
    } = body;

    if (!platform || !source || !medium) {
      return NextResponse.json({ ok: false, error: 'Platform, source, and medium are required' }, { status: 400 });
    }

    const payload = {
      platform,
      source,
      medium,
      campaign_name: campaign_name || null,
      campaign_id: campaign_id || null,
      adset_name: adset_name || null,
      adset_id: adset_id || null,
      ad_or_video_name: ad_or_video_name || null,
      ad_or_video_id: ad_or_video_id || null,
      content_name: content_name || ad_or_video_name || null,
      content_id: content_id || ad_or_video_id || null,
      product_slug: product_slug || null,
      destination_url: destination_url || null,
      start_date: start_date || null,
      end_date: end_date || null,
      is_active: is_active !== undefined ? is_active : true,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    };

    if (id) {
      // Update existing
      const { data, error } = await admin
        .from('marketing_sources_registry')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, data });
    } else {
      // Create new
      const { data, error } = await admin
        .from('marketing_sources_registry')
        .insert({ ...payload, created_at: new Date().toISOString() })
        .select()
        .single();

      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, data });
    }
  } catch (e: any) {
    console.error('Marketing registry save error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Failed to save registry mapping' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const admin = getSupabaseAdminClient();
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
    if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { data: me, error: meErr } = await admin.auth.getUser(token);
    if (meErr || !me.user) return NextResponse.json({ ok: false, error: 'Invalid session' }, { status: 401 });

    const { data: isAdmin } = await admin.from('admins').select('user_id').eq('user_id', me.user.id).maybeSingle();
    if (!isAdmin) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ ok: false, error: 'ID is required' }, { status: 400 });

    const { error } = await admin.from('marketing_sources_registry').delete().eq('id', id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('Marketing registry delete error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Failed to delete registry mapping' }, { status: 500 });
  }
}
