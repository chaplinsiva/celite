'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import { convertR2UrlToCdn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

type SaveDateTemplate = {
  slug: string;
  name: string;
  subtitle?: string;
  img?: string;
  video_path?: string;
  thumbnail_path?: string;
  category?: { id: string; name: string; slug: string } | null;
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
      <img
        src={thumbnail}
        alt={template.name}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isHovered && isLoaded && videoUrl ? 'opacity-0' : 'opacity-100'
          }`}
      />

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

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

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

export default function SaveDateTemplatesShowcase({ initialTemplates }: { initialTemplates?: SaveDateTemplate[] } = {}) {
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
            categories!inner(id, name, slug)
          `)
          .eq('status', 'approved')
          .eq('categories.slug', 'save-date')
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
      <section className="relative w-full py-8 md:py-14 px-4 sm:px-6 bg-gradient-to-b from-rose-950/40 to-zinc-950">
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
    <section className="relative w-full py-8 md:py-14 px-4 sm:px-6 bg-gradient-to-b from-rose-950/30 via-zinc-950 to-zinc-950 border-t border-rose-900/20">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight mb-2">
              Save the Date &amp; Wedding Templates
            </h2>
            <p className="text-zinc-400 text-sm md:text-base max-w-lg">
              Premium wedding save the date video templates for After Effects. Customizable invitations, romantic slideshows &amp; motion graphics.
            </p>
          </div>
          <Link
            href="/save-date"
            className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold text-rose-300 hover:text-rose-200 transition-colors group"
          >
            View all
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

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

        <div className="sm:hidden mt-6 text-center">
          <Link
            href="/save-date"
            className="inline-flex items-center gap-2 text-sm font-semibold text-rose-300 hover:text-rose-200 transition-colors"
          >
            View all
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
