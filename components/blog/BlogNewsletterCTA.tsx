"use client";

// agent-notes: { ctx: "Celite Blog subscription & template CTA banner", deps: [next/link, lucide-react], state: active, last: "sato@2026-08-16" }

import Link from 'next/link';
import { Sparkles, ArrowRight, Zap, DownloadCloud } from 'lucide-react';

export default function BlogNewsletterCTA() {
  return (
    <div className="relative my-12 overflow-hidden rounded-2xl bg-gradient-to-br from-[#0d0f17] via-[#0a0b10] to-[#07080c] border border-blue-500/30 p-6 sm:p-10 shadow-[0_0_50px_-15px_rgba(59,130,246,0.25)]">
      {/* Top Floating Glow Hairline */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400/60 to-transparent pointer-events-none" />

      {/* Atmospheric Ambient Light Orbs */}
      <div className="absolute -top-16 -left-16 w-64 h-64 bg-blue-600/20 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-cyan-500/15 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="max-w-xl text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-300 text-xs font-semibold mb-3">
            <Zap className="w-3.5 h-3.5 text-blue-400" />
            <span>Celite Pro Subscription</span>
          </div>

          <h3 className="text-2xl sm:text-3xl font-[900] text-white tracking-tight leading-tight mb-2">
            Unlock Unlimited After Effects Templates &amp; Music
          </h3>

          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
            Download wedding save the date videos, cinematic intros, 3D models, stock photos, and sound effects with full commercial license.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <Link
            href="/pricing"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-[0_0_30px_rgba(59,130,246,0.4)] transition-all transform hover:-translate-y-0.5"
          >
            <Sparkles className="w-4 h-4 text-blue-200" />
            <span>Get Unlimited Access</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/video-templates"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-semibold transition-all"
          >
            <DownloadCloud className="w-4 h-4 text-zinc-400" />
            <span>Explore Catalog</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
