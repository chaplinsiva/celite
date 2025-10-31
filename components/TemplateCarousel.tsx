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
      className="min-w-[85vw] sm:min-w-[350px] md:min-w-0 bg-zinc-900 rounded-2xl shadow-lg p-3 sm:p-4 flex flex-col items-center snap-center transition-all duration-200 relative"
      onMouseEnter={() => handleMouseEnter(tpl.slug)}
      onMouseLeave={() => handleMouseLeave(tpl.slug)}
    >
      {hasActiveLimitedOffer && (
        <div className="absolute top-3 left-3 z-20 bg-white text-black px-2 py-1 rounded-lg text-xs font-semibold border border-black/20">
          LIMITED
        </div>
      )}
      <div className="relative w-full h-40 sm:h-48 md:h-40 rounded-xl mb-3 sm:mb-4 overflow-hidden">
        <img
          src={tpl.img}
          alt={tpl.name}
          className="absolute inset-0 w-full h-full object-cover rounded-xl transition-opacity duration-200"
          style={{ opacity: hovered === tpl.slug && tpl.video ? 0 : 1 }}
        />
        {tpl.video && (
          <video
            ref={(el) => { videoRefs.current[tpl.slug] = el; }}
            src={tpl.video}
            poster={tpl.img}
            playsInline
            muted={(mutedMap[tpl.slug] ?? true)}
            preload="metadata"
            className={`absolute inset-0 w-full h-full object-cover rounded-xl transition-opacity duration-200 ${hovered === tpl.slug ? 'opacity-100' : 'opacity-0'}`}
          >
            Sorry, your browser does not support embedded videos.
          </video>
        )}
        {hovered === tpl.slug && tpl.video && (
          <button
            aria-label={(mutedMap[tpl.slug] ?? true) ? 'Unmute audio' : 'Mute audio'}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleMute(tpl.slug); }}
            className="absolute bottom-2 right-2 bg-black/70 text-white rounded-full w-9 h-9 flex items-center justify-center"
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
      <h3 className="text-base sm:text-lg font-semibold text-white mb-1 text-center">{tpl.name}</h3>
      {hasActiveLimitedOffer && (
        <div className="mb-2 text-xs text-white font-medium text-center">
          {isSubscribed ? (
            'Only for Subscribed Users'
          ) : (
            tpl.daysRemaining !== undefined && `${tpl.daysRemaining} ${tpl.daysRemaining === 1 ? 'day' : 'days'} remaining`
          )}
        </div>
      )}
      {isSubscribed ? (
        <div className="flex gap-2 w-full">
          <Link href={`/product/${tpl.slug}`} className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-white text-black font-medium hover:bg-zinc-200 transition text-center">View</Link>
          <button
            onClick={() => handleDownload(tpl.slug)}
            className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-black text-white font-medium border border-white/20 hover:bg-zinc-800 transition text-center"
          >
            Download
          </button>
        </div>
      ) : (
        <Link href={`/product/${tpl.slug}`} className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm rounded-full bg-white text-black font-medium shadow hover:bg-zinc-200 transition text-center">View Template</Link>
      )}
    </div>
    );
  };

  return (
    <>
      <section className="w-full max-w-7xl mx-auto px-1 sm:px-4 md:px-8 py-10 sm:py-14">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6 sm:mb-8 text-center">Featured After Effects Templates</h2>
        <div className="relative">
          {/* Overlay controls with spacing, not covering cards */}
          <button aria-label="Scroll left" onClick={() => scrollFeatured(-360)}
            className="hidden md:flex absolute -left-6 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-zinc-800/80 text-white hover:bg-zinc-700/90 shadow-lg items-center justify-center focus:outline-none">
            <svg width="20" height="20" viewBox="0 0 20 20"><path d="M12.7 5.3a1 1 0 0 0-1.4 0l-4 4a1 1 0 0 0 0 1.4l4 4a1 1 0 1 0 1.4-1.4L9.42 10l3.3-3.3a1 1 0 0 0 0-1.4z" fill="currentColor"/></svg>
          </button>
          <button aria-label="Scroll right" onClick={() => scrollFeatured(360)}
            className="hidden md:flex absolute -right-6 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-zinc-800/80 text-white hover:bg-zinc-700/90 shadow-lg items-center justify-center focus:outline-none">
            <svg width="20" height="20" viewBox="0 0 20 20"><path d="M7.3 14.7a1 1 0 0 1 0-1.4l3.3-3.3-3.3-3.3a1 1 0 1 1 1.4-1.4l4 4a1 1 0 0 1 0 1.4l-4 4a1 1 0 0 1-1.4 0z" fill="currentColor"/></svg>
          </button>
          <div
            ref={featuredListRef}
            className="flex gap-5 sm:gap-7 overflow-x-auto md:overflow-x-visible snap-x md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-7 px-1 sm:px-2 scrollbar-thin scrollbar-thumb-zinc-800"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {featured.map((tpl) => (
              <Fragment key={tpl.slug}>
                {renderTemplateCard(tpl)}
              </Fragment>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
