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
import { GlowCard } from './ui/spotlight-card';

type FeaturedTemplate = Template & {
  is_limited_offer?: boolean;
  limited_offer_duration_days?: number | null;
  limited_offer_start_date?: string | null;
  daysRemaining?: number;
  hasActiveLimitedOffer?: boolean;
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

      // Load templates with limited offer info and category/subcategory
      // Load more than needed to randomize from a larger pool
      const { data, error: templateError } = await supabase
        .from('templates')
        .select(`
          slug,name,subtitle,description,price,img,video,features,software,plugins,tags,is_featured,
          is_limited_offer,limited_offer_duration_days,limited_offer_start_date,
          category_id,subcategory_id,
          categories(id,name,slug),
          subcategories(id,name,slug)
        `)
        .limit(50); // Load more templates to randomize from
      
      // Log for debugging: show how many templates were found
      if (templateError) {
        console.error('Error loading templates:', templateError);
      } else {
        console.log(`[TemplateCarousel] Loaded ${data?.length || 0} templates`);
      }
      
      // Randomize templates and take 10
      const shuffled = (data ?? []).sort(() => Math.random() - 0.5);
      const randomTemplates = shuffled.slice(0, 10);
      
      const now = new Date();
      const mapped: FeaturedTemplate[] = randomTemplates.map((r: any) => {
        const category = r.categories ? (Array.isArray(r.categories) ? r.categories[0] : r.categories) : null;
        const subcategory = r.subcategories ? (Array.isArray(r.subcategories) ? r.subcategories[0] : r.subcategories) : null;
        
        const template: FeaturedTemplate = {
          slug: r.slug,
          name: r.name,
          subtitle: r.subtitle,
          desc: r.description ?? '',
          price: Number(r.price ?? 0),
          img: r.img,
          video: r.video,
          features: r.features ?? [],
          software: r.software ?? [],
          plugins: r.plugins ?? [],
          tags: r.tags ?? [],
          isFeatured: !!r.is_featured,
          is_limited_offer: !!r.is_limited_offer,
          limited_offer_duration_days: r.limited_offer_duration_days,
          limited_offer_start_date: r.limited_offer_start_date,
          category: category ? { id: category.id, name: category.name, slug: category.slug } : null,
          subcategory: subcategory ? { id: subcategory.id, name: subcategory.name, slug: subcategory.slug } : null,
        };

        // Calculate days remaining if it's a limited offer
        if (r.is_limited_offer && r.limited_offer_start_date && r.limited_offer_duration_days) {
          const startDate = new Date(r.limited_offer_start_date);
          const durationDays = r.limited_offer_duration_days || 0;
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + durationDays);
          
          if (endDate > now) {
            const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
            template.daysRemaining = daysRemaining;
            template.hasActiveLimitedOffer = true;
          } else {
            template.hasActiveLimitedOffer = false;
          }
        } else {
          template.hasActiveLimitedOffer = false;
        }

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

  const renderTemplateCard = (tpl: FeaturedTemplate) => {
    const hasActiveLimitedOffer = !!tpl.hasActiveLimitedOffer;
    const daysRemaining = tpl.daysRemaining;
    return (
    <GlowCard
      glowColor="purple"
      customSize={true}
      className="flex-shrink-0 w-[calc(100%-1rem)] sm:w-[calc(50%-0.75rem)] md:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.33rem)] bg-zinc-900 shadow-lg p-3 sm:p-4 flex flex-col items-center snap-center transition-all duration-200 relative"
    >
      {hasActiveLimitedOffer && (
        <div className="absolute top-3 left-3 z-20 bg-white text-black px-2 py-1 rounded-lg text-xs font-semibold border border-black/20">
          LIMITED
        </div>
      )}
      <div className="relative w-full h-40 sm:h-48 md:h-40 rounded-xl mb-3 sm:mb-4 overflow-hidden">
        {tpl.video ? (
          <YouTubeVideoPlayer 
            videoUrl={tpl.video}
            title={tpl.name}
            className="w-full h-full"
          />
        ) : null}
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-white mb-1 text-center">{tpl.name}</h3>
      {hasActiveLimitedOffer && (
        <div className="mb-2 text-xs text-white font-medium text-center">
          {isSubscribed ? (
            'Only for Subscribed Users'
          ) : (
            daysRemaining !== undefined ? `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining` : ''
          )}
        </div>
      )}
      {isSubscribed ? (
        <div className="flex gap-2 w-full mt-auto">
          <Link 
            href={`/product/${tpl.slug}`} 
            className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-white text-black font-medium hover:bg-zinc-200 transition text-center"
          >
            View
          </Link>
          <button
            onClick={() => handleDownload(tpl.slug)}
            className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-black text-white font-medium border border-white/20 hover:bg-zinc-800 transition text-center"
          >
            Download
          </button>
        </div>
      ) : (
        <Link 
          href={`/product/${tpl.slug}`} 
          className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm rounded-full bg-white text-black font-medium shadow hover:bg-zinc-200 transition text-center"
        >
          View Template
        </Link>
      )}
    </GlowCard>
    );
  };

  return (
    <section className="relative w-full py-20 sm:py-24 md:py-28 overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-blue-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Premium <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">After Effects Templates</span>
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Discover our handpicked collection of professional templates designed to elevate your creative projects
          </p>
        </div>

        <div className="relative">
          {/* Navigation Controls */}
          <button 
            aria-label="Scroll left" 
            onClick={() => scrollFeatured(-360)}
            className="hidden md:flex absolute -left-12 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 text-white hover:from-zinc-700 hover:to-zinc-800 shadow-xl border border-white/10 hover:border-white/20 transition-all duration-300 items-center justify-center focus:outline-none group backdrop-blur-sm"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" className="group-hover:-translate-x-0.5 transition-transform">
              <path d="M12.7 5.3a1 1 0 0 0-1.4 0l-4 4a1 1 0 0 0 0 1.4l4 4a1 1 0 1 0 1.4-1.4L9.42 10l3.3-3.3a1 1 0 0 0 0-1.4z" fill="currentColor"/>
            </svg>
          </button>
          <button 
            aria-label="Scroll right" 
            onClick={() => scrollFeatured(360)}
            className="hidden md:flex absolute -right-12 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 text-white hover:from-zinc-700 hover:to-zinc-800 shadow-xl border border-white/10 hover:border-white/20 transition-all duration-300 items-center justify-center focus:outline-none group backdrop-blur-sm"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" className="group-hover:translate-x-0.5 transition-transform">
              <path d="M7.3 14.7a1 1 0 0 1 0-1.4l3.3-3.3-3.3-3.3a1 1 0 1 1 1.4-1.4l4 4a1 1 0 0 1 0 1.4l-4 4a1 1 0 0 1-1.4 0z" fill="currentColor"/>
            </svg>
          </button>
          <div
            ref={featuredListRef}
            className="flex gap-4 sm:gap-6 md:gap-8 overflow-x-auto snap-x px-4 sm:px-6 md:px-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
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
