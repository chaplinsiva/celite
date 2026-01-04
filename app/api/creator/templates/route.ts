import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';

async function getCreatorContext(req: Request) {
  const admin = getSupabaseAdminClient();

  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
  if (!token) {
    return { error: NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: userRes, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userRes.user) {
    return { error: NextResponse.json({ ok: false, error: 'Invalid session' }, { status: 401 }) };
  }

  const userId = userRes.user.id;

  const { data: shop, error: shopErr } = await admin
    .from('creator_shops')
    .select('id, slug, name, description, bank_account_name, bank_account_number, bank_ifsc, bank_upi_id, direct_upload_enabled, profile_image_url')
    .eq('user_id', userId)
    .maybeSingle();

  if (shopErr || !shop) {
    return { error: NextResponse.json({ ok: false, error: 'No creator shop found for this user' }, { status: 404 }) };
  }

  return { admin, userId, shop };
}

export async function GET(req: Request) {
  try {
    const ctx = await getCreatorContext(req);
    if ('error' in ctx) return ctx.error;
    const { admin, shop } = ctx;

    const now = Date.now();
    const NEW_MS = 3 * 24 * 60 * 60 * 1000;
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
    const weekAgo = new Date(now - WEEK_MS).toISOString();
    const monthAgo = new Date(now - MONTH_MS).toISOString();

    const stableMockCount = (slug: string) => {
      // Deterministic pseudo-random between 100 and 250 based on slug hash
      let hash = 0;
      for (let i = 0; i < slug.length; i++) {
        hash = ((hash << 5) - hash + slug.charCodeAt(i)) | 0;
      }
      const normalized = Math.abs(hash) % 151; // 0..150
      return 100 + normalized; // 100..250
    };

    const stableMockFollowers = (seed: string) => {
      // Deterministic pseudo-random between 100 and 300
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
      }
      const normalized = Math.abs(hash) % 201; // 0..200
      return 100 + normalized; // 100..300
    };

    // Fetch templates, download counts, paid order items, recent downloads, and payout requests
    const [templatesResult, downloadsResult, orderItemsResult, recentDownloadsResult, payoutResult] = await Promise.all([
      admin
        .from('templates')
        .select('slug,name,subtitle,video,img,created_at,creator_shop_id,status,price,vendor_name,description,video_path,thumbnail_path,audio_preview_path,model_3d_path,source_path,features,software,plugins,tags')
        .eq('creator_shop_id', shop.id)
        .order('created_at', { ascending: false }),
      admin
        .from('downloads')
        .select('template_slug')
        .in(
          'template_slug',
          await admin
            .from('templates')
            .select('slug')
            .eq('creator_shop_id', shop.id)
            .then(res => (res.data || []).map((t: any) => t.slug))
        ),
      admin
        .from('order_items')
        .select('slug, price, quantity, orders!inner(status,created_at)')
        .eq('orders.status', 'paid')
        .in(
          'slug',
          await admin
            .from('templates')
            .select('slug')
            .eq('creator_shop_id', shop.id)
            .then(res => (res.data || []).map((t: any) => t.slug))
        ),
      admin
        .from('downloads')
        .select('template_slug, downloaded_at')
        .gte('downloaded_at', monthAgo)
        .in(
          'template_slug',
          await admin
            .from('templates')
            .select('slug')
            .eq('creator_shop_id', shop.id)
            .then(res => (res.data || []).map((t: any) => t.slug))
        ),
      admin
        .from('creator_payout_requests')
        .select('amount,status')
        .eq('creator_shop_id', shop.id),
    ]);

    if (templatesResult.error) {
      return NextResponse.json({ ok: false, error: templatesResult.error.message }, { status: 500 });
    }
    const templates = templatesResult.data || [];

    // Download counts
    const downloadCounts: Record<string, number> = {};
    (downloadsResult.data || []).forEach((d: any) => {
      downloadCounts[d.template_slug] = (downloadCounts[d.template_slug] || 0) + 1;
    });

    // Paid order items for revenue
    const templateRevenue: Record<string, number> = {};
    const dailyRevenue: Record<string, { gross: number; vendor: number }> = {};
    let totalGross = 0;
    (orderItemsResult.data || []).forEach((item: any) => {
      const slug = item.slug;
      const gross = (Number(item.price) || 0) * (Number(item.quantity) || 1);
      const vendor = gross * 0.65;
      templateRevenue[slug] = (templateRevenue[slug] || 0) + gross;
      totalGross += gross;

      const createdAt = item.orders?.created_at;
      if (createdAt) {
        const dayKey = new Date(createdAt).toISOString().slice(0, 10);
        const entry = dailyRevenue[dayKey] || { gross: 0, vendor: 0 };
        entry.gross += gross;
        entry.vendor += vendor;
        dailyRevenue[dayKey] = entry;
      }
    });

    // Downloads for analytics
    const dailyDownloads: Record<string, number> = {};
    (recentDownloadsResult.data || []).forEach((d: any) => {
      const dayKey = d.downloaded_at ? new Date(d.downloaded_at).toISOString().slice(0, 10) : '';
      if (dayKey) {
        dailyDownloads[dayKey] = (dailyDownloads[dayKey] || 0) + 1;
      }
    });

    // Payouts
    const payoutRows = payoutResult.data || [];
    const approvedPayouts = payoutRows.filter((p: any) => p.status === 'approved').reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    const pendingPayouts = payoutRows.filter((p: any) => p.status === 'pending').reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

    // Build template results
    const results = templates.map((tpl: any) => {
      const realDownloads = downloadCounts[tpl.slug] || 0;
      const createdAt = tpl.created_at ? new Date(tpl.created_at).getTime() : 0;
      const isLegacy = realDownloads === 0 && (!createdAt || (now - createdAt) > NEW_MS); // show mock for zero-download items older than NEW_MS
      const mockCount = isLegacy ? stableMockCount(tpl.slug) : realDownloads;
      const gross = templateRevenue[tpl.slug] || 0;
      const vendorShare = gross * 0.65;
      const followerCount = stableMockFollowers(shop.slug || shop.id || tpl.slug);
      const isMockFollower = isLegacy;

      return {
        ...tpl,
        price: Number(tpl.price ?? 0),
        vendor_name: tpl.vendor_name || shop.name || 'Creator',
        profile_image_url: shop.profile_image_url || null,
        downloadCount: realDownloads,
        displayDownloadCount: isLegacy ? mockCount : realDownloads,
        isMockDownloadCount: isLegacy,
        followerCount,
        isMockFollower,
        grossRevenue: gross,
        vendorRevenue: vendorShare,
      };
    });

    const totalDownloads = results.reduce((sum, t) => sum + (t.downloadCount || 0), 0);
    const vendorShareTotal = totalGross * 0.65;
    const followerCount = stableMockFollowers(shop.slug || shop.id || 'shop');

    // Timeframe aggregates
    const aggregateSince = (sinceIso: string) => {
      const sinceMs = new Date(sinceIso).getTime();
      const gross = (orderItemsResult.data || []).reduce((s: number, item: any) => {
        const created = item.orders?.created_at ? new Date(item.orders.created_at).getTime() : 0;
        if (!created || created < sinceMs) return s;
        return s + (Number(item.price) || 0) * (Number(item.quantity) || 1);
      }, 0);
      const downloads = (recentDownloadsResult.data || []).reduce((s: number, d: any) => {
        const ts = d.downloaded_at ? new Date(d.downloaded_at).getTime() : 0;
        return ts >= sinceMs ? s + 1 : s;
      }, 0);
      return { gross, vendor: gross * 0.65, downloads };
    };

    const weekly = aggregateSince(weekAgo);
    const monthly = aggregateSince(monthAgo);

    // Build series for last 30 days
    const seriesLabels: string[] = [];
    const revenueSeries: number[] = [];
    const vendorSeries: number[] = [];
    const downloadSeries: number[] = [];
    for (let i = 29; i >= 0; i--) {
      const day = new Date(now - i * 24 * 60 * 60 * 1000);
      const key = day.toISOString().slice(0, 10);
      seriesLabels.push(key);
      const rev = dailyRevenue[key]?.gross || 0;
      const ven = dailyRevenue[key]?.vendor || 0;
      const dls = dailyDownloads[key] || 0;
      revenueSeries.push(rev);
      vendorSeries.push(ven);
      downloadSeries.push(dls);
    }

    const availableForWithdraw = Math.max(0, vendorShareTotal - approvedPayouts - pendingPayouts);

    return NextResponse.json({
      ok: true,
      shop,
      templates: results,
      stats: {
        totalDownloads,
        totalGross,
        vendorShareTotal,
        followerCount,
        availableForWithdraw,
        pendingPayouts,
        approvedPayouts,
        weekly,
        monthly,
        series: {
          labels: seriesLabels,
          revenue: revenueSeries,
          vendor: vendorSeries,
          downloads: downloadSeries,
        },
      },
    });
  } catch (e: any) {
    console.error('Creator GET error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getCreatorContext(req);
    if ('error' in ctx) return ctx.error;
    const { admin, shop } = ctx;

    const body = await req.json().catch(() => ({}));
    const input = body?.template;

    if (!input) {
      return NextResponse.json({ ok: false, error: 'Provide { template: { ... } } in request body' }, { status: 400 });
    }

    const rawName: string = (input.name || '').toString().trim();
    let rawSlug: string = (input.slug || '').toString().trim().toLowerCase();
    if (!rawName) {
      return NextResponse.json({ ok: false, error: 'Template name is required' }, { status: 400 });
    }

    // Generate slug from name if not provided
    if (!rawSlug) {
      rawSlug = rawName
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    // Ensure slug is valid
    if (!rawSlug || rawSlug.length === 0) {
      return NextResponse.json({ ok: false, error: 'Invalid slug generated. Please provide a valid slug.' }, { status: 400 });
    }

    // Ensure slug uniqueness: if an existing template uses this slug and is not ours, generate a unique one
    let finalSlug = rawSlug;
    let attempt = 1;
    while (true) {
      const { data: existing, error: existingErr } = await admin
        .from('templates')
        .select('slug, creator_shop_id')
        .eq('slug', finalSlug)
        .maybeSingle();

      if (existingErr) {
        return NextResponse.json({ ok: false, error: existingErr.message }, { status: 500 });
      }

      // If slug doesn't exist, or exists and belongs to us, we can use it
      if (!existing || (existing.creator_shop_id && existing.creator_shop_id === shop.id)) {
        break;
      }

      // If slug exists and belongs to another creator, append a number
      finalSlug = `${rawSlug}-${attempt}`;
      attempt++;

      // Safety check to prevent infinite loop
      if (attempt > 100) {
        return NextResponse.json({ ok: false, error: 'Unable to generate unique slug. Please try a different name.' }, { status: 500 });
      }
    }

    const row = {
      slug: finalSlug,
      name: rawName,
      subtitle: (input.subtitle || '').toString().trim() || null,
      description: (input.description || '').toString().trim() || null,
      img: null,
      video_path: (input.video_path || '').toString().trim() || null,
      thumbnail_path: (input.thumbnail_path || '').toString().trim() || null,
      audio_preview_path: (input.audio_preview_path || '').toString().trim() || null,
      model_3d_path: (input.model_3d_path || '').toString().trim() || null,
      source_path: (input.source_path || '').toString().trim() || null,
      preview_path: (input.preview_path || '').toString().trim() || null,
      features: Array.isArray(input.features) ? input.features : [],
      software: Array.isArray(input.software) ? input.software : [],
      plugins: Array.isArray(input.plugins) ? input.plugins : [],
      tags: Array.isArray(input.tags) ? input.tags : [],
      category_id: input.category_id || null,
      subcategory_id: input.subcategory_id || null,
      sub_subcategory_id: input.sub_subcategory_id || null,
      meta_title: (input.meta_title || '').toString().trim() || null,
      meta_description: (input.meta_description || '').toString().trim() || null,
      creator_shop_id: shop.id,
      vendor_name: shop.name,
      status: 'pending', // every creator change requires admin review
    };

    const { data, error } = await admin
      .from('templates')
      .upsert(row, { onConflict: 'slug' })
      .select('slug')
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ ok: false, error: error?.message || 'Failed to save template' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, slug: data.slug });
  } catch (e: any) {
    console.error('Creator POST error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const ctx = await getCreatorContext(req);
    if ('error' in ctx) return ctx.error;
    const { admin, shop } = ctx;

    const body = await req.json().catch(() => ({}));
    const slug = (body?.slug || '').toString().trim();
    if (!slug) {
      return NextResponse.json({ ok: false, error: 'Missing slug' }, { status: 400 });
    }

    const { data: tpl, error: tplErr } = await admin
      .from('templates')
      .select('slug, creator_shop_id, status')
      .eq('slug', slug)
      .maybeSingle();
    if (tplErr) return NextResponse.json({ ok: false, error: tplErr.message }, { status: 500 });
    if (!tpl) return NextResponse.json({ ok: false, error: 'Template not found' }, { status: 404 });
    if (!tpl.creator_shop_id || tpl.creator_shop_id !== shop.id) {
      return NextResponse.json({ ok: false, error: 'You can only edit your own templates' }, { status: 403 });
    }

    const updates: Record<string, any> = {};
    if (body.name) updates.name = String(body.name);
    if (body.subtitle !== undefined) updates.subtitle = body.subtitle ? String(body.subtitle) : null;
    if (body.description !== undefined) updates.description = body.description ? String(body.description) : null;
    if (body.video_path !== undefined) updates.video_path = body.video_path ? String(body.video_path) : null;
    if (body.thumbnail_path !== undefined) updates.thumbnail_path = body.thumbnail_path ? String(body.thumbnail_path) : null;
    if (body.audio_preview_path !== undefined) updates.audio_preview_path = body.audio_preview_path ? String(body.audio_preview_path) : null;
    if (body.model_3d_path !== undefined) updates.model_3d_path = body.model_3d_path ? String(body.model_3d_path) : null;
    if (body.source_path !== undefined) updates.source_path = body.source_path ? String(body.source_path) : null;
    if (body.price !== undefined && body.price !== null) updates.price = Number(body.price) || 0;

    if (body.features !== undefined) updates.features = Array.isArray(body.features) ? body.features : [];
    if (body.software !== undefined) updates.software = Array.isArray(body.software) ? body.software : [];
    if (body.plugins !== undefined) updates.plugins = Array.isArray(body.plugins) ? body.plugins : [];
    if (body.tags !== undefined) updates.tags = Array.isArray(body.tags) ? body.tags : [];

    // Allow edits after approval, mark for re-review
    updates.status = 'pending';

    if (Object.keys(updates).length === 1 && updates.status) {
      return NextResponse.json({ ok: false, error: 'No fields to update' }, { status: 400 });
    }

    const { error } = await admin.from('templates').update(updates).eq('slug', slug);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('Creator PATCH error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await getCreatorContext(req);
    if ('error' in ctx) return ctx.error;
    const { admin, shop } = ctx;

    const body = await req.json().catch(() => ({}));
    const slug = (body?.slug || '').toString().trim();
    if (!slug) {
      return NextResponse.json({ ok: false, error: 'Missing slug' }, { status: 400 });
    }

    // Verify that this template belongs to this creator
    const { data: tpl, error: readErr } = await admin
      .from('templates')
      .select('slug, creator_shop_id')
      .eq('slug', slug)
      .maybeSingle();

    if (readErr) {
      return NextResponse.json({ ok: false, error: readErr.message }, { status: 500 });
    }

    if (!tpl) {
      return NextResponse.json({ ok: false, error: 'Template not found' }, { status: 404 });
    }

    if (!tpl.creator_shop_id || tpl.creator_shop_id !== shop.id) {
      return NextResponse.json({ ok: false, error: 'You can only delete your own templates' }, { status: 403 });
    }

    const { error } = await admin.from('templates').delete().eq('slug', slug);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('Creator DELETE error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
