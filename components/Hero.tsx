"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, Sparkles, Gift, ArrowRight, Download } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import { useAppContext } from '@/context/AppContext';

export default function Hero() {
  const { user } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadCount, setDownloadCount] = useState<number>(0);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    const fetchDownloadCount = async () => {
      try {
        const supabase = getSupabaseBrowserClient();

        // Check admin status
        if (user) {
          const { data: adminData } = await supabase
            .from('admins')
            .select('user_id')
            .eq('user_id', user.id)
            .maybeSingle();
          setIsAdmin(!!adminData);
        } else {
          setIsAdmin(false);
        }
        const { count, error } = await supabase
          .from('downloads')
          .select('*', { count: 'exact', head: true })
          .in('template_slug', [
            'remo-inspired-wedding-invitation-template',
            'celite-remo-inspired-wedding-invitation-template'
          ]);

        if (!error && count !== null) {
          setDownloadCount(count);
        }
      } catch (err) {
        console.error('Error fetching count:', err);
      }
    };
    fetchDownloadCount();
  }, [user]);

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
    <section className="relative w-full pt-16 pb-24 md:pt-24 md:pb-36 px-6 overflow-hidden bg-white">

      {/* Background Video (Remo After Effects) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-80">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover scale-125 origin-center"
        >
          <source src="https://preview.celite.in/preview/video/video-templates/after-effects/movie-templates/remo-inspired-wedding-invitation-template/remo-inspired-wedding-invitation-template.mp4" type="video/mp4" />
        </video>
        {/* Lighter overlays to keep the video clear but text readable */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-white/40 to-white/90"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-transparent to-white/90"></div>
      </div>

      <div className="max-w-[1440px] mx-auto px-6 sm:px-8 text-center space-y-10 relative z-10">

        {/* New Year 2026 Gift Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-sm font-bold shadow-sm"
        >
          <Gift className="w-4 h-4 animate-bounce" />
          <span>New Year 2026 Gift - Free Remo Template</span>
          {isAdmin && (
            <>
              <div className="w-1 h-1 rounded-full bg-blue-200"></div>
              <span className="text-blue-400 font-medium">{downloadCount.toLocaleString()}+ Downloaded</span>
            </>
          )}
        </motion.div>

        {/* Headline */}
        <div className="space-y-6">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl md:text-8xl font-black tracking-tighter text-zinc-950 leading-[0.95]"
          >
            Start 2026 with <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
              Unlimited Creativity
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg sm:text-xl text-zinc-600 max-w-2xl mx-auto font-medium"
          >
            Get our premium Remo-inspired wedding invitation template for free as a 2026 gift.
            Download, sign in, and create something amazing.
          </motion.p>
        </div>

        {/* Hero Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
        >
          <Link
            href="/product/remo-inspired-wedding-invitation-template"
            className="group w-full sm:w-auto flex items-center justify-center gap-2 bg-zinc-950 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-blue-600 transition-all shadow-xl shadow-zinc-950/20 active:scale-95"
          >
            <Download className="w-5 h-5 group-hover:translate-y-1 transition-transform" />
            Download Free Template
          </Link>

          <Link
            href="/pricing"
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-zinc-900 border-2 border-zinc-100 px-8 py-4 rounded-2xl font-bold text-lg hover:border-blue-200 transition-all active:scale-95"
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
          className="max-w-3xl mx-auto pt-8"
        >
          <form onSubmit={handleSearch} className="relative group">
            <div className="relative flex items-center bg-white/80 backdrop-blur-xl shadow-2xl shadow-indigo-100/30 rounded-3xl border border-zinc-200 group-hover:border-blue-400 group-focus-within:border-blue-500 transition-all p-2">
              <div className="pl-4 pr-3 text-zinc-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates, 3D, music..."
                className="flex-1 bg-transparent text-zinc-900 placeholder:text-zinc-400 text-lg focus:outline-none py-3 min-w-0"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-8 py-3 rounded-2xl text-lg font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 active:scale-95"
              >
                Find
              </button>
            </div>
          </form>

          {/* Popular Searches */}
          <div className="mt-8 flex flex-wrap justify-center items-center gap-3">
            <span className="text-sm font-semibold text-zinc-400">Popular:</span>
            {popularSearches.map((tag) => (
              <Link
                key={tag.label}
                href={tag.href}
                className="text-sm text-zinc-600 bg-white border border-zinc-100 px-4 py-1.5 rounded-full hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm hover:shadow-md"
              >
                {tag.label}
              </Link>
            ))}
          </div>
        </motion.div>

      </div>

      {/* Modern Decor Elements */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-200/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-purple-200/20 rounded-full blur-[100px] pointer-events-none"></div>

    </section>
  );
}
