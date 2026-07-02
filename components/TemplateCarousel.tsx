'use client';
import { useEffect, useRef, useState, Fragment } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Template } from '../data/templateData';
import { getSupabaseBrowserClient } from '../lib/supabaseClient';
import { useAppContext } from '../context/AppContext';
import { useLoginModal } from '../context/LoginModalContext';
import { convertR2UrlToCdn } from '../lib/utils';
import VideoThumbnailPlayer from './VideoThumbnailPlayer';
import { cn } from '@/lib/utils';
import { ArrowRight, ChevronLeft, ChevronRight, Zap, PlayCircle, Check, Download } from 'lucide-react';

type FeaturedTemplate = Template & {
  category?: { id: string; name: string; slug: string } | null;
  subcategory?: { id: string; name: string; slug: string } | null;
  video_path?: string | null;
  thumbnail_path?: string | null;
  vendor_name?: string | null;
};

// Helper for thumbnails
const getThumbnail = (item: FeaturedTemplate) => {
  // Show any image, even if low quality
  if (item.thumbnail_path) return item.thumbnail_path;
  if (item.img) return item.img;
  return '/PNG1.png';
};

export default function TemplateCarousel() {
  const router = useRouter();
  const { user } = useAppContext();
  const { openLoginModal } = useLoginModal();
  const featuredListRef = useRef<HTMLDivElement>(null);
  const [featured, setFeatured] = useState<FeaturedTemplate[]>([]);
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

      let { data, error: templateError } = await supabase
        .from('templates')
        .select(`
          slug,name,subtitle,description,img,video_path,thumbnail_path,features,software,plugins,tags,created_at,feature,
          category_id,subcategory_id,
          categories(id,name,slug),
          subcategories(id,name,slug),
          creator_shops(vendor_name)
        `)
        .eq('feature', true)
        .order('updated_at', { ascending: false });

      if ((!data || data.length === 0) && !templateError) {
        const fallback = await supabase
          .from('templates')
          .select(`
            slug,name,subtitle,description,img,video_path,thumbnail_path,features,software,plugins,tags,created_at,feature,
            category_id,subcategory_id,
            categories(id,name,slug),
            subcategories(id,name,slug),
            creator_shops(vendor_name)
          `)
          .order('created_at', { ascending: false })
          .limit(12);
        if (!fallback.error && fallback.data) {
          data = fallback.data;
        }
      }

      if (templateError) {
        console.error('Error loading templates:', templateError);
      }

      const mapped: FeaturedTemplate[] = (data ?? []).map((r: any) => {
        const category = r.categories ? (Array.isArray(r.categories) ? r.categories[0] : r.categories) : null;
        const subcategory = r.subcategories ? (Array.isArray(r.subcategories) ? r.subcategories[0] : r.subcategories) : null;
        const isFeaturedFlag = Boolean(r.feature ?? r.is_featured ?? r.isFeatured);
        const creatorShop = r.creator_shops ? (Array.isArray(r.creator_shops) ? r.creator_shops[0] : r.creator_shops) : null;
        const vendorName = creatorShop?.vendor_name || null;

        const template: FeaturedTemplate = {
          slug: r.slug,
          name: r.name,
          subtitle: r.subtitle,
          desc: r.description ?? '',
          price: 0,
          img: r.img,
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
          vendor_name: vendorName,
        };

        return template;
      });
      setFeatured(mapped);
    };
    load();
  }, [user]);

  const scrollFeatured = (offset: number) => {
    if (featuredListRef.current) {
      featuredListRef.current.scrollBy({ left: offset, behavior: 'smooth' });
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

  const TemplateCardComponent = ({ tpl, isSubscribed, handleDownload }: { tpl: FeaturedTemplate; isSubscribed: boolean; handleDownload: (slug: string) => void }) => {
    return (
      <div className="flex-shrink-0 w-full md:w-[calc(50%-0.75rem)] lg:w-[calc(25%-0.75rem)] snap-center">
        <div className="group flex flex-col bg-white rounded-xl overflow-hidden border border-zinc-200 hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300">
          {/* Thumbnail / Video Player */}
          <div className="relative min-h-[180px] max-h-[300px] h-auto overflow-hidden bg-zinc-100 flex items-center justify-center">
            {tpl.video_path ? (
              <VideoThumbnailPlayer
                videoUrl={tpl.video_path}
                thumbnailUrl={getThumbnail(tpl)}
                title={tpl.name}
                className="w-full h-full min-h-[180px]"
              />
            ) : (
              <Link href={`/product/${tpl.slug}`} className="block w-full h-full min-h-[180px] flex items-center justify-center">
                <img
                  src={convertR2UrlToCdn(getThumbnail(tpl)) || getThumbnail(tpl)}
                  alt={tpl.name}
                  className="max-w-full max-h-full object-contain transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-blue-600 shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all">
                    <PlayCircle className="w-6 h-6 fill-current" />
                  </div>
                </div>
              </Link>
            )}

            {/* Badges */}
            <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none z-30">
              {tpl.software && tpl.software.includes('After Effects') && (
                <span className="px-2 py-1 rounded bg-black/60 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-wider">Ae</span>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-4 flex flex-col flex-1 relative z-30 bg-white">
            <Link href={`/product/${tpl.slug}`} className="block">
              <h3 className="font-bold text-zinc-900 text-lg leading-tight mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                {tpl.name}
              </h3>
            </Link>

            <div className="mt-auto flex items-center justify-between pt-4 border-t border-zinc-100">
              <div className="flex items-center gap-2">
                {(() => {
                  const vendor = tpl.vendor_name || "Celite Studios";
                  const initial = vendor.charAt(0).toUpperCase() || "C";
                  return (
                    <>
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">
                        {initial}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-zinc-500">
                          By {vendor}
                        </span>
                        <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                          <Check className="w-2 h-2 text-white" strokeWidth={3} />
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
              <div className="flex items-center gap-3 text-zinc-400">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDownload(tpl.slug);
                  }}
                  className="hover:text-blue-600 transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTemplateCard = (tpl: FeaturedTemplate) => {
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
    <section className="relative w-full py-16 bg-zinc-50 overflow-hidden">
      <div className="relative max-w-[1440px] mx-auto px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-zinc-900 mb-2">
              Premium <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 bg-clip-text text-transparent">After Effects Templates</span>
            </h2>
            <p className="text-zinc-500 text-lg">
              Handpicked templates for professional creators
            </p>
          </div>
          <Link
            href="/video-templates?filter=featured"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-zinc-200 text-zinc-600 text-sm font-semibold hover:bg-zinc-50 transition-colors"
          >
            View Featured <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="relative">
          {/* Navigation Controls */}
          <button
            aria-label="Scroll left"
            onClick={() => scrollFeatured(-360)}
            className="hidden lg:flex absolute -left-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white text-zinc-700 shadow-md border border-zinc-100 hover:bg-zinc-50 items-center justify-center focus:outline-none transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            aria-label="Scroll right"
            onClick={() => scrollFeatured(360)}
            className="hidden lg:flex absolute -right-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white text-zinc-700 shadow-md border border-zinc-100 hover:bg-zinc-50 items-center justify-center focus:outline-none transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div
            ref={featuredListRef}
            className="flex gap-6 overflow-x-auto snap-x py-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] group"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {featured.map((tpl) => (
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
