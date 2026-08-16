"use client";

// agent-notes: { ctx: "Celite BlogCard component with Obsidian dark styling and floating blue borders", deps: [next/link, lucide-react], state: active, last: "sato@2026-08-16" }

import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Clock, ArrowRight, Sparkles } from 'lucide-react';
import type { BlogPost } from '@/data/blogData';

interface BlogCardProps {
  post: BlogPost;
  featured?: boolean;
}

export default function BlogCard({ post, featured = false }: BlogCardProps) {
  const isFeatured = featured || post.featured;
  return (
    <article className="group relative h-full flex flex-col">
      <Link
        href={`/blogs/${post.slug}`}
        className="relative flex flex-col h-full bg-gradient-to-br from-[#0d0f17] via-[#0a0b10] to-[#07080c] rounded-2xl overflow-hidden border border-blue-500/20 hover:border-blue-400/50 shadow-[0_0_30px_-15px_rgba(59,130,246,0.15)] hover:shadow-[0_0_40px_-10px_rgba(59,130,246,0.3)] transition-all duration-300 transform hover:-translate-y-1"
      >
        {/* Top Floating Glow Hairline */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10" />

        {/* Ambient Radial Flare on Hover */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-600/10 rounded-full blur-[60px] pointer-events-none group-hover:bg-blue-500/20 transition-all duration-300" />

        {/* Cover Image / Thumbnail with smooth mask */}
        <div className="relative w-full h-48 sm:h-52 overflow-hidden bg-zinc-900">
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover object-center group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f17] via-transparent to-transparent opacity-80" />

          {/* Category Pill */}
          <div className="absolute top-3.5 left-3.5 z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0a0b10]/80 backdrop-blur-md border border-blue-400/30 text-blue-200 text-xs font-semibold shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_#60a5fa] animate-pulse" />
              {post.category}
            </span>
          </div>

          {isFeatured && (
            <div className="absolute top-3.5 right-3.5 z-10">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-blue-500/20 backdrop-blur-md border border-amber-400/40 text-amber-300 text-[11px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-amber-300" />
                Featured
              </span>
            </div>
          )}
        </div>

        {/* Body Content */}
        <div className="flex-1 flex flex-col p-5 sm:p-6 justify-between">
          <div>
            {/* Meta row: Date & Reading Time */}
            <div className="flex items-center gap-4 text-xs text-zinc-400 mb-3">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                {new Date(post.publishedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                {post.readTime}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-blue-300 transition-colors duration-200 line-clamp-2 leading-snug mb-2.5">
              {post.title}
            </h3>

            {/* Excerpt */}
            <p className="text-sm text-zinc-400 line-clamp-3 leading-relaxed mb-4">
              {post.excerpt}
            </p>
          </div>

          {/* Footer: Author & Read More Link */}
          <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-auto">
            <div className="flex items-center gap-2">
              <div className="relative w-6 h-6 rounded-full overflow-hidden border border-blue-400/40 bg-zinc-800">
                <Image
                  src={post.author.avatar}
                  alt={post.author.name}
                  fill
                  className="object-cover"
                />
              </div>
              <span className="text-xs font-medium text-zinc-300">
                {post.author.name}
              </span>
            </div>

            <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 group-hover:text-blue-300 group-hover:translate-x-0.5 transition-all duration-200">
              Read Article
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
