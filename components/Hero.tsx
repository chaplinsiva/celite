"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TextReveal } from '@/components/ui/text-reveal';
import { LiquidButton } from '@/components/ui/liquid-glass-button';
import TubesCursor from '@/components/ui/tubes-cursor';

export default function Hero() {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/templates?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <section className="relative w-full min-h-[60vh] flex items-center justify-center px-6 py-24 sm:py-36 md:py-40 overflow-hidden">
      {/* TubesCursor Background */}
      <TubesCursor />
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-black/60 z-10"></div>
      {/* Content */}
      <div className="max-w-5xl mx-auto text-center space-y-8 relative z-20">
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
    </section>
  );
}
