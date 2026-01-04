'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '../lib/supabaseClient';
import { ArrowRight, Play, Users } from 'lucide-react';
import { convertR2UrlToCdn } from '../lib/utils';

interface TemplateRow {
  slug: string;
  name: string;
  thumbnail_path?: string | null;
  img?: string | null;
  creator_shop_id?: string | null;
  vendor_name?: string | null;
  created_at?: string | null;
  category_id?: string | null;
  video_path?: string | null;
  creator_shops?: { slug?: string | null } | { slug?: string | null }[] | null;
  creator_shop_slug?: string | null;
}

interface VendorGroup {
  vendor: string;
  creator_shop_id: string;
  vendor_slug: string;
  templates: Array<TemplateRow & { displayDownloads: number }>;
  totalDownloads: number;
}

const stableMockCount = (slug: string) => {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = ((hash << 5) - hash + slug.charCodeAt(i)) | 0;
  }
  const normalized = Math.abs(hash) % 151; // 0..150
  return 100 + normalized; // 100..250
};

export default function TopDownloadedShowcase() {
  const [vendors, setVendors] = useState<VendorGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTopTemplates = async () => {
      try {
        const supabase = getSupabaseBrowserClient();

        const { data: approvedTemplates } = await supabase
          .from('templates')
          .select('slug,name,thumbnail_path,img,creator_shop_id,vendor_name,created_at,category_id,video_path,creator_shops(slug)')
          .eq('status', 'approved')
          .limit(500);

        if (!approvedTemplates || approvedTemplates.length === 0) {
          setVendors([]);
          setLoading(false);
          return;
        }

        const slugs = approvedTemplates.map(t => t.slug);
        const { data: dl } = await supabase
          .from('downloads')
          .select('template_slug')
          .in('template_slug', slugs)
          .is('subscription_id', null);

        const downloadCounts: Record<string, number> = {};
        (dl || []).forEach((d: any) => {
          if (d.template_slug) {
            downloadCounts[d.template_slug] = (downloadCounts[d.template_slug] || 0) + 1;
          }
        });

        const NEW_MS = 3 * 24 * 60 * 60 * 1000;
        const now = Date.now();

        // Prefer video templates, skip music/audio-only items
        const videoCategoryId = '448b09c7-addb-4875-83d9-a207e213f6d0'; // Video Templates
        const musicCategoryId = '143d45f1-a55b-42be-9f51-aab507a20fac'; // Music/SFX

        const templateRows: TemplateRow[] = (approvedTemplates as any[]).map((t) => {
          const vendorSlug = Array.isArray(t.creator_shops)
            ? t.creator_shops[0]?.slug
            : t.creator_shops?.slug;
          return { ...t, creator_shop_slug: vendorSlug || null };
        });

        const templatesWithDisplay = templateRows
          .filter((t) => {
            // Keep video templates or anything with a video_path; de-prioritize pure audio items
            if (t.category_id === musicCategoryId && !t.video_path) return false;
            return t.category_id === videoCategoryId || !!t.video_path;
          })
          .map((t: TemplateRow) => {
          const real = downloadCounts[t.slug] || 0;
          const createdAt = t.created_at ? new Date(t.created_at).getTime() : 0;
          const isNew = createdAt ? (now - createdAt) < NEW_MS : false;
          const displayDownloads = real > 0 ? real : (isNew ? 0 : stableMockCount(t.slug));
          return { ...t, displayDownloads };
        });

        const byVendor: Record<string, VendorGroup> = {};
        templatesWithDisplay.forEach((tpl) => {
          const vendor = tpl.vendor_name || 'Creator';
          const vendorSlug =
            tpl.creator_shop_slug ||
            tpl.creator_shop_id ||
            (vendor ? vendor.replace(/\s+/g, '-').toLowerCase() : tpl.slug);
          const key = tpl.creator_shop_id || `vendor:${vendorSlug}`;
          if (!byVendor[key]) {
            byVendor[key] = { vendor, creator_shop_id: tpl.creator_shop_id || key, vendor_slug: vendorSlug, templates: [], totalDownloads: 0 };
          }
          byVendor[key].templates.push(tpl);
          byVendor[key].totalDownloads += tpl.displayDownloads;
        });

        const topVendors = Object.values(byVendor)
          .sort((a, b) => b.totalDownloads - a.totalDownloads)
          .slice(0, 3)
          .map(v => ({
            ...v,
            templates: v.templates
              .sort((a, b) => b.displayDownloads - a.displayDownloads)
              .slice(0, 5),
          }));

        setVendors(topVendors);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load top vendors:', error);
        setVendors([]);
        setLoading(false);
      }
    };

    loadTopTemplates();
  }, []);

  const getThumbnail = (template: TemplateRow) => {
    if (template.thumbnail_path) return convertR2UrlToCdn(template.thumbnail_path) || template.thumbnail_path;
    if (template.img) return convertR2UrlToCdn(template.img) || template.img;
    return '/PNG1.png';
  };

  if (loading) {
    return (
      <section className="relative w-full py-12 px-4 sm:px-6 bg-white">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="aspect-video bg-zinc-100 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative w-full py-12 px-4 sm:px-6 bg-white">
      <div className="max-w-[1400px] mx-auto space-y-8">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl sm:text-3xl font-black text-zinc-900">Top creators</h2>
        </div>

        {vendors.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">No creator templates yet.</div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {vendors.map((vendor) => (
              <div key={vendor.creator_shop_id} className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Creator</p>
                    <Link href={`/${vendor.vendor_slug}`} className="text-xl font-bold text-zinc-900 hover:text-blue-600">
                      {vendor.vendor}
                    </Link>
                    <p className="text-xs text-zinc-500">{vendor.totalDownloads}+ downloads</p>
                  </div>
                  <Link
                    href={`/${vendor.vendor_slug}`}
                    className="flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    View all
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {vendor.templates.map((tpl) => (
                    <Link key={tpl.slug} href={`/product/${tpl.slug}`} className="group relative rounded-xl overflow-hidden border border-zinc-200 bg-white hover:border-blue-500 transition-all">
                      <div className="aspect-video bg-zinc-100">
                        <img src={getThumbnail(tpl)} alt={tpl.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                      <div className="p-2 space-y-1">
                        <p className="text-[13px] font-semibold text-zinc-900 line-clamp-2 group-hover:text-blue-600 transition-colors">{tpl.name}</p>
                        <p className="text-[11px] text-zinc-500">{tpl.displayDownloads}+ downloads</p>
                      </div>
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <div className="w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
                          <Play className="w-3.5 h-3.5 text-blue-600 fill-current" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
