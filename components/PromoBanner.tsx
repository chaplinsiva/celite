"use client";

// agent-notes: { ctx: "Promo banner with Celite obsidian blue aesthetic and glowing CTA", deps: [next/link, lucide-react], state: active, last: "tara@2026-08-24" }

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function PromoBanner() {
    return (
        <div className="relative w-full bg-gradient-to-r from-[#080a10] via-[#0d1629] to-[#080a10] text-white py-2 sm:py-2.5 px-4 sm:px-8 border-b border-blue-500/25 shadow-[0_4px_25px_-5px_rgba(37,99,235,0.25)] overflow-hidden z-40">
            {/* Top/Bottom Subtle Ambient Hairline Glow */}
            <div className="absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400/60 to-transparent pointer-events-none" />

            {/* Ambient Radial Blue Flare */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-12 bg-blue-500/15 blur-2xl pointer-events-none" />

            <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm font-medium relative z-10">
                <div className="flex items-center gap-2 flex-wrap justify-center text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-200 text-[11px] sm:text-xs font-bold tracking-wide shadow-sm">
                        <span>⚡</span>
                        <span>Limited Time Offer</span>
                    </span>
                    <span className="text-zinc-200 flex items-center gap-1.5">
                        <span className="text-zinc-400 line-through text-xs font-semibold">₹899</span>
                        <strong className="text-white font-black text-sm text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200">₹799</strong>
                        <span className="text-xs text-zinc-300">/ month</span>
                    </span>
                    <span className="hidden sm:inline text-blue-400">•</span>
                    <span className="font-bold text-white tracking-tight">Unlimited Downloads</span>
                </div>

                <Link
                    href="/pricing?plan=monthly"
                    className="group bg-white hover:bg-blue-50 text-blue-700 px-3.5 sm:px-4 py-1 rounded-full text-[11px] sm:text-xs font-black shadow-[0_0_18px_rgba(255,255,255,0.3)] hover:shadow-[0_0_22px_rgba(59,130,246,0.5)] hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-1.5 whitespace-nowrap shrink-0 border border-white/80"
                >
                    <span>Get it now</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </Link>
            </div>
        </div>
    );
}
