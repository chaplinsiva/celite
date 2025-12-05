'use client';
import { useEffect, useRef, useState, Fragment } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Template } from '../data/templateData';
import { getSupabaseBrowserClient } from '../lib/supabaseClient';
import { useAppContext } from '../context/AppContext';
import { useLoginModal } from '../context/LoginModalContext';
import { getYouTubeEmbedUrl } from '../lib/utils';
import YouTubeVideoPlayer from './YouTubeVideoPlayer';
import { cn } from '@/lib/utils';
import { ArrowRight, ChevronLeft, ChevronRight, Zap } from 'lucide-react';

type FeaturedTemplate = Template & {
  category?: { id: string; name: string; slug: string } | null;
  subcategory?: { id: string; name: string; slug: string } | null;
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
          slug,name,subtitle,description,img,video,features,software,plugins,tags,created_at,feature,
          category_id,subcategory_id,
          categories(id,name,slug),
          subcategories(id,name,slug)
        `)
        .eq('feature', true)
        .order('updated_at', { ascending: false });

      if ((!data || data.length === 0) && !templateError) {
        const fallback = await supabase
          .from('templates')
          .select(`
            slug,name,subtitle,description,img,video,features,software,plugins,tags,created_at,feature,
            category_id,subcategory_id,
            categories(id,name,slug),
            subcategories(id,name,slug)
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

        const template: FeaturedTemplate = {
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
          category: category ? { id: category.id, name: category.name, slug: category.slug } : null,
          subcategory: subcategory ? { id: subcategory.id, name: subcategory.name, slug: subcategory.slug } : null,
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

  const TemplateCardComponent = ({ tpl, isSubscribed, handleDownload }: { tpl: FeaturedTemplate; isSubscribed: boolean; handleDownload: (slug: string) => void }) => {
    return (
      <div className="flex-shrink-0 w-full md:w-[calc(50%-0.75rem)] lg:w-[calc(25%-0.75rem)] snap-center">
        <div className="relative h-full group">
          <div className="relative flex h-full flex-col overflow-hidden rounded-2xl bg-white border border-zinc-200 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
            <Link href={`/product/${tpl.slug}`} className="absolute inset-0 z-10" aria-label={tpl.name} />
            <div className="relative w-full aspect-video overflow-hidden">
              {tpl.video ? (
                <YouTubeVideoPlayer
                  videoUrl={tpl.video}
                  title={tpl.name}
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                  No Preview
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 p-4 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {tpl.subcategory?.name || tpl.category?.name || "Featured"}
                </span>
              </div>
              <h3 className="text-base font-semibold text-zinc-900 leading-tight line-clamp-2 md:line-clamp-1 group-hover:text-blue-600 transition-colors">
                {tpl.name}
              </h3>
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
            href="/templates?filter=featured"
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
