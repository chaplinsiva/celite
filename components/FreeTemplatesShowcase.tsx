'use client';

// agent-notes: { ctx: "Free templates showcase with infinite left-to-right marquee loop and Celite obsidian blue aesthetic", deps: [lib/utils, lucide-react], state: active, last: "dani@2026-08-15" }

import { useState, useRef } from 'react';
import Link from 'next/link';
import { convertR2UrlToCdn } from '@/lib/utils';
import { ArrowRight, Gift, Sparkles, Play } from 'lucide-react';

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
      className="group relative flex-shrink-0 w-[290px] sm:w-[330px] md:w-[360px] overflow-hidden rounded-2xl bg-[#0c0e15] border border-blue-500/25 hover:border-blue-400/70 aspect-[16/9] shadow-lg hover:shadow-[0_0_35px_-5px_rgba(59,130,246,0.35)] transition-all duration-500 hover:scale-[1.03] select-none"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Top Floating Blue Border Glow on Hover */}
      <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-400/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-30" />

      {/* FREE Badge with Glowing Blue Accent */}
      <div className="absolute top-3 left-3 z-20 px-3 py-1 rounded-full bg-blue-600/90 backdrop-blur-md border border-blue-400/40 text-white text-[11px] font-bold uppercase tracking-wider shadow-md flex items-center gap-1.5">
        <Gift className="w-3 h-3 text-cyan-200" />
        <span>Free</span>
      </div>

      {/* Play Icon Indicator on hover */}
      {videoUrl && (
        <div className="absolute top-3 right-3 z-20 w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-md">
          <Play className="w-3 h-3 fill-current ml-0.5" />
        </div>
      )}

      {/* Thumbnail Image */}
      <img
        src={thumbnail}
        alt={template.name}
        loading="lazy"
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
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

export default function FreeTemplatesShowcase({
  initialTemplates,
}: {
  initialTemplates?: FreeTemplate[];
}) {
  const [templates] = useState<FreeTemplate[]>(initialTemplates || []);

  if (!templates || templates.length === 0) {
    return null;
  }

  // Multiply items to ensure a silky smooth, seamless infinite loop without gaps
  const displayTemplates =
    templates.length < 5
      ? [...templates, ...templates, ...templates, ...templates, ...templates, ...templates]
      : [...templates, ...templates, ...templates, ...templates];

  return (
    <section className="relative w-full py-12 md:py-16 bg-gradient-to-br from-[#0d0f17] via-[#0a0b10] to-[#07080c] border-y border-blue-500/20 shadow-[0_0_60px_-15px_rgba(59,130,246,0.15)] overflow-hidden">
      
      {/* Dynamic Keyframes for Left-To-Right Infinite Loop Marquee */}
      <style>{`
        @keyframes celiteMarqueeLTR {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0%);
          }
        }
        .celite-marquee-track {
          display: flex;
          gap: 1.25rem;
          width: max-content;
          animation: celiteMarqueeLTR 95s linear infinite;
          will-change: transform;
        }
        .celite-marquee-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* Top Floating Blue Hairline Accent */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400/40 to-transparent pointer-events-none" />

      {/* Ambient Radial Lighting */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/15 rounded-full blur-[100px]" />
        <div className="absolute -bottom-24 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-[90px]" />
      </div>

      <div className="max-w-[1400px] mx-auto relative z-10 px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-white/[0.07] backdrop-blur-md border border-blue-400/20 shadow-sm">
                <Gift className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-[900] text-white tracking-tight drop-shadow-md">
                Free Templates
              </h2>
            </div>
            <p className="text-zinc-300 text-sm md:text-base max-w-lg font-normal">
              Download premium quality video templates for free. Hover to preview &amp; explore.
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden lg:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-950/40 border border-blue-500/20 text-blue-300 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
              <span>Hover over any template to pause &amp; play</span>
            </div>
            <Link
              href="/video-templates?free=true"
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors group whitespace-nowrap"
            >
              See all free templates
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* Infinite Scrolling Marquee Container with Feathered Edge Masks */}
      <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent_0%,black_4%,black_96%,transparent_100%)] py-3">
        <div className="celite-marquee-track">
          {displayTemplates.map((template, index) => (
            <VideoCard key={`${template.slug}-${index}`} template={template} />
          ))}
        </div>
      </div>

      {/* Mobile Indicator */}
      <div className="sm:hidden mt-6 text-center px-4">
        <Link
          href="/video-templates?free=true"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
        >
          See all free templates
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
