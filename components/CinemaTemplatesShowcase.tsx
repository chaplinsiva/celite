'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import { convertR2UrlToCdn } from '@/lib/utils';
import { ArrowRight, Play } from 'lucide-react';

type CinemaTemplate = {
  slug: string;
  name: string;
  subtitle?: string;
  img?: string;
  video_path?: string;
  thumbnail_path?: string;
  category?: { id: string; name: string; slug: string } | null;
};

type VideoCardProps = {
  template: CinemaTemplate;
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
      videoRef.current.play().catch(() => { });
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
      className="group relative overflow-hidden rounded-2xl bg-zinc-900 aspect-[16/9] shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-[1.03]"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Thumbnail Image */}
      <img
        src={thumbnail}
        alt={template.name}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isHovered && isLoaded && videoUrl ? 'opacity-0' : 'opacity-100'
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
          preload="metadata"
          onLoadedData={() => setIsLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isHovered && isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
        />
      )}

      {/* Play Icon when not hovered */}
      {videoUrl && !isHovered && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30 group-hover:scale-110 transition-transform">
            <Play className="w-6 h-6 text-white fill-white ml-1" />
          </div>
        </div>
      )}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

      {/* Title */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
        <h3 className="text-base md:text-lg font-bold text-white line-clamp-2 drop-shadow-lg">
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

export default function CinemaTemplatesShowcase() {
  const [templates, setTemplates] = useState<CinemaTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const supabase = getSupabaseBrowserClient();

        // Fetch only from Video Templates category
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
            categories(id, name, slug)
          `)
          .eq('status', 'approved')
          .eq('categories.slug', 'video-templates')
          .not('video_path', 'is', null)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) {
          console.error('Error loading cinema templates:', error);
          // Fallback: try fetching by category slug
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('templates')
            .select(`
              slug,
              name,
              subtitle,
              img,
              video_path,
              thumbnail_path,
              category_id,
              categories!inner(id, name, slug)
            `)
            .eq('status', 'approved')
            .eq('categories.slug', 'video-templates')
            .order('created_at', { ascending: false })
            .limit(20);

          if (fallbackError) {
            console.error('Fallback error:', fallbackError);
            setTemplates([]);
          } else {
            // Filter to only those with video_path
            const videoTemplates = (fallbackData || []).filter(t => t.video_path);
            setTemplates(videoTemplates.slice(0, 20));
          }
        } else {
          // Filter to only those with video_path
          const videoTemplates = (data || []).filter(t => t.video_path);
          setTemplates(videoTemplates.slice(0, 20));
        }
      } catch (err) {
        console.error('Error:', err);
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, []);

  if (loading) {
    return (
      <section className="relative w-full py-8 md:py-14 px-4 sm:px-6 bg-zinc-950">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-[16/9] bg-zinc-800 rounded-2xl animate-pulse" />
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
    <section className="relative w-full py-8 md:py-14 px-4 sm:px-6 bg-zinc-950">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight mb-2">
              Cinema Templates
            </h2>
            <p className="text-zinc-400 text-sm md:text-base max-w-lg">
              Premium video templates for filmmakers and creators. Hover to preview.
            </p>
          </div>
          <Link
            href="/video-templates"
            className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors group"
          >
            View all templates
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Grid - Larger Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
          {templates.map((template) => {
            const thumbnail = template.thumbnail_path
              ? convertR2UrlToCdn(template.thumbnail_path)
              : template.img
                ? convertR2UrlToCdn(template.img)
                : '/placeholder.jpg';

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
        <div className="sm:hidden mt-6 text-center">
          <Link
            href="/video-templates"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
          >
            View all templates
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
