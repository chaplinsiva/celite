import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

// agent-notes: { ctx: "Admin API endpoint for blogs management (pure DB CRUD)", deps: [lib/supabaseAdmin], state: active, last: "sato@2026-08-16" }

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

    const { data, error } = await admin
      .from('blogs')
      .select('*')
      .order('published_at', { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, blogs: data || [] });
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: errMsg }, { status: 500 });
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
    const {
      id,
      slug,
      title,
      subtitle,
      excerpt,
      cover_image,
      category,
      category_slug,
      tags,
      author_name,
      author_role,
      author_avatar,
      author_bio,
      read_time,
      featured,
      status,
      meta_title,
      meta_description,
      keywords,
      content_html,
      faqs,
      published_at,
    } = body;

    if (!title || !slug || !content_html || !category) {
      return NextResponse.json(
        { ok: false, error: 'Title, slug, category, and content are required' },
        { status: 400 }
      );
    }

    const payload = {
      slug: slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      title: title.trim(),
      subtitle: subtitle?.trim() || null,
      excerpt: excerpt?.trim() || null,
      cover_image: cover_image?.trim() || '/hero_ae_template.png',
      category: category.trim(),
      category_slug: (category_slug || category.toLowerCase().replace(/[^a-z0-9-]/g, '-')).trim(),
      tags: Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      author_name: author_name?.trim() || 'Celite Creative Team',
      author_role: author_role?.trim() || 'Motion Design & Video Production Specialists',
      author_avatar: author_avatar?.trim() || '/PNG1.png',
      author_bio: author_bio?.trim() || 'Written and curated by Celite’s in-house motion designers.',
      read_time: read_time?.trim() || '5 min read',
      featured: !!featured,
      status: status || 'published',
      meta_title: meta_title?.trim() || `${title} • Celite`,
      meta_description: meta_description?.trim() || excerpt?.trim() || null,
      keywords: Array.isArray(keywords) ? keywords : typeof keywords === 'string' ? keywords.split(',').map((k: string) => k.trim()).filter(Boolean) : [],
      content_html,
      faqs: Array.isArray(faqs) ? faqs : [],
      published_at: published_at ? new Date(published_at).toISOString() : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (id) {
      // Update existing blog
      const { data, error } = await admin
        .from('blogs')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, blog: data });
    } else {
      // Create new blog
      const { data, error } = await admin
        .from('blogs')
        .insert(payload)
        .select()
        .single();

      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, blog: data });
    }
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: errMsg }, { status: 500 });
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
      return NextResponse.json({ ok: false, error: 'Blog ID is required' }, { status: 400 });
    }

    const { error } = await admin.from('blogs').delete().eq('id', id);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: errMsg }, { status: 500 });
  }
}
