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
    const subcategoryId = searchParams.get('subcategory_id');

    let query = admin.from('sub_subcategories').select('*');
    if (subcategoryId) {
      query = query.eq('subcategory_id', subcategoryId);
    }
    const { data, error } = await query.order('name');
    
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, sub_subcategories: data || [] });
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
    const { id, subcategory_id, name, slug, description } = body;
    
    if (!subcategory_id || !name || !slug) {
      return NextResponse.json({ ok: false, error: 'Subcategory ID, name, and slug are required' }, { status: 400 });
    }

    if (id) {
      // Update existing sub-subcategory
      const { data, error } = await admin
        .from('sub_subcategories')
        .update({
          subcategory_id,
          name: name.trim(),
          slug: slug.trim(),
          description: description?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, sub_subcategory: data });
    } else {
      // Create new sub-subcategory
      const { data, error } = await admin
        .from('sub_subcategories')
        .insert({
          subcategory_id,
          name: name.trim(),
          slug: slug.trim(),
          description: description?.trim() || null,
        })
        .select()
        .single();
      
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, sub_subcategory: data });
    }
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
      return NextResponse.json({ ok: false, error: 'Sub-subcategory ID is required' }, { status: 400 });
    }

    const { error } = await admin
      .from('sub_subcategories')
      .delete()
      .eq('id', id);
    
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}

