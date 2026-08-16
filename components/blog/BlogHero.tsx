"use client";

// agent-notes: { ctx: "Celite Blog Hero header with interactive search and category filtering", deps: [lucide-react, data/blogData], state: active, last: "sato@2026-08-16" }

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Sparkles, ArrowRight, BookOpen, Layers } from 'lucide-react';
import type { BlogPost } from '@/data/blogData';
import BlogCard from './BlogCard';

interface BlogHeroProps {
  initialPosts: BlogPost[];
  categories: { name: string; slug: string; count: number }[];
}

export default function BlogHero({ initialPosts, categories }: BlogHeroProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const featuredPost = useMemo(() => {
    return initialPosts.find((p) => p.featured) || initialPosts[0];
  }, [initialPosts]);

  const filteredPosts = useMemo(() => {
    return initialPosts.filter((post) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'all' || post.categorySlug === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [initialPosts, searchQuery, selectedCategory]);

  return (
    <div className="w-full">
      {/* Hero Header Section */}
      <div className="relative mb-12 sm:mb-16">
        {/* Glowing Background Radial Light Orbs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-72 bg-gradient-to-b from-blue-600/15 via-cyan-500/5 to-transparent rounded-full blur-[100px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center pt-8 sm:pt-12 px-4">
          {/* Glassmorphic Badge Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] backdrop-blur-md border border-blue-400/30 text-blue-200 text-xs font-semibold mb-6 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_10px_#60a5fa] animate-pulse" />
            <span>Celite Editorial &amp; Motion Design Journal</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-[900] tracking-tight text-white leading-[1.05] mb-6 drop-shadow-md">
            Master the Craft of <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-white">
              Motion &amp; Video Production
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-zinc-300 max-w-2xl mx-auto leading-relaxed mb-8">
            Expert guides, workflow breakdowns, After Effects techniques, and sound design tutorials written directly by Celite’s creative team.
          </p>

          {/* Search Input Bar */}
          <div className="relative max-w-xl mx-auto mb-8">
            <div className="relative flex items-center">
              <Search className="absolute left-4 w-5 h-5 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tutorials, wedding templates, 3D workflows, SFX..."
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-[#0d0f17]/90 backdrop-blur-md border border-blue-500/30 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 shadow-[0_0_30px_-10px_rgba(59,130,246,0.2)] transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 px-2 py-1 text-xs text-zinc-400 hover:text-white bg-white/10 rounded-md transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white border border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                  : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              All Articles ({initialPosts.length})
            </button>

            {categories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => setSelectedCategory(cat.slug)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                  selectedCategory === cat.slug
                    ? 'bg-blue-600 text-white border border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                    : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/10'
                }`}
              >
                {cat.name} ({cat.count})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Featured Highlight Card (shown when no search filter active) */}
      {!searchQuery && selectedCategory === 'all' && featuredPost && (
        <div className="mb-14">
          <div className="relative bg-gradient-to-br from-[#0d0f17] via-[#0a0b10] to-[#07080c] rounded-3xl overflow-hidden border border-blue-500/30 shadow-[0_0_50px_-15px_rgba(59,130,246,0.25)] group p-6 sm:p-8 md:p-10">
            {/* Top Accent Line */}
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400/60 to-transparent pointer-events-none" />

            {/* Ambient Flares */}
            <div className="absolute -top-20 -left-20 w-80 h-80 bg-blue-600/15 rounded-full blur-[90px] pointer-events-none" />
            <div className="absolute -bottom-24 right-1/3 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
              <div className="lg:col-span-7 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-300 text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    Featured Editorial
                  </span>
                  <span className="text-xs text-zinc-400">
                    {featuredPost.readTime}
                  </span>
                </div>

                <Link href={`/blogs/${featuredPost.slug}`}>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-[900] text-white group-hover:text-blue-300 transition-colors leading-tight mb-4 drop-shadow-sm">
                    {featuredPost.title}
                  </h2>
                </Link>

                <p className="text-sm sm:text-base text-zinc-300 leading-relaxed mb-6 line-clamp-3">
                  {featuredPost.excerpt}
                </p>

                <div className="flex flex-wrap items-center gap-4">
                  <Link
                    href={`/blogs/${featuredPost.slug}`}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-[0_0_25px_rgba(59,130,246,0.4)] transition-all transform hover:-translate-y-0.5"
                  >
                    Read Full Story
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <span>Written by </span>
                    <strong className="text-zinc-200 font-medium">{featuredPost.author.name}</strong>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 relative h-64 sm:h-72 lg:h-80 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                <Image
                  src={featuredPost.coverImage}
                  alt={featuredPost.title}
                  fill
                  priority
                  className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#07080c] via-transparent to-transparent opacity-60" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid of Articles */}
      <div>
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-bold text-white">
              {searchQuery
                ? `Search Results (${filteredPosts.length})`
                : selectedCategory === 'all'
                ? 'Latest Articles & Guides'
                : `${categories.find((c) => c.slug === selectedCategory)?.name || 'Category'} Articles`}
            </h2>
          </div>

          <span className="text-xs text-zinc-400 font-medium">
            Showing {filteredPosts.length} {filteredPosts.length === 1 ? 'article' : 'articles'}
          </span>
        </div>

        {filteredPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredPosts.map((post) => (
              <BlogCard key={post.slug} post={post} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 px-4 bg-[#0d0f17] rounded-2xl border border-white/10 max-w-lg mx-auto">
            <Layers className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No articles found</h3>
            <p className="text-sm text-zinc-400 mb-6">
              We couldn&apos;t find any tutorials matching &quot;{searchQuery}&quot;. Try exploring another topic or clearing your filter.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
