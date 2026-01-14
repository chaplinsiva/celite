"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Download, Star, Check, ArrowRight } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative w-full py-4 md:py-6 px-4 sm:px-6 bg-[#fdf8f3]">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch">

          {/* Main Dark Banner */}
          <div className="flex-[3] relative bg-[#1a1a1a] rounded-[1.5rem] overflow-hidden flex flex-col md:flex-row min-h-[280px] md:min-h-[320px]">
            {/* Background Image Effect */}
            <div className="absolute inset-0 z-0">
              <div className="absolute inset-y-0 right-0 w-full md:w-1/2 h-full">
                <img
                  src="/hero-simple.png"
                  alt="Creative Lifestyle"
                  className="w-full h-full object-cover opacity-80 md:opacity-100"
                />
                {/* Gradient Fade to Black */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a1a] via-[#1a1a1a]/40 to-transparent"></div>
              </div>
            </div>

            {/* Content */}
            <div className="relative z-10 flex-1 flex flex-col justify-center p-6 md:p-10">
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-6 h-6 bg-[#2563eb] rounded-full mb-4 invisible md:visible"
              />

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl sm:text-5xl md:text-6xl font-[900] tracking-tighter text-[#2563eb] leading-[0.9] mb-4"
              >
                PLACE OF <br className="hidden sm:block" />
                CREATIVITY
              </motion.h1>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="max-w-lg"
              >
                <p className="text-base sm:text-lg md:text-xl font-bold text-white leading-tight mb-2">
                  Unlimited After Effects templates, stock music, sfx, stock images, 3d models all like that
                </p>
                <p className="text-white/60 text-[10px]">
                  ^2026 New Year Gift Try Remo After Effects Template as Free
                </p>
              </motion.div>
            </div>
          </div>

          {/* Pricing Card Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex-1 min-w-[280px]"
          >
            <div className="h-full bg-white rounded-[1.5rem] p-6 md:p-8 shadow-xl border border-zinc-100 flex flex-col">
              <div className="mb-4">
                <p className="text-zinc-500 text-xs font-medium mb-1">From</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl md:text-4xl font-black text-zinc-900">₹799</span>
                  <span className="text-zinc-500 font-medium text-sm">/month</span>
                </div>
              </div>

              <ul className="space-y-3 mb-6 flex-1">
                {[
                  { icon: Download, text: 'Unlimited After Effects templates' },
                  { icon: Star, text: 'Stock music, SFX & images' },
                  { icon: Check, text: 'Commercial license included' },
                  { icon: ArrowRight, text: 'Cancel anytime' }
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-zinc-700 font-semibold text-sm">
                    <item.icon className="w-4 h-4 flex-shrink-0 text-zinc-400" />
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/pricing"
                className="w-full bg-[#2563eb] text-white py-3 md:py-4 rounded-xl font-bold text-center text-sm hover:bg-blue-700 transition-all active:scale-[0.98] shadow-lg shadow-blue-600/20"
              >
                Get unlimited downloads
              </Link>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
