"use client";

// agent-notes: { ctx: "Celite Market showcase with pure market-exclusive templates, 3 smooth opposite-scrolling rows, and hardware-accelerated 60fps animations", deps: [lib/supabaseClient, lib/utils, lucide-react, components/MarketExclusiveBadge], state: active, last: "dani@2026-09-04" }

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { convertR2UrlToCdn, cn } from '@/lib/utils';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import { ArrowRight, Crown, Play, Sparkles } from 'lucide-react';
import MarketExclusiveBadge from '@/components/MarketExclusiveBadge';

export type MarketTemplate = {
  slug: string;
  name: string;
  subtitle?: string | null;
  img?: string | null;
  video_path?: string | null;
  thumbnail_path?: string | null;
  category_id?: string | null;
  price?: number | string | null;
  available_on_celite_subscription?: boolean | null;
  available_on_celite_market?: boolean | null;
};

function VideoCard({ template }: { template: MarketTemplate }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const thumbnail: string =
    (template.thumbnail_path && convertR2UrlToCdn(template.thumbnail_path)) ||
    (template.img && convertR2UrlToCdn(template.img)) ||
    '/placeholder.jpg';

  const videoUrl = template.video_path ? convertR2UrlToCdn(template.video_path) : null;

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (videoRef.current && videoUrl) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const displayPrice = template.price ? `₹${Number(template.price)}` : null;

  return (
    <Link
      href={`/product/${template.slug}`}
      className="group relative flex-shrink-0 w-[280px] sm:w-[320px] md:w-[360px] overflow-hidden rounded-2xl bg-[#0c0e15] aspect-[16/9] shadow-lg transition-transform duration-300 hover:scale-[1.02] select-none flex flex-col justify-end border border-amber-500/25 hover:border-amber-400/80 hover:shadow-[0_0_35px_-5px_rgba(245,158,11,0.35)]"
      style={{ contain: 'content' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Top Floating Amber Border Glow on Hover */}
      <div className="absolute top-0 inset-x-0 h-[1.5px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-30 bg-gradient-to-r from-transparent via-amber-400/90 to-transparent" />

      {/* Market Crown Badge with Price in Top-Left */}
      <div className="absolute top-3 left-3 z-20 pointer-events-none">
        <MarketExclusiveBadge variant="card" price={template.price} />
      </div>

      {/* Play Icon Indicator on hover */}
      {videoUrl && (
        <div className="absolute top-3 right-3 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/60 backdrop-blur-md border border-amber-400/40 text-amber-300 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-md">
          <Play className="w-3 sm:w-3.5 h-3 sm:h-3.5 fill-current ml-0.5" />
        </div>
      )}

      {/* Thumbnail Image */}
      <img
        src={thumbnail}
        alt={template.name}
        loading="lazy"
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
          isHovered && isLoaded && videoUrl ? 'opacity-0' : 'opacity-90 group-hover:opacity-100'
        }`}
      />

      {/* Video Element */}
      {videoUrl && (
        <video
          ref={videoRef}
          src={videoUrl}
          muted
          loop
          playsInline
          preload="none"
          onLoadedData={() => setIsLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            isHovered && isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* Bottom Info Gradient Scrim */}
      <div className="relative z-10 p-3 bg-gradient-to-t from-[#08090f]/95 via-[#08090f]/80 to-transparent">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-white text-xs sm:text-sm font-semibold truncate drop-shadow-sm group-hover:text-amber-200 transition-colors">
              {template.name}
            </p>
            <p className="text-[10px] sm:text-[11px] font-bold text-amber-300 truncate mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
              Market Exclusive • Pay Per Item
            </p>
          </div>
          {displayPrice && (
            <span className="flex-shrink-0 text-[11px] font-black px-2 py-0.5 rounded bg-amber-400/20 border border-amber-400/40 text-amber-300">
              {displayPrice}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function MarketTemplatesShowcase({
  initialTemplates,
}: {
  initialTemplates?: MarketTemplate[];
} = {}) {
  // Filter out any subscription templates to strictly show market exclusives
  const filterExclusives = (list?: MarketTemplate[]) =>
    (list || []).filter((t) => t.available_on_celite_subscription === false);

  const [templates, setTemplates] = useState<MarketTemplate[]>(filterExclusives(initialTemplates));
  const [loading, setLoading] = useState(!initialTemplates || initialTemplates.length === 0);

  useEffect(() => {
    if (initialTemplates && initialTemplates.length > 0) {
      setTemplates(filterExclusives(initialTemplates));
      setLoading(false);
      return;
    }

    const loadMarketTemplates = async () => {
      try {
        const supabase = getSupabaseBrowserClient();

        // Strictly fetch market exclusive templates (available_on_celite_subscription = false)
        const { data, error } = await supabase
          .from('templates')
          .select(`
            slug,
            name,
            subtitle,
            img,
            video_path,
            thumbnail_path,
            category_id,
            price,
            available_on_celite_subscription,
            available_on_celite_market
          `)
          .eq('status', 'approved')
          .eq('available_on_celite_subscription', false)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading market exclusive templates:', error);
          setTemplates([]);
        } else {
          setTemplates(data || []);
        }
      } catch (err) {
        console.error('Error in MarketTemplatesShowcase:', err);
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    };

    loadMarketTemplates();
  }, [initialTemplates]);

  if (loading) {
    return (
      <section className="relative w-full py-12 md:py-16 px-4 sm:px-6 bg-[#08090f]">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="aspect-[16/9] bg-zinc-900/80 rounded-2xl animate-pulse border border-amber-500/10"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!templates || templates.length === 0) {
    return null;
  }

  // Distribute market exclusive templates across 3 distinct rows
  const row1Templates: MarketTemplate[] = [];
  const row2Templates: MarketTemplate[] = [];
  const row3Templates: MarketTemplate[] = [];

  templates.forEach((t, i) => {
    if (i % 3 === 0) row1Templates.push(t);
    else if (i % 3 === 1) row2Templates.push(t);
    else row3Templates.push(t);
  });

  // Ensure each row has plenty of duplicated items for a seamless gapless infinite loop
  const buildDisplayList = (items: MarketTemplate[]) => {
    if (items.length === 0) return [];
    if (items.length <= 4) {
      return [...items, ...items, ...items, ...items, ...items, ...items, ...items, ...items];
    }
    return [...items, ...items, ...items, ...items];
  };

  const row1Display = buildDisplayList(row1Templates);
  const row2Display = buildDisplayList(row2Templates);
  const row3Display = buildDisplayList(row3Templates);

  return (
    <section className="relative w-full py-12 md:py-20 bg-gradient-to-br from-[#0e0f17] via-[#090a10] to-[#06070a] border-y border-amber-500/20 shadow-[0_0_60px_-15px_rgba(245,158,11,0.12)] overflow-hidden">
      
      {/* Hardware-Accelerated Keyframes for Butter-Smooth 60fps Scrolling */}
      <style>{`
        @keyframes celiteMarketScrollLeft {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }
        @keyframes celiteMarketScrollRight {
          0% {
            transform: translate3d(-50%, 0, 0);
          }
          100% {
            transform: translate3d(0, 0, 0);
          }
        }
        .celite-market-track-left-1 {
          display: flex;
          gap: 1.25rem;
          width: max-content;
          animation: celiteMarketScrollLeft 52s linear infinite;
          transform: translate3d(0, 0, 0);
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          will-change: transform;
        }
        .celite-market-track-right-2 {
          display: flex;
          gap: 1.25rem;
          width: max-content;
          animation: celiteMarketScrollRight 58s linear infinite;
          transform: translate3d(0, 0, 0);
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          will-change: transform;
        }
        .celite-market-track-left-3 {
          display: flex;
          gap: 1.25rem;
          width: max-content;
          animation: celiteMarketScrollLeft 48s linear infinite;
          transform: translate3d(0, 0, 0);
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          will-change: transform;
        }
        .celite-market-track-left-1:hover,
        .celite-market-track-right-2:hover,
        .celite-market-track-left-3:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* Top Floating Amber Hairline Accent */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/50 to-transparent pointer-events-none" />

      {/* Ambient Radial Lighting */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-amber-500/10 rounded-full blur-[110px]" />
        <div className="absolute top-1/2 -right-24 w-96 h-96 bg-yellow-500/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-24 left-1/4 w-80 h-80 bg-amber-600/10 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-[1400px] mx-auto relative z-10 px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 md:mb-10 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-amber-500/10 backdrop-blur-md border border-amber-400/30 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                <Crown className="w-5 h-5 text-amber-400 fill-amber-400/20" />
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-[900] text-white tracking-tight drop-shadow-md">
                Celite Market Exclusives
              </h2>
            </div>
            <p className="text-zinc-300 text-sm md:text-base max-w-xl font-normal">
              Exclusive pay-per-item templates crafted by top creators. Not included in subscription — direct lifetime commercial license.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden lg:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-950/40 border border-amber-500/20 text-amber-300 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>Hover over any template to pause &amp; play</span>
            </div>
            <Link
              href="/templates"
              className="inline-flex items-center gap-2 text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors group whitespace-nowrap"
            >
              <span>Explore Celite Market</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* 3 Smooth Infinite Scrolling Rows in Opposite Directions with Feathered Edge Masks */}
      <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent_0%,black_4%,black_96%,transparent_100%)] flex flex-col gap-4 sm:gap-5 py-2">
        {/* Row 1: Scrolling Left */}
        {row1Display.length > 0 && (
          <div className="celite-market-track-left-1">
            {row1Display.map((template, index) => (
              <VideoCard key={`r1-${template.slug}-${index}`} template={template} />
            ))}
          </div>
        )}

        {/* Row 2: Scrolling Right (Opposite Direction!) */}
        {row2Display.length > 0 && (
          <div className="celite-market-track-right-2">
            {row2Display.map((template, index) => (
              <VideoCard key={`r2-${template.slug}-${index}`} template={template} />
            ))}
          </div>
        )}

        {/* Row 3: Scrolling Left (Opposite to Row 2!) */}
        {row3Display.length > 0 && (
          <div className="celite-market-track-left-3">
            {row3Display.map((template, index) => (
              <VideoCard key={`r3-${template.slug}-${index}`} template={template} />
            ))}
          </div>
        )}
      </div>

      {/* Mobile Action Link */}
      <div className="sm:hidden mt-8 text-center px-4">
        <Link
          href="/templates"
          className="inline-flex items-center gap-2 text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors"
        >
          <span>Explore Celite Market</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
