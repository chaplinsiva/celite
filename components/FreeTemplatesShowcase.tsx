'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { convertR2UrlToCdn } from '@/lib/utils';
import { ArrowRight, ChevronLeft, ChevronRight, Gift } from 'lucide-react';

type FreeTemplate = {
  slug: string;
  name: string;
  subtitle?: string;
  img?: string;
  video_path?: string;
  thumbnail_path?: string;
  category?: { id: string; name: string; slug: string } | null;
};

function VideoCard({ template }: { template: FreeTemplate }) {
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

  return (
    <Link
      href={`/product/${template.slug}`}
      className="group relative flex-shrink-0 w-[280px] sm:w-[320px] md:w-[340px] overflow-hidden rounded-2xl bg-zinc-900 aspect-[16/9] shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-[1.03] snap-start"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* FREE Badge */}
      <div className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-lg bg-emerald-500 text-white text-[11px] font-bold uppercase tracking-wider shadow-lg flex items-center gap-1">
        <Gift className="w-3 h-3" />
        Free
      </div>

      {/* Thumbnail Image */}
      <img
        src={thumbnail}
        alt={template.name}
        loading="lazy"
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
          isHovered && isLoaded && videoUrl ? 'opacity-0' : 'opacity-100'
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

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

      {/* Title */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
        <h3 className="text-sm md:text-base font-bold text-white line-clamp-2 drop-shadow-lg">
          {template.name}
        </h3>
        {template.subtitle && (
          <p className="text-xs md:text-sm text-zinc-300 line-clamp-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {template.subtitle}
          </p>
        )}
      </div>
    </Link>
  );
}

export default function FreeTemplatesShowcase({
  initialTemplates,
}: {
  initialTemplates?: FreeTemplate[];
}) {
  const [templates] = useState<FreeTemplate[]>(initialTemplates || []);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollButtons = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      updateScrollButtons();
      el.addEventListener('scroll', updateScrollButtons, { passive: true });
      // Also check on resize
      const resizeObserver = new ResizeObserver(updateScrollButtons);
      resizeObserver.observe(el);
      return () => {
        el.removeEventListener('scroll', updateScrollButtons);
        resizeObserver.disconnect();
      };
    }
  }, [templates]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const cardWidth = 360; // approximate card width + gap
      const offset = direction === 'left' ? -cardWidth : cardWidth;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  if (templates.length === 0) {
    return null;
  }

  return (
    <section className="relative w-full py-12 md:py-16 px-4 sm:px-6 bg-gradient-to-br from-emerald-950/80 via-zinc-950 to-zinc-950 border-y border-emerald-900/40 overflow-hidden">
      
      {/* Glow effect for the banner */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-600/20 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-[1400px] mx-auto relative z-10">
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <Gift className="w-5 h-5 text-emerald-400" />
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight">
                Free Templates
              </h2>
            </div>
            <p className="text-zinc-400 text-sm md:text-base max-w-lg">
              Download premium quality video templates for free. No subscription required.
            </p>
          </div>
          <Link
            href="/video-templates?free=true"
            className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors group whitespace-nowrap"
          >
            See all free templates
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Carousel */}
        <div className="relative group/carousel">
          {/* Left Arrow */}
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              aria-label="Scroll left"
              className="absolute -left-2 sm:left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          )}

          {/* Right Arrow */}
          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              aria-label="Scroll right"
              className="absolute -right-2 sm:right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          )}

          {/* Scrollable Row */}
          <div
            ref={scrollRef}
            className="flex gap-4 md:gap-5 overflow-x-auto snap-x snap-mandatory py-2 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {templates.map((template) => (
              <VideoCard key={template.slug} template={template} />
            ))}
          </div>
        </div>

        {/* Mobile "See All" Link */}
        <div className="sm:hidden mt-6 text-center">
          <Link
            href="/video-templates?free=true"
            className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            See all free templates
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
