'use client';
import { useEffect, useRef, useState, Fragment } from 'react';
import Link from 'next/link';
import type { Template } from '../data/templateData';
import { getSupabaseBrowserClient } from '../lib/supabaseClient';
import { useAppContext } from '../context/AppContext';
import { useLoginModal } from '../context/LoginModalContext';
import { convertR2UrlToCdn } from '../lib/utils';
import VideoThumbnailPlayer from './VideoThumbnailPlayer';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

type LatestTemplate = Template & {
  category?: { id: string; name: string; slug: string } | null;
  subcategory?: { id: string; name: string; slug: string } | null;
  video_path?: string | null;
  thumbnail_path?: string | null;
};

export default function LatestTemplatesCarousel() {
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
          slug,name,subtitle,description,img,video_path,thumbnail_path,features,software,plugins,tags,created_at,feature,
          category_id,subcategory_id,
          categories(id,name,slug),
          subcategories(id,name,slug)
        `)
        .order('created_at', { ascending: false })
        .limit(16);

      // Exclude Music & SFX, Stock Photos, and 3D Models categories
      const musicSfxCategoryId = '45456b94-cb11-449b-ab99-f0633d6e8848';
      const stockPhotoCategoryId = 'ba7f68c3-6f0f-4a29-a337-3b2cef7b4f47';
      const filteredData = (data ?? []).filter((t: any) => {
        const category = t.categories ? (Array.isArray(t.categories) ? t.categories[0] : t.categories) : null;
        if (!category) return true;
        // Exclude Music & SFX
        if (category.id === musicSfxCategoryId || category.slug === 'musics-and-sfx') return false;
        // Exclude Stock Photos
        if (category.id === stockPhotoCategoryId || category.slug === 'stock-images' || category.slug === 'stock-photos' || category.name?.toLowerCase().includes('stock photo') || category.name?.toLowerCase().includes('stock image')) return false;
        // Exclude 3D Models
        if (category.slug === '3d-models' || category.slug === '3d-models' || (category.name?.toLowerCase().includes('3d') && category.name?.toLowerCase().includes('model'))) return false;
        return true;
      });

      if (templateError) {
        console.error('Error loading latest templates:', templateError);
      } else {
        console.log(`[LatestTemplatesCarousel] Loaded ${data?.length || 0} templates`);
      }

      const mapped: LatestTemplate[] = filteredData.map((r: any) => {
        const category = r.categories ? (Array.isArray(r.categories) ? r.categories[0] : r.categories) : null;
        const subcategory = r.subcategories ? (Array.isArray(r.subcategories) ? r.subcategories[0] : r.subcategories) : null;
        const isFeaturedFlag = Boolean(r.feature ?? r.is_featured ?? r.isFeatured);

        const template: LatestTemplate = {
          slug: r.slug,
          name: r.name,
          subtitle: r.subtitle,
          desc: r.description ?? '',
          price: 0,
          img: r.img,
          video: r.video_path ?? null,
          video_path: r.video_path,
          thumbnail_path: r.thumbnail_path,
          features: r.features ?? [],
          software: r.software ?? [],
          plugins: r.plugins ?? [],
          tags: r.tags ?? [],
          feature: isFeaturedFlag,
          isFeatured: isFeaturedFlag,
          is_featured: isFeaturedFlag,
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

      const json = await res.json();

      // Handle redirect URL (signed URL for direct download)
      if (json.redirect && json.url) {
        window.location.href = json.url;
        return;
      }

      // Handle errors
      if (json.error) {
        console.error('Download failed:', json.error);
      }
    } catch (e) {
      console.error('Download failed:', e);
    }
  };

  const TemplateCardComponent = ({ tpl, isSubscribed, handleDownload }: { tpl: LatestTemplate; isSubscribed: boolean; handleDownload: (slug: string) => void }) => {
    return (
      <div className="flex-shrink-0 w-full md:w-[calc(50%-0.75rem)] lg:w-[calc(25%-0.75rem)] snap-center">
        <Link href={`/product/${tpl.slug}`} className="block relative group">
          <div className="relative min-h-[200px] max-h-[350px] h-auto overflow-hidden rounded-xl bg-zinc-900 flex items-center justify-center">
            {/* Video/Image */}
            {tpl.video_path ? (
              <VideoThumbnailPlayer
                videoUrl={tpl.video_path}
                thumbnailUrl={tpl.thumbnail_path || tpl.img || undefined}
                title={tpl.name}
                className="w-full h-full min-h-[200px]"
              />
            ) : (
              <div className="w-full h-full min-h-[200px] bg-zinc-100 flex items-center justify-center text-zinc-400">
                {tpl.img ? (
                  <img src={convertR2UrlToCdn(tpl.img) || tpl.img} alt={tpl.name} className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  'No Preview'
                )}
              </div>
            )}

            {/* Hover Overlay with Info */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            {/* Bottom Info - Shows on Hover */}
            <div className="absolute bottom-0 left-0 right-12 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none z-20">
              {/* Category Badge */}
              <span className="inline-block text-[10px] font-medium text-white/80 bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full mb-1.5">
                {tpl.subcategory?.name || tpl.category?.name || "Premium"}
              </span>
              {/* Template Name */}
              <h3 className="text-white text-sm font-semibold line-clamp-1 drop-shadow-lg">
                {tpl.name}
              </h3>
            </div>

            {/* Software Badge - Always visible */}
            {tpl.software?.includes('After Effects') && (
              <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded text-[9px] font-bold text-white uppercase tracking-wider">
                Ae
              </div>
            )}
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
            href="/video-templates"
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

