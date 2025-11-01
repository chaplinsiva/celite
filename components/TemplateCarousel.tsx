'use client';
import { useEffect, useRef, useState, Fragment } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Template } from '../data/templateData';
import { getSupabaseBrowserClient } from '../lib/supabaseClient';
import { useAppContext } from '../context/AppContext';
import { useLoginModal } from '../context/LoginModalContext';

type FeaturedTemplate = Template & {
  is_limited_offer?: boolean;
  limited_offer_duration_days?: number | null;
  limited_offer_start_date?: string | null;
  daysRemaining?: number;
  hasActiveLimitedOffer?: boolean;
};

export default function TemplateCarousel() {
  const router = useRouter();
  const { user } = useAppContext();
  const { openLoginModal } = useLoginModal();
  const featuredListRef = useRef<HTMLDivElement>(null);
  const [featured, setFeatured] = useState<FeaturedTemplate[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const [hovered, setHovered] = useState<string | null>(null);
  const [mutedMap, setMutedMap] = useState<Record<string, boolean>>({});

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

      // Load featured templates with limited offer info
      const { data } = await supabase
        .from('templates')
        .select('slug,name,subtitle,description,price,img,video,features,software,plugins,tags,is_featured,is_limited_offer,limited_offer_duration_days,limited_offer_start_date')
        .eq('is_featured', true)
        .limit(8);
      
      const now = new Date();
      const mapped: FeaturedTemplate[] = (data ?? []).map((r: any) => {
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

  const handleMouseEnter = (slug: string) => {
    setHovered(slug);
    const vid = videoRefs.current[slug];
    if (vid) {
      vid.currentTime = 0;
      const isMuted = mutedMap[slug] ?? true;
      vid.muted = isMuted;
      const p = vid.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }
  };

  const handleMouseLeave = (slug: string) => {
    const vid = videoRefs.current[slug];
    if (vid) {
      vid.pause();
      vid.currentTime = 0;
    }
    setHovered((h) => (h === slug ? null : h));
  };

  const toggleMute = (slug: string) => {
    const nextMuted = !(mutedMap[slug] ?? true);
    setMutedMap((m) => ({ ...m, [slug]: nextMuted }));
    const vid = videoRefs.current[slug];
    if (vid) vid.muted = nextMuted;
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
    return (
    <div
      className="group min-w-[85vw] sm:min-w-[350px] md:min-w-0 bg-gradient-to-br from-zinc-950/95 via-zinc-900/95 to-zinc-950/95 rounded-2xl shadow-xl border border-white/10 hover:border-white/30 p-4 sm:p-5 flex flex-col items-center snap-center transition-all duration-300 relative overflow-hidden hover:scale-[1.02] hover:shadow-2xl backdrop-blur-sm"
      onMouseEnter={() => handleMouseEnter(tpl.slug)}
      onMouseLeave={() => handleMouseLeave(tpl.slug)}
    >
      {/* Decorative Gradient Corner */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      {hasActiveLimitedOffer && (
        <div className="absolute top-3 left-3 z-20 bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-black/30 shadow-lg animate-pulse">
          LIMITED
        </div>
      )}
      {/* 16:9 Aspect Ratio Container */}
      <div className="relative w-full aspect-video rounded-xl mb-4 sm:mb-5 overflow-hidden bg-zinc-950 border border-white/5 group-hover:border-white/20 transition-colors">
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-10"></div>
        <img
          src={tpl.img}
          alt={tpl.name}
          className="absolute inset-0 w-full h-full object-cover rounded-xl transition-transform duration-500 ease-out scale-110 group-hover:scale-100"
          style={{ 
            opacity: hovered === tpl.slug && tpl.video ? 0 : 1
          }}
        />
        {tpl.video && (
          <video
            ref={(el) => { videoRefs.current[tpl.slug] = el; }}
            src={tpl.video}
            poster={tpl.img}
            playsInline
            muted={(mutedMap[tpl.slug] ?? true)}
            preload="metadata"
            className={`absolute inset-0 w-full h-full object-cover rounded-xl transition-all duration-500 ease-out scale-110 group-hover:scale-100 ${hovered === tpl.slug ? 'opacity-100' : 'opacity-0'}`}
          >
            Sorry, your browser does not support embedded videos.
          </video>
        )}
        {hovered === tpl.slug && tpl.video && (
          <button
            aria-label={(mutedMap[tpl.slug] ?? true) ? 'Unmute audio' : 'Mute audio'}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleMute(tpl.slug); }}
            className="absolute bottom-3 right-3 z-20 bg-black/80 backdrop-blur-sm text-white rounded-full w-10 h-10 flex items-center justify-center border border-white/20 hover:bg-black/90 hover:scale-110 transition-all duration-200 shadow-lg"
            title={(mutedMap[tpl.slug] ?? true) ? 'Unmute' : 'Mute'}
          >
            {(mutedMap[tpl.slug] ?? true) ? (
              // muted -> show speaker with X
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3z"></path>
                <path d="M16 9l5 5m0-5l-5 5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
              </svg>
            ) : (
              // unmuted -> show speaker with waves
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3z"></path>
                <path d="M16 8a5 5 0 010 8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                <path d="M18 6a8 8 0 010 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
              </svg>
            )}
          </button>
        )}
      </div>
      <h3 className="text-lg sm:text-xl font-bold text-white mb-2 text-center group-hover:text-blue-400 transition-colors">{tpl.name}</h3>
      {hasActiveLimitedOffer && (
        <div className="mb-3 px-3 py-1 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg text-xs text-yellow-300 font-semibold text-center">
          {isSubscribed ? (
            'Free for Subscribers'
          ) : (
            tpl.daysRemaining !== undefined && `${tpl.daysRemaining} ${tpl.daysRemaining === 1 ? 'day' : 'days'} remaining`
          )}
        </div>
      )}
      {isSubscribed ? (
        <div className="flex gap-2 w-full mt-auto">
          <Link 
            href={`/product/${tpl.slug}`} 
            className="flex-1 px-4 py-2.5 text-sm rounded-lg bg-gradient-to-r from-white to-zinc-100 text-black font-semibold hover:from-zinc-100 hover:to-zinc-200 transition-all duration-200 text-center shadow-md hover:shadow-lg"
          >
            View
          </Link>
          <button
            onClick={() => handleDownload(tpl.slug)}
            className="flex-1 px-4 py-2.5 text-sm rounded-lg bg-gradient-to-r from-zinc-800 to-zinc-900 text-white font-semibold border border-white/20 hover:from-zinc-700 hover:to-zinc-800 transition-all duration-200 text-center shadow-md hover:shadow-lg"
          >
            Download
          </button>
        </div>
      ) : (
        <Link 
          href={`/product/${tpl.slug}`} 
          className="w-full sm:w-auto px-6 py-2.5 text-sm rounded-full bg-gradient-to-r from-white to-zinc-100 text-black font-semibold shadow-lg hover:from-zinc-100 hover:to-zinc-200 hover:shadow-xl transition-all duration-200 text-center mt-auto"
        >
          View Template
        </Link>
      )}
      {/* Hover Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-purple-500/5 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"></div>
    </div>
    );
  };

  return (
    <section className="relative w-full py-16 sm:py-20 overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-blue-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <span className="text-sm font-semibold text-blue-400 uppercase tracking-wider">Featured</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Premium After Effects Templates
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
            className="flex gap-6 sm:gap-8 overflow-x-auto md:overflow-x-visible snap-x md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-8 px-1 sm:px-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
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
