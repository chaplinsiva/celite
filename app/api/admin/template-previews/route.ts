import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';

async function assertAdmin(token: string) {
  const admin = getSupabaseAdminClient();
  const { data: userRes, error } = await admin.auth.getUser(token);
  if (error || !userRes.user) return null;
  const { data } = await admin.from('admins').select('user_id').eq('user_id', userRes.user.id).maybeSingle();
  return data ? userRes.user : null;
}

export async function GET(req: Request) {
  try {
    const admin = getSupabaseAdminClient();
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
    if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const me = await assertAdmin(token);
    if (!me) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const templateSlug = searchParams.get('template_slug');
    if (!templateSlug) {
      return NextResponse.json({ ok: false, error: 'template_slug is required' }, { status: 400 });
    }

    const { data, error } = await admin
      .from('template_previews')
      .select('*')
      .eq('template_slug', templateSlug)
      .order('sort_order');

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, previews: data || [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = getSupabaseAdminClient();
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
    if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const me = await assertAdmin(token);
    if (!me) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { id, template_slug, kind, title, url, sort_order } = body;

    if (!template_slug || !kind || !url) {
      return NextResponse.json({ ok: false, error: 'template_slug, kind, and url are required' }, { status: 400 });
    }

    const record = {
      template_slug,
      kind,
      title: title?.trim() || null,
      url: url.trim(),
      sort_order: typeof sort_order === 'number' ? sort_order : 0,
    };

    if (id) {
      const { data, error } = await admin
        .from('template_previews')
        .update(record)
        .eq('id', id)
        .select()
        .single();
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, preview: data });
    }

    const { data, error } = await admin
      .from('template_previews')
      .insert(record)
      .select()
      .single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, preview: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const admin = getSupabaseAdminClient();
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
    if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const me = await assertAdmin(token);
    if (!me) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ ok: false, error: 'id is required' }, { status: 400 });
    }

    const { error } = await admin
      .from('template_previews')
      .delete()
      .eq('id', id);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}


