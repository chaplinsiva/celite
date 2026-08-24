"use client";

// agent-notes: { ctx: "Hero black box with floating blue border glow and white text", deps: [next/link, framer-motion, lucide-react], state: active, last: "tara@2026-08-24" }

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Download, Star, Check, ArrowRight } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative w-full py-4 md:py-6 px-4 sm:px-6 bg-[#fdf8f3]">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch">

          {/* Main Black Box with Floating Blue Border & Ambient Glow */}
          <div className="flex-[3] relative bg-gradient-to-br from-[#0d0f17] via-[#0a0b10] to-[#07080c] rounded-[1.5rem] overflow-hidden flex flex-col md:flex-row min-h-[280px] md:min-h-[340px] border border-blue-500/30 shadow-[0_0_50px_-15px_rgba(59,130,246,0.25)] group">
            
            {/* Top Subtle Floating Blue Glow Line */}
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400/60 to-transparent pointer-events-none" />

            {/* Delicate Floating Blue Ambient Light Orbs */}
            <div className="absolute -top-20 -left-20 w-80 h-80 bg-blue-600/15 rounded-full blur-[90px] pointer-events-none" />
            <div className="absolute -bottom-24 right-1/3 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none" />

            {/* Background Image Effect with Ultra-Smooth Feathered Blend */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
              <div className="absolute inset-y-0 right-0 w-full md:w-3/5 h-full [mask-image:linear-gradient(to_right,transparent_0%,rgba(0,0,0,0.2)_20%,rgba(0,0,0,0.75)_55%,black_90%)] md:[mask-image:linear-gradient(to_right,transparent_0%,rgba(0,0,0,0.35)_30%,black_80%)]">
                <img
                  src="/hero-simple.png"
                  alt="Creative Lifestyle"
                  className="w-full h-full object-cover object-center md:object-right opacity-80 md:opacity-95"
                />
                {/* Smooth soft ambient dark vignette for perfect contrast */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#0d0f17] via-transparent to-transparent opacity-40" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#07080c]/90 via-transparent to-transparent md:hidden" />
              </div>
            </div>

            {/* Content */}
            <div className="relative z-10 flex-1 flex flex-col justify-center p-6 sm:p-8 md:p-12">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.08] backdrop-blur-md border border-blue-400/30 text-cyan-200 text-xs font-semibold mb-4 w-fit shadow-sm"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8] animate-pulse" />
                <span>Curated Digital Marketplace</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl sm:text-5xl md:text-6xl font-[900] tracking-tight text-white leading-[0.95] mb-4 drop-shadow-xl"
              >
                CREATIVE <br className="hidden sm:block" />
                TEMPLATES
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-base sm:text-lg text-white/90 font-medium leading-relaxed max-w-xl mb-6 drop-shadow-sm"
              >
                Download thousands of premium After Effects templates, wedding invitations, cinematic intros, stock music &amp; SFX.
              </motion.p>

              {/* Primary & Secondary Hero CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="flex flex-wrap items-center gap-3"
              >
                <Link
                  href="/pricing?plan=monthly"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-[0_0_25px_rgba(59,130,246,0.5)] hover:shadow-[0_0_35px_rgba(59,130,246,0.7)] border border-blue-300/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>Get Unlimited Downloads</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/video-templates"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white font-semibold text-sm border border-white/15 backdrop-blur-md transition-all duration-300 hover:scale-[1.02]"
                >
                  <span>Explore Assets</span>
                </Link>
              </motion.div>
            </div>
          </div>

          {/* Pricing Card Section with Celite Theme */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex-1 min-w-[280px]"
          >
            <div className="h-full bg-gradient-to-br from-[#0d0f17] via-[#0a0b10] to-[#07080c] rounded-[1.5rem] p-6 md:p-8 shadow-[0_0_50px_-15px_rgba(59,130,246,0.25)] border border-blue-500/30 flex flex-col relative overflow-hidden group">
              {/* Premium top accent hairline gradient */}
              <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-400/80 to-transparent pointer-events-none" />
              
              {/* Ambient radial flare */}
              <div className="absolute -top-20 -right-20 w-60 h-60 bg-blue-600/15 rounded-full blur-[80px] pointer-events-none" />

              <div className="mb-5 relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                    Limited Offer
                  </span>
                  <span className="text-zinc-500 text-xs font-semibold line-through">₹899</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl md:text-4xl font-black text-white tracking-tight drop-shadow-md">
                    ₹799
                  </span>
                  <span className="text-zinc-400 font-semibold text-sm">/month</span>
                </div>
                <p className="text-[11px] text-blue-300 font-medium mt-1">Limited Time Special Offer</p>
              </div>

              <ul className="space-y-3.5 mb-6 flex-1 relative z-10">
                {[
                  { icon: Download, text: 'Unlimited After Effects templates' },
                  { icon: Star, text: 'Stock music, SFX & images' },
                  { icon: Check, text: 'Commercial license included' },
                  { icon: ArrowRight, text: 'Cancel anytime' }
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-zinc-200 font-medium text-sm">
                    <div className="w-5 h-5 rounded-full bg-blue-500/15 border border-blue-400/25 text-blue-400 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-3 h-3" />
                    </div>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/pricing?plan=monthly"
                className="relative z-10 w-full bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3.5 md:py-4 rounded-xl font-bold text-center text-sm border border-blue-300/30 shadow-[0_0_20px_rgba(59,130,246,0.35)] hover:shadow-[0_0_28px_rgba(59,130,246,0.6)] transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 group/btn"
              >
                <span>Get unlimited downloads</span>
                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
