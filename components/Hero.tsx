"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { TextReveal } from '@/components/ui/text-reveal';
import { LiquidButton } from '@/components/ui/liquid-glass-button';
import TubesCursor from '@/components/ui/tubes-cursor';
import YouTubeVideoPlayer from '@/components/YouTubeVideoPlayer';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import type { Template } from '@/data/templateData';
import { cn } from '@/lib/utils';

export default function Hero() {
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredTemplates, setFeaturedTemplates] = useState<Template[]>([]);
  const showcaseRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/templates?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  useEffect(() => {
    const loadFeatured = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        let { data } = await supabase
          .from('templates')
          .select('slug,name,subtitle,description,img,video,features,software,plugins,tags')
          .eq('feature', true)
          .order('updated_at', { ascending: false })
          .limit(12);

        if (!data || data.length === 0) {
          const fallback = await supabase
            .from('templates')
            .select('slug,name,subtitle,description,img,video,features,software,plugins,tags')
            .order('created_at', { ascending: false })
            .limit(12);
          if (!fallback.error) {
            data = fallback.data ?? [];
          }
        }

        if (data) {
          const mapped = data.map((tpl: any) => ({
            slug: tpl.slug,
            name: tpl.name,
            subtitle: tpl.subtitle,
            desc: tpl.description ?? '',
            price: tpl.price ?? 0,
            img: tpl.img,
            video: tpl.video,
            features: tpl.features ?? [],
            software: tpl.software ?? [],
            plugins: tpl.plugins ?? [],
            tags: tpl.tags ?? [],
          }));
          setFeaturedTemplates(mapped);
          setActiveIndex(0);
        }
      } catch (e) {
        console.warn('Failed to load featured templates', e);
      }
    };
    loadFeatured();
  }, []);

  const scrollShowcase = (offset: number) => {
    if (showcaseRef.current) {
      showcaseRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <section className="relative w-full min-h-[60vh] flex items-center justify-center px-6 py-24 sm:py-36 md:py-40 overflow-hidden">
      {/* TubesCursor Background */}
      <TubesCursor />
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-black/60 z-10"></div>
      {/* Content */}
      <div className="max-w-6xl mx-auto space-y-10 relative z-20">
        <div className="text-center space-y-8">
          <TextReveal 
            variant="blur" 
            className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight not-italic"
            style={{ fontStyle: 'normal', fontSynthesis: 'none' }}
          >
            <span className="text-white">Built. Create. </span>
            <span className="text-zinc-400">Inspire</span>
          </TextReveal>
          <p className="text-lg sm:text-xl text-zinc-300 max-w-2xl mx-auto">
            Elevate your videos with premium templates for logo reveals, slideshows, and cinematic effects.
          </p>
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto pt-6">
            <div className="flex gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 sm:py-3 border border-white/20 focus-within:border-white/40 transition-colors">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="flex-1 bg-transparent text-white placeholder:text-zinc-400 focus:outline-none text-sm sm:text-base"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch(e as any);
                  }
                }}
              />
              <button
                type="submit"
                className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white text-black hover:bg-zinc-200 transition-colors"
                aria-label="Search templates"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </form>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Link href="/templates">
              <LiquidButton className="text-white border rounded-full" size={'xl'}>
                Browse Templates
              </LiquidButton>
            </Link>
            <Link
              href="/pricing"
              className="px-8 py-3 rounded-full border border-white/30 text-white font-semibold text-sm hover:bg-white/10 transition"
            >
              View Pricing
            </Link>
          </div>
        </div>

        {featuredTemplates.length > 0 && (
          <div className="mt-8 bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-md space-y-6 relative">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-blue-300">Hero Showcase</p>
                <h3 className="text-2xl font-semibold text-white mt-1">Featured Templates</h3>
              </div>
              <Link href="/templates?filter=featured" className="text-sm text-blue-300 hover:underline">
                View all featured
              </Link>
            </div>

            {/* Navigation buttons */}
            {featuredTemplates.length > 1 && (
              <>
                <button
                  aria-label="Scroll featured templates left"
                  onClick={() => scrollShowcase(-400)}
                  className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 border border-white/30 transition items-center justify-center"
                >
                  <svg width="18" height="18" viewBox="0 0 20 20">
                    <path d="M12.7 5.3a1 1 0 0 0-1.4 0l-4 4a1 1 0 0 0 0 1.4l4 4a1 1 0 1 0 1.4-1.4L9.42 10l3.3-3.3a1 1 0 0 0 0-1.4z" fill="currentColor" />
                  </svg>
                </button>
                <button
                  aria-label="Scroll featured templates right"
                  onClick={() => scrollShowcase(400)}
                  className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 border border-white/30 transition items-center justify-center"
                >
                  <svg width="18" height="18" viewBox="0 0 20 20">
                    <path d="M7.3 14.7a1 1 0 0 1 0-1.4l3.3-3.3-3.3-3.3a1 1 0 1 1 1.4-1.4l4 4a1 1 0 0 1 0 1.4l-4 4a1 1 0 0 1-1.4 0z" fill="currentColor" />
                  </svg>
                </button>
              </>
            )}

            <div
              ref={showcaseRef}
              className="flex gap-4 overflow-x-auto snap-x pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{ scrollSnapType: 'x mandatory' }}
            >
              {featuredTemplates.map((tpl) => (
                <div
                  key={tpl.slug}
                  className="flex-shrink-0 w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-0.75rem)] snap-start"
                >
                  <div className="relative rounded-2xl border border-white/10 bg-black/60 p-4 hover:border-white/30 transition-colors h-full flex flex-col gap-3">
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10">
                      {tpl.video ? (
                        <YouTubeVideoPlayer
                          videoUrl={tpl.video}
                          title={tpl.name}
                          className="absolute inset-0 w-full h-full"
                          autoplay
                          muted
                        />
                      ) : tpl.img ? (
                        <Image src={tpl.img} alt={tpl.name} fill className="object-cover" />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full text-zinc-500 text-sm bg-black">
                          Preview coming soon
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <Link href={`/product/${tpl.slug}`} className="text-base font-semibold text-white hover:underline truncate">
                        {tpl.name}
                      </Link>
                      <Link
                        href={`/product/${tpl.slug}`}
                        className="text-xs font-semibold text-white/80 hover:text-white px-3 py-1.5 rounded-full border border-white/30"
                      >
                        Explore
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
