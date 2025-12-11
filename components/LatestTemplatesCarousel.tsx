'use client';
import { useEffect, useRef, useState, Fragment } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Template } from '../data/templateData';
import { getSupabaseBrowserClient } from '../lib/supabaseClient';
import { useAppContext } from '../context/AppContext';
import { useLoginModal } from '../context/LoginModalContext';
import { getYouTubeThumbnailUrl } from '../lib/utils';
import YouTubeVideoPlayer from './YouTubeVideoPlayer';
import { cn } from '@/lib/utils';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

type LatestTemplate = Template & {
  category?: { id: string; name: string; slug: string } | null;
  subcategory?: { id: string; name: string; slug: string } | null;
  thumbUrl?: string | null;
  manualVideoUrl?: string | null;
};

const isLikelyVideoUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.endsWith('.mp4') ||
    lower.endsWith('.mov') ||
    lower.endsWith('.webm') ||
    lower.endsWith('.m4v') ||
    lower.endsWith('.ogg') ||
    lower.endsWith('.ogv')
  );
};

export default function LatestTemplatesCarousel() {
  const router = useRouter();
  const { user } = useAppContext();
  const { openLoginModal } = useLoginModal();
  const latestListRef = useRef<HTMLDivElement>(null);
  const [latest, setLatest] = useState<LatestTemplate[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabaseBrowserClient();

      let userIsSubscribed = false;
      if (user) {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('is_active')
          .eq('user_id', user.id)
          .maybeSingle();
        userIsSubscribed = !!sub?.is_active;
        setIsSubscribed(userIsSubscribed);
      } else {
        setIsSubscribed(false);
      }

      const { data, error: templateError } = await supabase
        .from('templates')
        .select(`
          slug,name,subtitle,description,img,video,features,software,plugins,tags,created_at,feature,
          category_id,subcategory_id,
          categories(id,name,slug),
          subcategories(id,name,slug)
        `)
        .order('created_at', { ascending: false })
        .limit(16);

      if (templateError) {
        console.error('Error loading latest templates:', templateError);
      } else {
        console.log(`[LatestTemplatesCarousel] Loaded ${data?.length || 0} templates`);
      }

      const rows = data ?? [];

      // Load preview media (thumbnails & manual videos) for these templates
      const slugs = rows.map((r: any) => r.slug as string);
      let previewsBySlug = new Map<string, any[]>();
      if (slugs.length > 0) {
        const { data: previewsRows, error: previewsError } = await supabase
          .from('template_previews')
          .select('template_slug,kind,url,sort_order')
          .in('template_slug', slugs);

        if (previewsError) {
          console.error('Error loading template previews for latest carousel:', previewsError);
        } else if (previewsRows) {
          previewsBySlug = previewsRows.reduce((map: Map<string, any[]>, row: any) => {
            const slug = row.template_slug as string;
            const arr = map.get(slug) || [];
            arr.push(row);
            map.set(slug, arr);
            return map;
          }, new Map<string, any[]>());
        }
      }

      const resolveClientPreviewUrl = (url: string | null): string | null => {
        if (!url) return null;
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        const R2_PREFIX = 'r2:';
        if (url.startsWith(R2_PREFIX)) {
          // Prefer env-configured base, but fall back to known public R2 endpoint
          const envBase = process.env.NEXT_PUBLIC_R2_DIRECT_BASE_URL;
          const defaultBase = 'https://865ce9a5340c7969451a0f1978e34696.r2.cloudflarestorage.com/celite-templates';
          const base = envBase || defaultBase;
          const key = url.slice(R2_PREFIX.length).replace(/^\/+/, '');
          const trimmedBase = base.replace(/\/+$/, '');
          return `${trimmedBase}/${key}`;
        }
        return url;
      };

      const mapped: LatestTemplate[] = rows.map((r: any) => {
        const category = r.categories ? (Array.isArray(r.categories) ? r.categories[0] : r.categories) : null;
        const subcategory = r.subcategories ? (Array.isArray(r.subcategories) ? r.subcategories[0] : r.subcategories) : null;
        const isFeaturedFlag = Boolean(r.feature ?? r.is_featured ?? r.isFeatured);
        const previews = previewsBySlug.get(r.slug) || [];
        const imagePreview = previews
          .filter((p: any) => p.kind === 'image')
          .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0];
        const manualVideoPreview = previews
          .filter((p: any) => p.kind === 'video' && p.url)
          .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0];

        const thumbUrl = resolveClientPreviewUrl(imagePreview?.url ?? null) || r.img || null;
        const resolvedManualVideo = resolveClientPreviewUrl(manualVideoPreview?.url ?? null);
        const manualVideoUrl = isLikelyVideoUrl(resolvedManualVideo) ? resolvedManualVideo : null;

        const template: LatestTemplate = {
          slug: r.slug,
          name: r.name,
          subtitle: r.subtitle,
          desc: r.description ?? '',
          price: 0,
          img: r.img,
          video: r.video,
          features: r.features ?? [],
          software: r.software ?? [],
          plugins: r.plugins ?? [],
          tags: r.tags ?? [],
          feature: isFeaturedFlag,
          isFeatured: isFeaturedFlag,
          is_featured: isFeaturedFlag,
          thumbUrl,
          manualVideoUrl,
          category: category ? { id: category.id, name: category.name, slug: category.slug } : null,
          subcategory: subcategory ? { id: subcategory.id, name: subcategory.name, slug: subcategory.slug } : null,
        };

        return template;
      });
      setLatest(mapped);
    };
    load();
  }, [user]);

  const scrollLatest = (offset: number) => {
    if (latestListRef.current) {
      latestListRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const handleDownload = async (slug: string) => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        openLoginModal();
        return;
      }
      const res = await fetch(`/api/download/${slug}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        return;
      }
      const contentType = res.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const json = await res.json();
        if (json.redirect && json.url) {
          window.open(json.url, '_blank');
          return;
        }
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${slug}.rar`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download failed:', e);
    }
  };

  const TemplateCardComponent = ({ tpl, isSubscribed, handleDownload }: { tpl: LatestTemplate; isSubscribed: boolean; handleDownload: (slug: string) => void }) => {
    const hasYouTube = !!tpl.video;
    const hasManualVideo = isLikelyVideoUrl(tpl.manualVideoUrl);
    const showYouTubePlayer = hasYouTube && !hasManualVideo;
    const showManualVideo = hasManualVideo;
    const thumbnailSrc =
      tpl.thumbUrl ||
      tpl.img ||
      (tpl.video ? getYouTubeThumbnailUrl(tpl.video) : null) ||
      '/PNG1.png';

    return (
      <div className="flex-shrink-0 w-full md:w-[calc(50%-0.75rem)] lg:w-[calc(25%-0.75rem)] snap-center">
        <Link href={`/product/${tpl.slug}`} aria-label={tpl.name} className="block h-full group">
          <div className="relative flex h-full flex-col overflow-hidden rounded-2xl bg-white border border-zinc-200 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
            <div className="relative w-full aspect-video overflow-hidden">
              {showManualVideo && tpl.manualVideoUrl ? (
                <video
                  src={tpl.manualVideoUrl}
                  muted
                  loop
                  playsInline
                  poster={thumbnailSrc || undefined}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onMouseEnter={(e) => {
                    try {
                      e.currentTarget.currentTime = 0;
                      const p = e.currentTarget.play();
                      if (p && typeof (p as any).then === 'function') {
                        (p as any).catch(() => {});
                      }
                    } catch {}
                  }}
                  onMouseLeave={(e) => {
                    try {
                      e.currentTarget.pause();
                      e.currentTarget.load();
                    } catch {}
                  }}
                />
              ) : showYouTubePlayer ? (
                <YouTubeVideoPlayer
                  videoUrl={tpl.video}
                  title={tpl.name}
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                />
              ) : thumbnailSrc ? (
                <img
                  src={thumbnailSrc}
                  alt={tpl.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                  No Preview
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 p-4 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                  {tpl.subcategory?.name || tpl.category?.name || "Premium"}
                </span>
              </div>
              <h3 className="text-base font-semibold text-zinc-900 leading-tight line-clamp-2 md:line-clamp-1 group-hover:text-violet-600 transition-colors">
                {tpl.name}
              </h3>
            </div>
          </div>
        </Link>
      </div>
    );
  };

  const renderTemplateCard = (tpl: LatestTemplate) => {
    return (
      <TemplateCardComponent
        key={tpl.slug}
        tpl={tpl}
        isSubscribed={isSubscribed}
        handleDownload={handleDownload}
      />
    );
  };

  return (
    <section className="relative w-full py-16 bg-white overflow-hidden">
      <div className="relative max-w-[1440px] mx-auto px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-zinc-900 mb-2">
              Latest Arrivals
            </h2>
            <p className="text-zinc-500 text-lg">
              Fresh templates added this week
            </p>
          </div>
          <Link
            href="/templates"
            className="inline-flex items-center gap-2 text-violet-600 font-medium hover:text-violet-700 transition-colors group"
          >
            View All <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="relative">
          {/* Navigation Controls */}
          <button
            aria-label="Scroll left"
            onClick={() => scrollLatest(-360)}
            className="hidden lg:flex absolute -left-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white text-zinc-700 shadow-md border border-zinc-100 hover:bg-zinc-50 items-center justify-center focus:outline-none transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            aria-label="Scroll right"
            onClick={() => scrollLatest(360)}
            className="hidden lg:flex absolute -right-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white text-zinc-700 shadow-md border border-zinc-100 hover:bg-zinc-50 items-center justify-center focus:outline-none transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div
            ref={latestListRef}
            className="flex gap-6 overflow-x-auto snap-x py-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] group"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {latest.map((tpl) => (
              <Fragment key={tpl.slug}>
                {renderTemplateCard(tpl)}
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

