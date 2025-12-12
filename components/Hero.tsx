"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TextReveal } from '@/components/ui/text-reveal';
import { Search, Sparkles } from 'lucide-react';

export default function Hero() {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/video-templates?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const popularSearches = [
    { label: "Diwali Poster", href: "/video-templates?category=diwali" },
    { label: "Instagram Reels", href: "/video-templates?category=reels" },
    { label: "Logo Reveal", href: "/video-templates?category=logo-reveal" },
    { label: "Wedding Invitation", href: "/video-templates?category=wedding" },
  ];

  return (
    <section className="relative w-full pt-12 pb-20 md:pt-20 md:pb-32 px-6 overflow-hidden bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50">

      {/* Background Decor Elements (Subtle) */}
      <div className="absolute top-20 left-[-100px] w-96 h-96 bg-purple-200/30 rounded-full blur-3xl mix-blend-multiply opacity-70 animate-blob"></div>
      <div className="absolute top-20 right-[-100px] w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl mix-blend-multiply opacity-70 animate-blob animation-delay-2000"></div>

      <div className="max-w-5xl mx-auto text-center space-y-8 relative z-10">

        {/* Headline */}
        <div className="space-y-4">
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold tracking-tight text-zinc-900 leading-[1.1]">
            Place of <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-500 to-rose-500">Unlimited</span> <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-500 to-rose-500">Creativity</span>
          </h1>
          <p className="text-lg sm:text-xl text-zinc-500 max-w-2xl mx-auto">
            Explore high-quality templates for design, video, 3D modeling, and more.
            <br className="hidden sm:block" />
            Modern tools to help you create stunning ideas with life.
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-3xl mx-auto relative">
          <form onSubmit={handleSearch} className="relative z-20">
            <div className="relative flex items-center bg-white shadow-xl shadow-indigo-100/50 rounded-full border border-zinc-200 hover:border-violet-300 transition-colors p-1.5 sm:p-2">
              <div className="pl-3 sm:pl-4 pr-2 text-zinc-400">
                <Search className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for 'wedding video templates'..."
                className="flex-1 bg-transparent text-zinc-800 placeholder:text-zinc-400 text-base sm:text-lg focus:outline-none py-2 min-w-0"
              />
              <button
                type="submit"
                className="bg-zinc-900 text-white px-4 py-2 sm:px-8 sm:py-3 rounded-full text-sm sm:text-base font-medium hover:bg-zinc-800 transition-colors flex items-center gap-2 shrink-0"
              >
                Search
              </button>
            </div>
          </form>

          {/* Popular Searches / Tags */}
          <div className="mt-6 flex flex-wrap justify-center gap-2 sm:gap-3">
            <span className="text-xs sm:text-sm font-medium text-zinc-500 py-1 w-full sm:w-auto">Popular:</span>
            {popularSearches.map((tag) => (
              <Link
                key={tag.label}
                href={tag.href}
                className="text-xs sm:text-sm text-zinc-600 bg-white border border-zinc-200 px-2.5 py-1 sm:px-3 sm:py-1 rounded-full hover:border-violet-300 hover:text-violet-600 transition-colors shadow-sm"
              >
                {tag.label}
              </Link>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
