"use client";

// agent-notes: { ctx: "Save Date & Wedding templates showcase with Celite obsidian blue theme", deps: [lib/supabaseClient, lib/utils, lucide-react], state: active, last: "dani@2026-08-15" }

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import { convertR2UrlToCdn } from '@/lib/utils';
import { ArrowRight, Heart, Play, Sparkles } from 'lucide-react';
import MarketExclusiveBadge from '@/components/MarketExclusiveBadge';

type SaveDateTemplate = {
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
  template: SaveDateTemplate;
  videoUrl: string | null;
  thumbnail: string;
};

function VideoCard({ template, videoUrl, thumbnail }: VideoCardProps) {
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
      className="group relative overflow-hidden rounded-2xl bg-[#0a0c13] border border-blue-500/20 hover:border-blue-400/80 aspect-[16/9] shadow-[0_4px_25px_rgba(0,0,0,0.6)] hover:shadow-[0_0_40px_-5px_rgba(59,130,246,0.35)] transition-all duration-500 hover:scale-[1.02] flex flex-col justify-end"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Top Floating Blue Border Glow on Hover */}
      <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-400/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-30" />

      {/* Market Exclusive Crown Badge */}
      {template.available_on_celite_subscription === false && (
        <div className="absolute top-3 right-3 z-30 pointer-events-none">
          <MarketExclusiveBadge variant="card" price={template.price} />
        </div>
      )}

      {/* Center Hover Play Ring */}
      {videoUrl && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-blue-600/80 backdrop-blur-md border border-blue-300/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-300 shadow-[0_0_20px_rgba(59,130,246,0.6)]">
            <Play className="w-4 h-4 fill-current ml-0.5 text-white" />
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

export default function SaveDateTemplatesShowcase({
  initialTemplates,
}: {
  initialTemplates?: SaveDateTemplate[];
} = {}) {
  const [templates, setTemplates] = useState<SaveDateTemplate[]>(initialTemplates || []);
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
          .eq('sub_subcategories.slug', 'save-date')
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) {
          console.error('Error loading save date templates:', error);
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

  return (
    <section className="relative w-full py-12 md:py-18 px-4 sm:px-6 bg-gradient-to-br from-[#0c0d15] via-[#090a10] to-[#06070a] border-y border-blue-500/20 shadow-[0_0_60px_-15px_rgba(59,130,246,0.15)] overflow-hidden">
      
      {/* Top Floating Blue Hairline Accent */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400/40 to-transparent pointer-events-none" />

      {/* Ambient Lighting Flares */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[120px]" />
        <div className="absolute -bottom-32 right-1/4 w-[450px] h-[450px] bg-indigo-500/10 rounded-full blur-[110px]" />
      </div>

      <div className="max-w-[1400px] mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 md:mb-10 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-white/[0.07] backdrop-blur-md border border-blue-400/20 shadow-sm">
                <Heart className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-[900] text-white tracking-tight drop-shadow-md">
                Save the Date &amp; Wedding
              </h2>
            </div>
            <p className="text-zinc-300 text-sm md:text-base max-w-lg font-normal">
              Premium wedding invitations, romantic slideshows &amp; cinematic motion graphics.
            </p>
          </div>
          
          <Link
            href="/video-templates?sub_subcategory=save-date"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors group whitespace-nowrap"
          >
            <span>View all wedding templates</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
          {templates.map((template) => {
            const thumbnail: string =
              (template.thumbnail_path && convertR2UrlToCdn(template.thumbnail_path)) ||
              (template.img && convertR2UrlToCdn(template.img)) ||
              '/placeholder.jpg';

            const videoUrl = template.video_path ? convertR2UrlToCdn(template.video_path) : null;

            return (
              <VideoCard
                key={template.slug}
                template={template}
                videoUrl={videoUrl}
                thumbnail={thumbnail}
              />
            );
          })}
        </div>

        {/* Mobile View All Link */}
        <div className="sm:hidden mt-8 text-center">
          <Link
            href="/video-templates?sub_subcategory=save-date"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
          >
            <span>View all wedding templates</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
