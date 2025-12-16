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
    .select('id, slug, name, description, bank_account_name, bank_account_number, bank_ifsc, bank_upi_id, direct_upload_enabled')
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

    const { data: templates, error } = await admin
      .from('templates')
      .select('slug,name,subtitle,video,img,created_at,creator_shop_id,status')
      .eq('creator_shop_id', shop.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const items = templates || [];
    const results: Array<any> = [];

    // Per-template download counts
    for (const tpl of items) {
      let downloadCount = 0;
      try {
        const { count } = await admin
          .from('downloads')
          .select('id', { count: 'exact', head: true })
          .eq('template_slug', tpl.slug);
        downloadCount = count ?? 0;
      } catch (e) {
        // If analytics fails, keep downloadCount = 0 but do not block response
        console.error('Failed to load download count for', tpl.slug, e);
      }
      results.push({ ...tpl, downloadCount });
    }

    // Aggregate stats across all templates for this creator
    const totalDownloads = results.reduce(
      (sum, t) => sum + (t.downloadCount || 0),
      0
    );

    // Revenue-related unique user count (30-day windows per user/creator)
    let uniqueUserPeriods = 0;
    try {
      const slugs = items.map((t: any) => t.slug).filter(Boolean);
      if (slugs.length > 0) {
        const { data: dl } = await admin
          .from('downloads')
          .select('user_id, template_slug, downloaded_at')
          .in('template_slug', slugs)
          .order('downloaded_at', { ascending: true });

        if (dl && dl.length > 0) {
          const byUser = new Map<string, Date[]>();
          for (const d of dl as any[]) {
            if (!d.user_id || !d.downloaded_at) continue;
            const arr = byUser.get(d.user_id) || [];
            arr.push(new Date(d.downloaded_at));
            byUser.set(d.user_id, arr);
          }

          const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

          byUser.forEach((dates) => {
            dates.sort((a, b) => a.getTime() - b.getTime());
            let lastCounted: Date | null = null;
            for (const dt of dates) {
              if (!lastCounted) {
                uniqueUserPeriods += 1;
                lastCounted = dt;
              } else if (dt.getTime() - lastCounted.getTime() > THIRTY_DAYS_MS) {
                uniqueUserPeriods += 1;
                lastCounted = dt;
              }
            }
          });
        }
      }
    } catch (e) {
      console.error('Failed to compute unique user periods for creator', e);
      uniqueUserPeriods = 0;
    }

    // Calculate creator revenue based on unique user count
    let creatorRevenue = 0;
    try {
      // Get subscription prices from settings
      let monthlyPrice = 799; // Default
      let yearlyPrice = 5499; // Default
      
      try {
        const { data: settings } = await admin.from('settings').select('key,value');
        if (settings) {
          const settingsMap: Record<string, string> = {};
          settings.forEach((row: any) => { settingsMap[row.key] = row.value; });
          
          const monthlyPaise = Number(settingsMap.RAZORPAY_MONTHLY_AMOUNT || 79900);
          const yearlyPaise = Number(settingsMap.RAZORPAY_YEARLY_AMOUNT || 549900);
          
          // Convert from paise to INR (if >= threshold, it's in paise)
          monthlyPrice = monthlyPaise >= 10000 ? monthlyPaise / 100 : monthlyPaise;
          yearlyPrice = yearlyPaise >= 100000 ? yearlyPaise / 100 : yearlyPaise;
        }
      } catch (e) {
        console.log('Could not fetch prices from settings, using defaults');
      }

      // Get all active subscriptions
      const { data: allSubs } = await admin
        .from('subscriptions')
        .select('plan, is_active, valid_until')
        .eq('is_active', true);

      if (allSubs && allSubs.length > 0) {
        // Calculate total revenue pool from active subscriptions
        let totalPool = 0;
        const now = Date.now();
        
        allSubs.forEach((s: any) => {
          const validUntil = s.valid_until ? new Date(s.valid_until as any).getTime() : null;
          const isValid = !validUntil || validUntil > now;
          
          if (isValid) {
            if (s.plan === 'monthly' || s.plan === 'weekly') {
              totalPool += monthlyPrice;
            } else if (s.plan === 'yearly') {
              totalPool += yearlyPrice;
            }
          }
        });

        // Get all creators and their unique user counts
        const { data: allShops } = await admin
          .from('creator_shops')
          .select('id');

        if (allShops && allShops.length > 0) {
          const creatorStats: Array<{ shopId: string; uniqueUsers: number }> = [];
          
          for (const creatorShop of allShops) {
            // Get all templates for this creator
            const { data: creatorTemplates } = await admin
              .from('templates')
              .select('slug')
              .eq('creator_shop_id', creatorShop.id);
            
            if (creatorTemplates && creatorTemplates.length > 0) {
              const creatorSlugs = creatorTemplates.map((t: any) => t.slug).filter(Boolean);
              
              // Get downloads for this creator's templates
              const { data: creatorDownloads } = await admin
                .from('downloads')
                .select('user_id, downloaded_at')
                .in('template_slug', creatorSlugs)
                .order('downloaded_at', { ascending: true });

              if (creatorDownloads && creatorDownloads.length > 0) {
                const byUser = new Map<string, Date[]>();
                for (const d of creatorDownloads as any[]) {
                  if (!d.user_id || !d.downloaded_at) continue;
                  const arr = byUser.get(d.user_id) || [];
                  arr.push(new Date(d.downloaded_at));
                  byUser.set(d.user_id, arr);
                }

                const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
                let creatorUniqueUsers = 0;

                byUser.forEach((dates) => {
                  dates.sort((a, b) => a.getTime() - b.getTime());
                  let lastCounted: Date | null = null;
                  for (const dt of dates) {
                    if (!lastCounted) {
                      creatorUniqueUsers += 1;
                      lastCounted = dt;
                    } else if (dt.getTime() - lastCounted.getTime() > THIRTY_DAYS_MS) {
                      creatorUniqueUsers += 1;
                      lastCounted = dt;
                    }
                  }
                });

                creatorStats.push({
                  shopId: creatorShop.id,
                  uniqueUsers: creatorUniqueUsers,
                });
              } else {
                creatorStats.push({
                  shopId: creatorShop.id,
                  uniqueUsers: 0,
                });
              }
            } else {
              creatorStats.push({
                shopId: creatorShop.id,
                uniqueUsers: 0,
              });
            }
          }

          // Calculate total unique users across all creators
          const totalUniqueUsers = creatorStats.reduce((sum, stat) => sum + stat.uniqueUsers, 0);

          // Calculate this creator's share (40% of pool distributed proportionally)
          if (totalUniqueUsers > 0 && uniqueUserPeriods > 0) {
            const creatorShare = uniqueUserPeriods / totalUniqueUsers;
            const creatorPool = totalPool * 0.4; // 40% of total pool
            creatorRevenue = creatorPool * creatorShare;
            
            // Apply minimum payout of 800
            // If revenue is less than 800, it's not eligible for payout yet
            // But we still show the calculated revenue
          }
        }
      }
    } catch (e) {
      console.error('Failed to calculate creator revenue', e);
      creatorRevenue = 0;
    }

    return NextResponse.json({
      ok: true,
      shop,
      templates: results,
      stats: {
        totalDownloads,
        uniqueUserPeriods,
        revenue: creatorRevenue,
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


