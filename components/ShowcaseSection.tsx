'use client';

import { TextRevealByWord } from '@/components/ui/text-reveal';

export default function ShowcaseSection() {
  return (
    <section className="relative w-full overflow-hidden bg-black py-20 sm:py-24 md:py-28">
      {/* Text Reveal Title Section - Above Video */}
      <div className="relative z-20 mb-0 -mb-8 sm:-mb-12 md:-mb-16">
        <TextRevealByWord 
          text="Our Work Showcase"
          className="h-[40vh] sm:h-[50vh] md:h-[60vh]"
        />
      </div>

      {/* Video Section - Separated below title */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 sm:-mt-12 md:-mt-16">
        <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl">
          <video
            src="/VIDEOBG.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="w-full h-auto object-cover"
            style={{
              filter: 'blur(2px) brightness(0.7)',
            }}
          />
        </div>
      </div>

      {/* Spacer for proper layout */}
      <div className="h-[10vh]" aria-hidden="true" />
    </section>
  );
}

