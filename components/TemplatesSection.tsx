"use client";

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '../lib/supabaseClient';
import { useAppContext } from '../context/AppContext';
import { formatPrice } from '../lib/currency';

type Template = {
  slug: string;
  name: string;
  subtitle: string;
  price: number;
  img: string;
  video?: string | null;
};

export default function TemplatesSection() {
  const { user } = useAppContext();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabaseBrowserClient();
      
      // Check subscription status
      if (user) {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('is_active')
          .eq('user_id', user.id)
          .maybeSingle();
        setIsSubscribed(!!sub?.is_active);
      }

      // Load latest templates (all templates, ordered by created_at)
      const { data } = await supabase
        .from('templates')
        .select('slug,name,subtitle,price,img,video')
        .order('created_at', { ascending: false })
        .limit(6);
      
      if (data) {
        const mapped: Template[] = data.map((r: any) => ({
          slug: r.slug,
          name: r.name,
          subtitle: r.subtitle,
          price: Number(r.price ?? 0),
          img: r.img,
          video: r.video,
        }));
        setTemplates(mapped);
      }
    };
    load();
  }, [user]);

  const handleMouseEnter = (slug: string, hasVideo: boolean) => {
    if (hasVideo) {
      setHovered(slug);
      const vid = videoRefs.current[slug];
      if (vid) {
        vid.currentTime = 0;
        vid.muted = true;
        vid.play().catch(() => {});
      }
    }
  };

  const handleMouseLeave = (slug: string) => {
    const vid = videoRefs.current[slug];
    if (vid) {
      vid.pause();
      vid.currentTime = 0;
    }
    setHovered(null);
  };

  return (
    <section className="relative w-full py-16 sm:py-20 overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-0 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute top-1/2 right-0 w-72 h-72 bg-pink-500/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <span className="text-sm font-semibold text-purple-400 uppercase tracking-wider">Templates</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Latest Templates
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Explore our newest additions and find the perfect template for your next project
          </p>
        </div>

        {/* Templates Grid */}
        {templates.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mb-12">
              {templates.map((template) => {
                const hasVideo = !!template.video;
                const isHovered = hovered === template.slug;
                
                return (
                  <Link
                    key={template.slug}
                    href={`/product/${template.slug}`}
                    className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900/90 to-zinc-800/90 border border-white/10 backdrop-blur-sm hover:border-white/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
                    onMouseEnter={() => handleMouseEnter(template.slug, hasVideo)}
                    onMouseLeave={() => handleMouseLeave(template.slug)}
                  >
                    {/* Decorative Gradient Corner */}
                    <div className="absolute top-0 left-0 w-40 h-40 bg-gradient-to-br from-purple-500/20 to-transparent rounded-br-full"></div>
                    
                    {/* Image/Video Container */}
                    <div className="relative h-56 mb-4 overflow-hidden bg-zinc-900">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10"></div>
                      {hasVideo && (
                        <video
                          ref={(el) => { videoRefs.current[template.slug] = el; }}
                          src={template.video!}
                          poster={template.img}
                          playsInline
                          muted
                          preload="metadata"
                          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                        />
                      )}
                      <img
                        src={template.img}
                        alt={template.name}
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isHovered && hasVideo ? 'opacity-0' : 'opacity-100'}`}
                      />
                      
                      {/* Price Badge */}
                      <div className="absolute bottom-3 right-3 z-20">
                        <span className="px-3 py-1.5 bg-black/70 backdrop-blur-sm text-white text-sm font-bold rounded-lg border border-white/20">
                          {formatPrice(template.price)}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 relative z-10">
                      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors line-clamp-1">
                        {template.name}
                      </h3>
                      <p className="text-sm text-zinc-400 mb-4 line-clamp-2">
                        {template.subtitle}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-500">View Details</span>
                        <svg className="w-5 h-5 text-purple-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>

                    {/* Hover Glow Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/10 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </Link>
                );
              })}
            </div>

            {/* View All Button */}
            <div className="text-center">
              <Link
                href="/templates"
                className="inline-flex items-center px-8 py-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold hover:from-purple-600 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
              >
                Browse All Templates
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-zinc-400">No templates available at the moment.</p>
          </div>
        )}
      </div>
    </section>
  );
}

