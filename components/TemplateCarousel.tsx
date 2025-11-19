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
import { GlowingEffect } from './ui/glowing-effect';
import { cn } from '@/lib/utils';
import { Button } from './ui/neon-button';
import { Liquid } from './ui/button-1';

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
      
      // Check subscription status
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

      // Load featured templates with category/subcategory
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
      
      // Log for debugging: show how many templates were found
      if (templateError) {
        console.error('Error loading templates:', templateError);
      } else {
        console.log(`[TemplateCarousel] Loaded ${data?.length || 0} templates`);
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
      
      // Check if response is JSON (redirect to external URL)
      const contentType = res.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const json = await res.json();
        if (json.redirect && json.url) {
          // Redirect to external drive link
          window.open(json.url, '_blank');
          return;
        }
        return; // If it's JSON but no redirect, return early
      }
      
      // Otherwise, download as blob (Supabase storage file)
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
        <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-white/10 p-2 md:rounded-[1.5rem] md:p-3">
          <GlowingEffect
            spread={40}
            glow={true}
            disabled={false}
            proximity={64}
            inactiveZone={0.01}
            borderWidth={3}
          />
          <div className="relative flex h-full flex-col overflow-hidden rounded-xl border-[0.75px] border-white/10 bg-black/40 backdrop-blur-sm p-3 shadow-sm dark:shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)]">
            <Link href={`/product/${tpl.slug}`} className="absolute inset-0 z-10" aria-label={tpl.name} />
            <div className="relative w-full h-32 sm:h-36 md:h-32 rounded-lg mb-2 overflow-hidden pointer-events-none">
              {tpl.video ? (
                <YouTubeVideoPlayer 
                  videoUrl={tpl.video}
                  title={tpl.name}
                  className="w-full h-full"
                />
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5 flex-1 relative z-0">
              <h3 className="text-sm font-semibold text-white text-center leading-tight line-clamp-2">{tpl.name}</h3>
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
    <section className="relative w-full pt-20 sm:pt-24 md:pt-28 pb-12 sm:pb-16 md:pb-20 overflow-hidden bg-black">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Section Header */}
        <div className="text-center mb-8 space-y-4">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3">
            Premium <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">After Effects Templates</span>
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Discover our handpicked collection of professional templates designed to elevate your creative projects
          </p>
          <div className="flex justify-center">
            <Link
              href="/templates?filter=featured"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/20 text-white text-sm font-semibold hover:bg-white/10 transition-colors"
            >
              View featured templates
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-white/70">
                <path d="M7.5 5l4.5 5-4.5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>

        <div className="relative">
          {/* Navigation Controls */}
          <button 
            aria-label="Scroll left" 
            onClick={() => scrollFeatured(-360)}
            className="hidden lg:flex absolute -left-12 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-black/80 backdrop-blur-sm text-white hover:bg-white/10 shadow-xl border-[0.75px] border-white/20 hover:border-white/30 transition-all duration-300 items-center justify-center focus:outline-none group"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" className="group-hover:-translate-x-0.5 transition-transform">
              <path d="M12.7 5.3a1 1 0 0 0-1.4 0l-4 4a1 1 0 0 0 0 1.4l4 4a1 1 0 1 0 1.4-1.4L9.42 10l3.3-3.3a1 1 0 0 0 0-1.4z" fill="currentColor"/>
            </svg>
          </button>
          <button 
            aria-label="Scroll right" 
            onClick={() => scrollFeatured(360)}
            className="hidden lg:flex absolute -right-12 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-black/80 backdrop-blur-sm text-white hover:bg-white/10 shadow-xl border-[0.75px] border-white/20 hover:border-white/30 transition-all duration-300 items-center justify-center focus:outline-none group"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" className="group-hover:translate-x-0.5 transition-transform">
              <path d="M7.3 14.7a1 1 0 0 1 0-1.4l3.3-3.3-3.3-3.3a1 1 0 1 1 1.4-1.4l4 4a1 1 0 0 1 0 1.4l-4 4a1 1 0 0 1-1.4 0z" fill="currentColor"/>
            </svg>
          </button>
          <div
            ref={featuredListRef}
            className="flex gap-4 overflow-x-auto snap-x py-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
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
