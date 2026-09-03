"use client";

// agent-notes: { ctx: "Cinema templates showcase as a huge collage grid with Celite obsidian blue aesthetic", deps: [lib/supabaseClient, lib/utils, lucide-react], state: active, last: "dani@2026-08-15" }

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import { convertR2UrlToCdn } from '@/lib/utils';
import { ArrowRight, Film, Play, Sparkles, Clapperboard, Video, Maximize2 } from 'lucide-react';
import MarketExclusiveBadge from '@/components/MarketExclusiveBadge';

type CinemaTemplate = {
  slug: string;
  name: string;
  subtitle?: string;
  img?: string;
  video_path?: string;
  thumbnail_path?: string;
  category?: { id: string; name: string; slug: string } | null;
  available_on_celite_subscription?: boolean | null;
  available_on_celite_market?: boolean | null;
  price?: number | string | null;
};

type VideoCardProps = {
  template: CinemaTemplate;
  videoUrl: string | null;
  thumbnail: string;
  badgeLabel?: string;
  isLarge?: boolean;
  className?: string;
};

function VideoCard({
  template,
  videoUrl,
  thumbnail,
  badgeLabel = 'Cinema 4K',
  isLarge = false,
  className = '',
}: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

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
      className={`group relative overflow-hidden rounded-2xl bg-[#0a0c13] border border-blue-500/20 hover:border-blue-400/80 shadow-[0_4px_25px_rgba(0,0,0,0.6)] hover:shadow-[0_0_45px_-8px_rgba(59,130,246,0.45)] transition-all duration-500 hover:scale-[1.015] flex flex-col justify-end ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Top Floating Blue Hairline Gradient on Hover */}
      <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-400/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-30" />

      {/* Market Exclusive Crown Badge */}
      {template.available_on_celite_subscription === false && (
        <div className="absolute top-3 right-3 z-30 pointer-events-none">
          <MarketExclusiveBadge variant="card" price={template.price} />
        </div>
      )}

      {/* Center Hover Play Ring */}
      {videoUrl && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-blue-600/80 backdrop-blur-md border border-blue-300/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-300 shadow-[0_0_25px_rgba(59,130,246,0.6)]">
            <Play className="w-5 h-5 fill-current ml-0.5 text-white" />
          </div>
        </div>
      )}

      {/* Thumbnail Image */}
      <img
        src={thumbnail}
        alt={template.name}
        loading="lazy"
        className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-105 ${
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
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            isHovered && isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* Subtle Bottom Ambient Vignette on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </Link>
  );
}

export default function CinemaTemplatesShowcase({
  initialTemplates,
}: {
  initialTemplates?: CinemaTemplate[];
} = {}) {
  const [templates, setTemplates] = useState<CinemaTemplate[]>(initialTemplates || []);
  const [loading, setLoading] = useState(!initialTemplates || initialTemplates.length === 0);

  useEffect(() => {
    if (initialTemplates && initialTemplates.length > 0) {
      setTemplates(initialTemplates);
      setLoading(false);
      return;
    }

    const loadTemplates = async () => {
      try {
        const supabase = getSupabaseBrowserClient();

        // Fetch only from "Movie Templates" sub-subcategory
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
            available_on_celite_market,
            sub_subcategories!inner(id, name, slug)
          `)
          .eq('status', 'approved')
          .eq('sub_subcategories.slug', 'movie-templates')
          .not('video_path', 'is', null)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) {
          console.error('Error loading cinema templates:', error);
          setTemplates([]);
        } else {
          setTemplates(data || []);
        }
      } catch (err) {
        console.error('Error:', err);
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, [initialTemplates]);

  if (loading) {
    return (
      <section className="relative w-full py-12 md:py-16 px-4 sm:px-6 bg-[#08090f]">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-[16/9] bg-zinc-900/80 rounded-2xl animate-pulse border border-blue-500/10" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (templates.length === 0) {
    return null;
  }

  // Curated Collage Pieces
  const card0 = templates[0]; // Hero Block (Big 2x2)
  const card1 = templates[1]; // Wide Spotlight (2x1)
  const card2 = templates[2]; // Medium Block (1x1)
  const card3 = templates[3]; // Medium Block (1x1)
  const card4 = templates[4]; // Medium Block (1x1)
  const card5 = templates[5]; // Wide Block (2x1)
  const card6 = templates[6]; // Medium Block (1x1)
  const card7 = templates[7]; // Medium Block (1x1)

  return (
    <section className="relative w-full py-14 md:py-24 px-4 sm:px-6 bg-gradient-to-br from-[#0c0d15] via-[#090a10] to-[#06070a] border-y border-blue-500/20 shadow-[0_0_60px_-15px_rgba(59,130,246,0.15)] overflow-hidden">
      
      {/* Top Floating Blue Hairline Accent */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400/40 to-transparent pointer-events-none" />

      {/* Ambient Cinema Lighting Flares */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-36 -left-36 w-[550px] h-[550px] bg-blue-600/15 rounded-full blur-[130px]" />
        <div className="absolute top-1/2 -right-36 w-[500px] h-[500px] bg-indigo-600/12 rounded-full blur-[130px]" />
        <div className="absolute -bottom-36 left-1/3 w-[550px] h-[550px] bg-cyan-500/10 rounded-full blur-[130px]" />
      </div>

      <div className="max-w-[1400px] mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 md:mb-12 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2.5">
              <div className="p-2.5 rounded-xl bg-white/[0.07] backdrop-blur-md border border-blue-400/20 shadow-sm">
                <Clapperboard className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-[900] text-white tracking-tight drop-shadow-md">
                Cinema Templates
              </h2>
            </div>
            <p className="text-zinc-300 text-sm md:text-base max-w-lg font-normal">
              Premium video templates for filmmakers and creators. Hover over any frame to preview in action.
            </p>
          </div>
          
          <Link
            href="/video-templates"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors group whitespace-nowrap"
          >
            <span>Explore all cinema templates</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Masterpiece Bento Collage Mosaic Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 auto-rows-[220px] sm:auto-rows-[250px] md:auto-rows-[270px]">
          {/* 1. Masterpiece Hero Cinema Card (Spans 2 cols, 2 rows) */}
          {card0 && (
            <VideoCard
              template={card0}
              videoUrl={card0.video_path ? convertR2UrlToCdn(card0.video_path) : null}
              thumbnail={
                (card0.thumbnail_path && convertR2UrlToCdn(card0.thumbnail_path)) ||
                (card0.img && convertR2UrlToCdn(card0.img)) ||
                '/placeholder.jpg'
              }
              badgeLabel="⭐ Featured Premiere"
              isLarge={true}
              className="sm:col-span-2 sm:row-span-2 min-h-[340px] sm:min-h-[520px]"
            />
          )}

          {/* 2. Top-Right Panoramic Spotlight (Spans 2 cols, 1 row) */}
          {card1 && (
            <VideoCard
              template={card1}
              videoUrl={card1.video_path ? convertR2UrlToCdn(card1.video_path) : null}
              thumbnail={
                (card1.thumbnail_path && convertR2UrlToCdn(card1.thumbnail_path)) ||
                (card1.img && convertR2UrlToCdn(card1.img)) ||
                '/placeholder.jpg'
              }
              badgeLabel="Panoramic LUT"
              className="sm:col-span-2 row-span-1 min-h-[220px]"
            />
          )}

          {/* 3 & 4. Interlocking Mosaic Cards */}
          {card2 && (
            <VideoCard
              template={card2}
              videoUrl={card2.video_path ? convertR2UrlToCdn(card2.video_path) : null}
              thumbnail={
                (card2.thumbnail_path && convertR2UrlToCdn(card2.thumbnail_path)) ||
                (card2.img && convertR2UrlToCdn(card2.img)) ||
                '/placeholder.jpg'
              }
              badgeLabel="Cinematic Intro"
              className="col-span-1 row-span-1 min-h-[220px]"
            />
          )}

          {card3 && (
            <VideoCard
              template={card3}
              videoUrl={card3.video_path ? convertR2UrlToCdn(card3.video_path) : null}
              thumbnail={
                (card3.thumbnail_path && convertR2UrlToCdn(card3.thumbnail_path)) ||
                (card3.img && convertR2UrlToCdn(card3.img)) ||
                '/placeholder.jpg'
              }
              badgeLabel="Title Sequence"
              className="col-span-1 row-span-1 min-h-[220px]"
            />
          )}

          {/* 5. Lower Left Medium Card */}
          {card4 && (
            <VideoCard
              template={card4}
              videoUrl={card4.video_path ? convertR2UrlToCdn(card4.video_path) : null}
              thumbnail={
                (card4.thumbnail_path && convertR2UrlToCdn(card4.thumbnail_path)) ||
                (card4.img && convertR2UrlToCdn(card4.img)) ||
                '/placeholder.jpg'
              }
              badgeLabel="Trailer FX"
              className="col-span-1 row-span-1 min-h-[220px]"
            />
          )}

          {/* 6. Lower Middle Wide Card (Spans 2 cols, 1 row) */}
          {card5 && (
            <VideoCard
              template={card5}
              videoUrl={card5.video_path ? convertR2UrlToCdn(card5.video_path) : null}
              thumbnail={
                (card5.thumbnail_path && convertR2UrlToCdn(card5.thumbnail_path)) ||
                (card5.img && convertR2UrlToCdn(card5.img)) ||
                '/placeholder.jpg'
              }
              badgeLabel="Movie Grade"
              className="sm:col-span-2 row-span-1 min-h-[220px]"
            />
          )}

          {/* 7. Lower Right Medium Card */}
          {card6 && (
            <VideoCard
              template={card6}
              videoUrl={card6.video_path ? convertR2UrlToCdn(card6.video_path) : null}
              thumbnail={
                (card6.thumbnail_path && convertR2UrlToCdn(card6.thumbnail_path)) ||
                (card6.img && convertR2UrlToCdn(card6.img)) ||
                '/placeholder.jpg'
              }
              badgeLabel="Visual FX"
              className="col-span-1 row-span-1 min-h-[220px]"
            />
          )}
        </div>

        {/* Mobile View All Link */}
        <div className="sm:hidden mt-8 text-center">
          <Link
            href="/video-templates"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
          >
            <span>Explore all cinema templates</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
