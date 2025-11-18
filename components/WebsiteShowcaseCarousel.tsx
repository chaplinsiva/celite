'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import YouTubeVideoPlayer from './YouTubeVideoPlayer';
import { getSupabaseBrowserClient } from '../lib/supabaseClient';
import type { Template } from '../data/templateData';
import { cn } from '@/lib/utils';

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

      const filtered = (data ?? []).filter((tpl: any) => {
        const category = tpl.categories ? (Array.isArray(tpl.categories) ? tpl.categories[0] : tpl.categories) : null;
        const tags = Array.isArray(tpl.tags) ? tpl.tags : [];
        const hasWebsiteTag = tags.some((tag: any) =>
          typeof tag === 'string' && tag.toLowerCase().includes('website'),
        );
        return category?.slug === WEBSITE_CATEGORY_SLUG || hasWebsiteTag;
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
    <section className="relative w-full bg-gradient-to-b from-black via-black to-zinc-950 pt-12 sm:pt-16 md:pt-20 pb-12 sm:pb-20">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(147,51,234,0.12),_transparent_45%)]" />
      </div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="text-center mb-10 sm:mb-12">
          <p className="text-sm uppercase tracking-[0.4em] text-pink-400 mb-3">Website Showcase</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Build stunning <span className="bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 text-transparent bg-clip-text">website experiences</span>
          </h2>
          <p className="text-base sm:text-lg text-zinc-400 max-w-3xl mx-auto">
            Explore high-converting landing pages, portfolio sites, and marketing experiences crafted for modern brands.
          </p>
        </div>

        <div className="relative">
          {websites.length > 1 && (
            <>
              <button
                aria-label="Show previous website template"
                onClick={goToPrev}
                className="hidden lg:flex absolute -left-14 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20 border border-white/30 transition-all duration-300 items-center justify-center focus:outline-none group"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" className="group-hover:-translate-x-0.5 transition-transform">
                  <path d="M12.7 5.3a1 1 0 0 0-1.4 0l-4 4a1 1 0 0 0 0 1.4l4 4a1 1 0 1 0 1.4-1.4L9.42 10l3.3-3.3a1 1 0 0 0 0-1.4z" fill="currentColor" />
                </svg>
              </button>

              <button
                aria-label="Show next website template"
                onClick={goToNext}
                className="hidden lg:flex absolute -right-14 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20 border border-white/30 transition-all duration-300 items-center justify-center focus:outline-none group"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" className="group-hover:translate-x-0.5 transition-transform">
                  <path d="M7.3 14.7a1 1 0 0 1 0-1.4l3.3-3.3-3.3-3.3a1 1 0 1 1 1.4-1.4l4 4a1 1 0 0 1 0 1.4l-4 4a1 1 0 0 1-1.4 0z" fill="currentColor" />
                </svg>
              </button>

              <div className="absolute top-6 right-6 z-10 px-3 py-1 rounded-full border border-white/15 text-xs text-white/70">
                {String(currentIndex + 1).padStart(2, '0')} / {String(websites.length).padStart(2, '0')}
              </div>
            </>
          )}

          <div className="relative rounded-[1.75rem] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 sm:p-10 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
            <div className="relative grid lg:grid-cols-[1.1fr_0.9fr] gap-8 lg:gap-12 items-center">
              <div className="space-y-4">
                <p className="inline-flex items-center text-xs tracking-[0.3em] uppercase text-sky-300/80">
                  {featuredWebsite.category?.name ||
                    featuredWebsite.tags?.find(
                      (tag) => typeof tag === 'string' && tag.toLowerCase().includes('website'),
                    ) ||
                    'Website Template'}
                </p>
                <h3 className="text-3xl sm:text-4xl font-semibold text-white leading-tight">{featuredWebsite.name}</h3>
                <p className="text-base text-zinc-300 leading-relaxed">
                  {featuredWebsite.subtitle ||
                    featuredWebsite.description ||
                    'Responsive website experience with premium interactions, scroll choreography, and immersive storytelling sections tailored for modern digital brands.'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(featuredWebsite.tags ?? []).slice(0, 4).map((tag) => (
                    <span
                      key={tag as string}
                      className="px-3 py-1 rounded-full border border-white/15 text-xs text-white/80 tracking-wide"
                    >
                      {tag as string}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3 pt-4">
                  <Link
                    href={`/product/${featuredWebsite.slug}`}
                    className="px-5 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition"
                  >
                    View Template
                  </Link>
                  <Link
                    href="/pricing"
                    className="px-5 py-2.5 rounded-full border border-white/30 text-sm text-white hover:bg-white/10 transition"
                  >
                    Get Access
                  </Link>
                </div>
              </div>
              <div className="relative">
                <div
                  className={cn(
                    'relative rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl shadow-blue-500/20',
                    'bg-black/40'
                  )}
                >
                  {featuredWebsite.video ? (
                    <div className="relative w-full aspect-video">
                      <YouTubeVideoPlayer
                        videoUrl={featuredWebsite.video}
                        title={featuredWebsite.name}
                        className="absolute inset-0 h-full w-full"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center w-full aspect-video text-zinc-500 text-sm">
                      Preview coming soon
                    </div>
                  )}
                  <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-black/70 text-xs text-white/80">
                    Desktop + Mobile
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

