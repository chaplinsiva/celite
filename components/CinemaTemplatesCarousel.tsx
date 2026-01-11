'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '../lib/supabaseClient';
import { useAppContext } from '../context/AppContext';
import { convertR2UrlToCdn } from '../lib/utils';
import VideoThumbnailPlayer from './VideoThumbnailPlayer';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

type CinemaTemplate = {
  slug: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  img: string | null;
  video_path?: string | null;
  thumbnail_path?: string | null;
  features: string[];
  software: string[];
  plugins: string[];
  tags: string[];
  created_at?: string | null;
  feature?: boolean | null;
};

export default function CinemaTemplatesCarousel() {
  const { user } = useAppContext();
  const carouselRef = useRef<HTMLDivElement>(null);
  const [templates, setTemplates] = useState<CinemaTemplate[]>([]);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabaseBrowserClient();

      // Find Video Templates category
      const { data: videoTemplatesCategory } = await supabase
        .from('categories')
        .select('id')
        .or('slug.eq.video-templates,name.ilike.%Video Templates%')
        .limit(1)
        .maybeSingle();

      if (!videoTemplatesCategory) {
        console.error('Video Templates category not found');
        return;
      }

      // Find cinema-templates subcategory
      const { data: cinemaSubcategory } = await supabase
        .from('subcategories')
        .select('id')
        .eq('category_id', videoTemplatesCategory.id)
        .eq('slug', 'cinema-templates')
        .limit(1)
        .maybeSingle();

      if (!cinemaSubcategory) {
        console.log('Cinema Templates subcategory not found, searching by tags/name instead');
        // Fallback: fetch templates and filter by cinema-related tags or names
        const { data: allTemplates, error: fallbackError } = await supabase
          .from('templates')
          .select(`
            slug,name,subtitle,description,img,video_path,thumbnail_path,features,software,plugins,tags,created_at,feature
          `)
          .eq('status', 'approved')
          .eq('category_id', videoTemplatesCategory.id)
          .order('created_at', { ascending: false })
          .limit(100); // Fetch more to filter from

        if (fallbackError) {
          console.error('Error loading cinema templates:', fallbackError);
          return;
        }

        // Filter templates by cinema-related keywords
        const cinemaKeywords = ['cinema', 'cinematic', 'film', 'movie', 'hollywood'];
        const filteredTemplates = (allTemplates ?? []).filter((template: any) => {
          const name = (template.name || '').toLowerCase();
          const subtitle = (template.subtitle || '').toLowerCase();
          const description = (template.description || '').toLowerCase();
          const tags = Array.isArray(template.tags) 
            ? template.tags.map((t: any) => String(t).toLowerCase())
            : [];
          
          const allText = [name, subtitle, description, ...tags].join(' ');
          
          return cinemaKeywords.some(keyword => allText.includes(keyword));
        }).slice(0, 12); // Limit to 12

        const mapped: CinemaTemplate[] = filteredTemplates.map((r: any) => ({
          slug: r.slug,
          name: r.name,
          subtitle: r.subtitle,
          description: r.description,
          img: r.img,
          video_path: r.video_path,
          thumbnail_path: r.thumbnail_path,
          features: r.features ?? [],
          software: r.software ?? [],
          plugins: r.plugins ?? [],
          tags: r.tags ?? [],
          created_at: r.created_at,
          feature: Boolean(r.feature),
        }));
        setTemplates(mapped);
        return;
      }

      // Fetch templates from cinema-templates subcategory
      const { data, error } = await supabase
        .from('templates')
        .select(`
          slug,name,subtitle,description,img,video_path,thumbnail_path,features,software,plugins,tags,created_at,feature
        `)
        .eq('status', 'approved')
        .eq('subcategory_id', cinemaSubcategory.id)
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) {
        console.error('Error loading cinema templates:', error);
        return;
      }

      const mapped: CinemaTemplate[] = (data ?? []).map((r: any) => ({
        slug: r.slug,
        name: r.name,
        subtitle: r.subtitle,
        description: r.description,
        img: r.img,
        video_path: r.video_path,
        thumbnail_path: r.thumbnail_path,
        features: r.features ?? [],
        software: r.software ?? [],
        plugins: r.plugins ?? [],
        tags: r.tags ?? [],
        created_at: r.created_at,
        feature: Boolean(r.feature),
      }));

      setTemplates(mapped);
    };

    load();
  }, [user]);

  const scroll = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = 400;
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const handleScroll = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    const carousel = carouselRef.current;
    if (carousel) {
      carousel.addEventListener('scroll', handleScroll);
      handleScroll(); // Initial check
      return () => carousel.removeEventListener('scroll', handleScroll);
    }
  }, [templates]);

  if (templates.length === 0) {
    return null; // Don't render if no templates
  }

  return (
    <section className="relative w-full py-6 md:py-10 px-4 sm:px-6 bg-background overflow-hidden">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl md:text-4xl font-black text-black tracking-tight mb-2">
              Cinema Templates
            </h2>
            <p className="text-zinc-600 text-sm md:text-base">
              Professional cinematic video templates for your projects
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/video-templates?subcategory=cinema-templates"
              className="hidden sm:flex items-center gap-2 text-sm font-medium text-zinc-700 hover:text-black transition-colors"
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </Link>
            <div className="flex gap-2">
              <button
                onClick={() => scroll('left')}
                disabled={!canScrollLeft}
                className="p-3 rounded-full border border-zinc-200 hover:bg-zinc-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-6 h-6 text-zinc-600" />
              </button>
              <button
                onClick={() => scroll('right')}
                disabled={!canScrollRight}
                className="p-3 rounded-full border border-zinc-200 hover:bg-zinc-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-6 h-6 text-zinc-600" />
              </button>
            </div>
          </div>
        </div>

        <div
          ref={carouselRef}
          className="flex gap-5 overflow-x-auto scrollbar-hide pb-6 snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {templates.map((template) => (
            <div
              key={template.slug}
              className="flex-shrink-0 w-full sm:w-[calc(50%-0.625rem)] lg:w-[calc(25%-0.9375rem)] snap-center"
            >
              <Link href={`/product/${template.slug}`} className="block relative group">
                <div className="relative min-h-[200px] max-h-[350px] h-auto overflow-hidden rounded-xl bg-zinc-900 flex items-center justify-center">
                  {/* Video/Image */}
                  {template.video_path ? (
                    <VideoThumbnailPlayer
                      videoUrl={template.video_path}
                      thumbnailUrl={template.thumbnail_path || template.img || undefined}
                      title={template.name}
                      className="w-full h-full min-h-[200px]"
                    />
                  ) : (
                    <div className="w-full h-full min-h-[200px] bg-zinc-100 flex items-center justify-center text-zinc-400">
                      {template.img ? (
                        <img
                          src={convertR2UrlToCdn(template.img) || template.img}
                          alt={template.name}
                          className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        'No Preview'
                      )}
                    </div>
                  )}

                  {/* Hover Overlay with Info */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                  {/* Bottom Info - Shows on Hover */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none z-20">
                    <h3 className="text-white font-bold text-lg mb-1 line-clamp-1">
                      {template.name}
                    </h3>
                    {template.subtitle && (
                      <p className="text-zinc-300 text-sm mb-2 line-clamp-2">
                        {template.subtitle}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      {template.feature && (
                        <span className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded">
                          Featured
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>

        {/* Mobile View All Link */}
        <div className="sm:hidden mt-4 text-center">
          <Link
            href="/video-templates?subcategory=cinema-templates"
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700 hover:text-black transition-colors"
          >
            View All Cinema Templates
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}

