"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, Gift, ArrowRight, Download, Sparkles } from 'lucide-react';

export default function Hero() {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/templates?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push(`/templates`);
    }
  };

  const popularSearches = [
    { label: "Diwali Poster", href: "/video-templates?category=diwali" },
    { label: "Instagram Reels", href: "/video-templates?category=reels" },
    { label: "Logo Reveal", href: "/video-templates?category=logo-reveal" },
    { label: "Wedding Invitation", href: "/video-templates?category=wedding" },
  ];

  return (
    <section className="relative w-full pt-16 pb-24 md:pt-24 md:pb-36 px-4 sm:px-6 overflow-hidden bg-zinc-950">

      {/* Background Video (Remo After Effects) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-100">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover scale-150 origin-center blur-[2px]"
        >
          <source src="https://preview.celite.in/preview/video/video-templates/after-effects/movie-templates/remo-inspired-wedding-invitation-template/remo-inspired-wedding-invitation-template.mp4" type="video/mp4" />
        </video>
        {/* Dark overlay for "black shaded" look */}
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/80 via-zinc-950/20 to-zinc-950/90"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-transparent to-zinc-950/90"></div>
      </div>

      <div className="max-w-[1440px] mx-auto px-0 sm:px-8 relative z-10">

        <div className="flex flex-col lg:flex-row items-center justify-between gap-12 text-left">
          {/* Left Side: Headline */}
          <div className="flex-1 space-y-8 text-center lg:text-left">
            {/* New Year 2026 Gift Badge - Moved to Left */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-blue-500/10 backdrop-blur-md border border-blue-500/20 text-blue-400 text-[10px] sm:text-xs md:text-sm font-bold shadow-2xl"
            >
              <Gift className="w-3 h-3 sm:w-4 sm:h-4 animate-bounce flex-shrink-0" />
              <span>New Year 2026 Gift - Free Remo Template</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tighter text-white drop-shadow-2xl leading-[1.1] sm:leading-[0.95]"
            >
              Start 2026 with <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 drop-shadow-sm">
                Unlimited Creativity
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-sm sm:text-base md:text-lg lg:text-xl text-white/90 drop-shadow-md max-w-2xl font-medium px-4 sm:px-0"
            >
              Get our premium Remo-inspired wedding invitation template for free as a 2026 gift.
              Download, sign in, and create something amazing.
            </motion.p>
            {/* Hero Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4 px-4 sm:px-0"
            >
              <Link
                href="/product/remo-inspired-wedding-invitation-template"
                className="group w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-zinc-950 px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg hover:bg-blue-500 hover:text-white transition-all shadow-xl shadow-white/10 active:scale-95"
              >
                <Download className="w-5 h-5 group-hover:translate-y-1 transition-transform" />
                Download Free Template
              </Link>

              <Link
                href="/pricing"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/5 text-white border-2 border-white/10 px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 backdrop-blur-sm"
              >
                View Pricing
                <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>

            {/* Search Bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="max-w-xl pt-8 px-4 sm:px-0"
            >
              <form onSubmit={handleSearch} className="relative group">
                <div className="relative flex items-center bg-white/5 backdrop-blur-xl shadow-2xl rounded-2xl sm:rounded-3xl border border-white/10 group-hover:border-blue-500/50 group-focus-within:border-blue-500 transition-all p-1.5 sm:p-2">
                  <div className="pl-3 sm:pl-4 pr-2 sm:pr-3 text-zinc-500">
                    <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search templates..."
                    className="flex-1 bg-transparent text-white placeholder:text-zinc-500 text-base sm:text-lg focus:outline-none py-2.5 sm:py-3 min-w-0"
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-5 sm:px-8 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-base sm:text-lg font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 active:scale-95"
                  >
                    Find
                  </button>
                </div>
              </form>

              {/* Popular Searches */}
              <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 justify-center lg:justify-start">
                <span className="text-[10px] sm:text-sm font-bold text-zinc-500 uppercase tracking-wider">Popular</span>
                <div className="flex flex-wrap items-center gap-2">
                  {popularSearches.map((tag) => (
                    <Link
                      key={tag.label}
                      href={tag.href}
                      className="text-[10px] sm:text-xs font-semibold text-zinc-300 bg-white/5 border border-white/10 px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg sm:rounded-xl hover:bg-blue-600/20 hover:border-blue-500/50 hover:text-blue-400 transition-all shadow-sm"
                    >
                      {tag.label}
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Side: Pricing Card - Hidden on mobile/tablet */}
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="hidden lg:block w-full max-w-[320px] bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[32px] p-6 shadow-2xl relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-4">
              <span className="bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                Best Value
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Sparkles className="w-4 h-4" />
                <span>Limited New Year Offer</span>
              </div>

              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-white/50 line-through text-lg font-bold">₹899</span>
                  <span className="text-white text-5xl font-black">₹599</span>
                </div>
                <p className="text-white/70 text-sm font-medium">per month, billed monthly</p>
              </div>

              <ul className="space-y-3 pt-2">
                {['Unlimited Downloads', 'Commercial License', 'New Daily Templates'].map((feat) => (
                  <li key={feat} className="flex items-center gap-2 text-white/90 text-sm font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {feat}
                  </li>
                ))}
              </ul>

              <Link
                href="/pricing"
                className="block w-full text-center bg-white text-zinc-950 py-4 rounded-2xl font-bold text-base hover:bg-emerald-400 hover:text-white transition-all active:scale-95 shadow-lg"
              >
                Get Access Now
              </Link>
            </div>
          </motion.div>
        </div>

      </div>

      {/* Modern Decor Elements */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

    </section>
  );
}
