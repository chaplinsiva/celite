'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import VideoThumbnailPlayer from './VideoThumbnailPlayer';
import { getSupabaseBrowserClient } from '../lib/supabaseClient';
import type { Template } from '../data/templateData';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type WebsiteTemplate = Template & {
  category?: { id: string; name: string; slug: string } | null;
};

const WEBSITE_CATEGORY_SLUG = 'website-templates';

export default function WebsiteShowcaseCarousel() {
  const [websites, setWebsites] = useState<WebsiteTemplate[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const loadWebsites = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('templates')
        .select(`
          slug,name,subtitle,description,img,video,features,tags,created_at,
          categories(id,name,slug)
        `)
        .order('created_at', { ascending: false })
        .limit(24);

      if (error) {
        console.error('Failed to load website showcase templates:', error);
        return;
      }

      const filtered = (data ?? [])
        .filter((tpl: any) => {
          const category = tpl.categories ? (Array.isArray(tpl.categories) ? tpl.categories[0] : tpl.categories) : null;
          const tags = Array.isArray(tpl.tags) ? tpl.tags : [];
          const hasWebsiteTag = tags.some(
            (tag: any) => typeof tag === 'string' && tag.toLowerCase().includes('website'),
          );
          return category?.slug === WEBSITE_CATEGORY_SLUG || hasWebsiteTag;
        })
        .map((tpl: any) => {
          const category = tpl.categories ? (Array.isArray(tpl.categories) ? tpl.categories[0] : tpl.categories) : null;
          return {
            slug: tpl.slug,
            name: tpl.name,
            subtitle: tpl.subtitle,
            desc: tpl.description ?? '',
            price: 0,
            img: tpl.img,
            video: tpl.video,
            features: tpl.features ?? [],
            software: tpl.software ?? [],
            plugins: tpl.plugins ?? [],
            tags: tpl.tags ?? [],
            category: category ? { id: category.id, name: category.name, slug: category.slug } : null,
          } as WebsiteTemplate;
        });

      setWebsites(filtered);
      setCurrentIndex(0);
    };

    loadWebsites();
  }, []);

  if (!websites.length) return null;

  const featuredWebsite = websites[currentIndex];

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + websites.length) % websites.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % websites.length);
  };

  return (
    <section className="relative w-full bg-white py-8 sm:py-12 md:py-20 overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-6 sm:mb-10 md:mb-12">
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-blue-600 font-bold mb-2 sm:mb-3">Website Showcase</p>
          <h2 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-zinc-900 mb-2 sm:mb-4">
            Build Stunning <span className="text-blue-600">Web Experiences</span>
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-zinc-500 max-w-3xl mx-auto px-2">
            Explore high-converting landing pages, portfolio sites, and marketing experiences.
          </p>
        </div>

        <div className="relative">
          {websites.length > 1 && (
            <>
              <button
                aria-label="Show previous website template"
                onClick={goToPrev}
                className="absolute left-2 sm:left-4 lg:-left-14 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full bg-white shadow-md text-zinc-700 hover:bg-zinc-50 border border-zinc-100 transition-all duration-300 items-center justify-center focus:outline-none group flex"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-0.5 transition-transform" />
              </button>

              <button
                aria-label="Show next website template"
                onClick={goToNext}
                className="absolute right-2 sm:right-4 lg:-right-14 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full bg-white shadow-md text-zinc-700 hover:bg-zinc-50 border border-zinc-100 transition-all duration-300 items-center justify-center focus:outline-none group flex"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-0.5 transition-transform" />
              </button>


            </>
          )}

          <div className="relative rounded-xl sm:rounded-2xl lg:rounded-3xl border border-zinc-100 bg-zinc-50/50 p-3 sm:p-6 md:p-10 overflow-hidden shadow-sm">
            <div className="relative grid lg:grid-cols-[1.1fr_0.9fr] gap-4 sm:gap-6 md:gap-8 lg:gap-12 items-center">
              <div className="space-y-3 sm:space-y-4 md:space-y-6">
                <div>
                  <p className="inline-flex items-center text-[10px] sm:text-xs tracking-wider uppercase text-blue-600 font-semibold mb-1 sm:mb-2">
                    {featuredWebsite.category?.name ||
                      featuredWebsite.tags?.find(
                        (tag) => typeof tag === 'string' && tag.toLowerCase().includes('website'),
                      ) ||
                      'Website Template'}
                  </p>
                  <h3 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold text-zinc-900 leading-tight">
                    {featuredWebsite.name}
                  </h3>
                </div>
                <p className="text-sm sm:text-base md:text-lg text-zinc-600 leading-relaxed line-clamp-3 sm:line-clamp-none">
                  {featuredWebsite.subtitle ||
                    featuredWebsite.desc ||
                    'Responsive website experience with premium interactions, scroll choreography, and immersive storytelling sections tailored for modern digital brands.'}
                </p>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {(featuredWebsite.tags ?? []).slice(0, 4).map((tag) => (
                    <span
                      key={tag as string}
                      className="px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-white border border-zinc-200 text-[10px] sm:text-xs text-zinc-600 font-medium"
                    >
                      {tag as string}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 sm:gap-3 pt-1 sm:pt-2">
                  <Link
                    href={`/product/${featuredWebsite.slug}`}
                    className="px-4 py-2 sm:px-6 sm:py-3 rounded-full bg-zinc-900 text-white text-xs sm:text-sm font-semibold hover:bg-zinc-800 transition shadow-lg shadow-zinc-900/20"
                  >
                    View Template
                  </Link>
                  <Link
                    href="/pricing"
                    className="px-4 py-2 sm:px-6 sm:py-3 rounded-full border border-zinc-200 bg-white text-xs sm:text-sm text-zinc-900 font-semibold hover:bg-zinc-50 transition"
                  >
                    Get Access
                  </Link>
                </div>
              </div>
              <div className="relative group">
                <div
                  className={cn(
                    'relative rounded-xl sm:rounded-2xl border border-zinc-200 overflow-hidden shadow-2xl shadow-blue-900/5 bg-white aspect-video',
                  )}
                >
                  {featuredWebsite.video_path ? (
                    <VideoThumbnailPlayer
                      videoUrl={featuredWebsite.video_path}
                      thumbnailUrl={featuredWebsite.thumbnail_path || featuredWebsite.img || undefined}
                      title={featuredWebsite.name}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full bg-zinc-100 text-zinc-400 text-xs sm:text-sm font-medium">
                      Preview coming soon
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 sm:-bottom-4 sm:-right-4 -z-10 w-full h-full bg-blue-100/50 rounded-xl sm:rounded-2xl lg:rounded-3xl transform translate-x-1 translate-y-1 sm:translate-x-2 sm:translate-y-2"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

