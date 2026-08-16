"use client";

// agent-notes: { ctx: "Celite Blog detail reading view with TOC, FAQ accordion, social sharing, and related posts", deps: [next/link, next/image, lucide-react], state: active, last: "sato@2026-08-16" }

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Calendar,
  Clock,
  ChevronRight,
  Share2,
  Check,
  Twitter,
  Linkedin,
  ChevronDown,
  Sparkles,
  ArrowLeft,
  BookOpen,
  HelpCircle,
  Tag
} from 'lucide-react';
import type { BlogPost } from '@/data/blogData';
import BlogCard from './BlogCard';
import BlogNewsletterCTA from './BlogNewsletterCTA';

interface BlogArticleViewProps {
  post: BlogPost;
  relatedPosts: BlogPost[];
}

export default function BlogArticleView({ post, relatedPosts }: BlogArticleViewProps) {
  const [copied, setCopied] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [readingProgress, setReadingProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = (window.scrollY / totalHeight) * 100;
        setReadingProgress(Math.min(100, Math.max(0, progress)));
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShareTwitter = () => {
    if (typeof window !== 'undefined') {
      const url = encodeURIComponent(window.location.href);
      const text = encodeURIComponent(`${post.title} via @celite`);
      window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank');
    }
  };

  const handleShareLinkedIn = () => {
    if (typeof window !== 'undefined') {
      const url = encodeURIComponent(window.location.href);
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
    }
  };

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-[#07080c] text-zinc-100 selection:bg-blue-500 selection:text-white">
      {/* Top Reading Progress Bar */}
      <div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-500 z-50 transition-all duration-100 ease-out"
        style={{ width: `${readingProgress}%` }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-zinc-400 mb-8 overflow-x-auto whitespace-nowrap pb-2">
          <Link href="/" className="hover:text-white transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3 h-3 text-zinc-600 flex-shrink-0" />
          <Link href="/blogs" className="hover:text-white transition-colors">
            Blogs &amp; Guides
          </Link>
          <ChevronRight className="w-3 h-3 text-zinc-600 flex-shrink-0" />
          <span className="text-blue-300 font-medium truncate max-w-xs sm:max-w-md">
            {post.title}
          </span>
        </nav>

        {/* Back Link */}
        <div className="mb-6">
          <Link
            href="/blogs"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 px-3.5 py-1.5 rounded-lg border border-white/10 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to all articles</span>
          </Link>
        </div>

        {/* Article Header & Hero */}
        <header className="relative mb-12">
          {/* Ambient Flares */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-full max-w-3xl h-60 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 max-w-4xl">
            {/* Category Badge & Meta */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-300 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_#60a5fa] animate-pulse" />
                {post.category}
              </span>

              <span className="text-xs text-zinc-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                {new Date(post.publishedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>

              <span className="text-zinc-600">•</span>

              <span className="text-xs text-zinc-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                {post.readTime}
              </span>
            </div>

            {/* Main Title */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-[900] tracking-tight text-white leading-[1.1] mb-6 drop-shadow-md">
              {post.title}
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-xl text-zinc-300 leading-relaxed mb-8">
              {post.subtitle}
            </p>

            {/* Author Profile Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-[#0d0f17] to-[#0a0b10] border border-blue-500/20 shadow-md">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-full overflow-hidden border border-blue-400/50 bg-zinc-800">
                  <Image
                    src={post.author.avatar}
                    alt={post.author.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-white">{post.author.name}</h3>
                    <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 text-[10px] font-semibold border border-blue-400/30">
                      Official
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">{post.author.role}</p>
                </div>
              </div>

              {/* Share Actions */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 font-medium hidden sm:inline">Share:</span>
                <button
                  onClick={handleShareTwitter}
                  title="Share on Twitter / X"
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-blue-400 border border-white/10 transition-colors"
                >
                  <Twitter className="w-4 h-4" />
                </button>
                <button
                  onClick={handleShareLinkedIn}
                  title="Share on LinkedIn"
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-blue-400 border border-white/10 transition-colors"
                >
                  <Linkedin className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCopyLink}
                  title="Copy link to clipboard"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 hover:text-white border border-white/10 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Featured Cover Image */}
        <div className="relative w-full h-64 sm:h-96 md:h-[440px] rounded-2xl overflow-hidden border border-blue-500/30 shadow-[0_0_50px_-15px_rgba(59,130,246,0.2)] mb-12">
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07080c]/80 via-transparent to-transparent" />
        </div>

        {/* Article Body Content & Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Main Prose Content */}
          <main className="lg:col-span-8">
            {/* Custom Celite Obsidian Article Styling */}
            <div
              className="blog-prose"
              dangerouslySetInnerHTML={{ __html: post.contentHtml }}
            />

            {/* Tags Section */}
            <div className="mt-10 pt-6 border-t border-white/10">
              <div className="flex items-center gap-2 text-xs text-zinc-400 mb-3">
                <Tag className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-semibold uppercase tracking-wider text-zinc-300">Topics:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-zinc-300 hover:border-blue-400/40 hover:text-white transition-colors"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Author Detailed Bio Card */}
            <div className="my-12 p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-[#0d0f17] to-[#0a0b10] border border-blue-500/20 shadow-md">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-blue-400 bg-zinc-800 flex-shrink-0">
                  <Image
                    src={post.author.avatar}
                    alt={post.author.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-white">{post.author.name}</h3>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-400/30">
                      Author
                    </span>
                  </div>
                  <p className="text-xs text-blue-300 font-medium mb-2">{post.author.role}</p>
                  <p className="text-sm text-zinc-400 leading-relaxed">{post.author.bio}</p>
                </div>
              </div>
            </div>

            {/* FAQ Section */}
            {post.faqs && post.faqs.length > 0 && (
              <section className="my-12">
                <div className="flex items-center gap-2 mb-6">
                  <HelpCircle className="w-5 h-5 text-blue-400" />
                  <h2 className="text-2xl font-bold text-white">Frequently Asked Questions</h2>
                </div>

                <div className="space-y-3">
                  {post.faqs.map((faq, index) => (
                    <div
                      key={faq.question}
                      className="rounded-xl bg-[#0d0f17] border border-white/10 overflow-hidden transition-colors"
                    >
                      <button
                        onClick={() => toggleFaq(index)}
                        className="w-full flex items-center justify-between p-4 sm:p-5 text-left text-sm sm:text-base font-semibold text-white hover:text-blue-300 transition-colors"
                      >
                        <span>{faq.question}</span>
                        <ChevronDown
                          className={`w-4 h-4 text-zinc-400 flex-shrink-0 transition-transform duration-200 ${
                            openFaqIndex === index ? 'transform rotate-180 text-blue-400' : ''
                          }`}
                        />
                      </button>

                      {openFaqIndex === index && (
                        <div className="px-4 sm:px-5 pb-5 pt-1 text-sm text-zinc-400 leading-relaxed border-t border-white/5 bg-[#0a0b10]/50">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Celite Pro Callout Banner */}
            <BlogNewsletterCTA />
          </main>

          {/* Sticky Sidebar */}
          <aside className="lg:col-span-4 space-y-8">
            <div className="sticky top-24 space-y-6">
              {/* Celite Promo Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0d0f17] to-[#0a0b10] border border-blue-500/30 shadow-[0_0_30px_-10px_rgba(59,130,246,0.2)]">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-blue-300">
                    Celite Marketplace
                  </h3>
                </div>
                <h4 className="text-lg font-bold text-white mb-2">
                  Explore High-Converting Video Templates
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                  Wedding invitations, cinematic intros, royalty-free audio, and 3D models curated for video editors.
                </p>
                <Link
                  href="/pricing"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition-all"
                >
                  <span>Join Celite Pro</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Related Category Links */}
              <div className="p-6 rounded-2xl bg-[#0d0f17] border border-white/10">
                <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-400" />
                  <span>Popular Assets</span>
                </h3>
                <ul className="space-y-2.5 text-xs">
                  <li>
                    <Link
                      href="/video-templates"
                      className="text-zinc-400 hover:text-white flex items-center justify-between py-1 transition-colors"
                    >
                      <span>After Effects Video Templates</span>
                      <ChevronRight className="w-3 h-3 text-zinc-600" />
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/3d-models"
                      className="text-zinc-400 hover:text-white flex items-center justify-between py-1 transition-colors"
                    >
                      <span>3D Models &amp; Meshes</span>
                      <ChevronRight className="w-3 h-3 text-zinc-600" />
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/music-sfx"
                      className="text-zinc-400 hover:text-white flex items-center justify-between py-1 transition-colors"
                    >
                      <span>Royalty-Free Music &amp; SFX</span>
                      <ChevronRight className="w-3 h-3 text-zinc-600" />
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/stock-photos"
                      className="text-zinc-400 hover:text-white flex items-center justify-between py-1 transition-colors"
                    >
                      <span>Stock Photos</span>
                      <ChevronRight className="w-3 h-3 text-zinc-600" />
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </aside>
        </div>

        {/* Related Articles Section */}
        {relatedPosts.length > 0 && (
          <section className="mt-16 pt-12 border-t border-white/10">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-[900] text-white">Recommended Reading</h2>
                <p className="text-sm text-zinc-400">Expand your video editing and motion design skills.</p>
              </div>
              <Link
                href="/blogs"
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <span>View all articles</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map((relPost) => (
                <BlogCard key={relPost.slug} post={relPost} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
