"use client";

import Link from 'next/link';

export default function Hero() {
  return (
    <section className="relative w-full min-h-[60vh] flex items-center justify-center px-6 py-20 sm:py-32">
      <div className="max-w-5xl mx-auto text-center space-y-8">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight">
          Built. Create. Inspire
        </h1>
        <p className="text-lg sm:text-xl text-zinc-300 max-w-2xl mx-auto">
          Elevate your videos with premium templates for logo reveals, slideshows, and cinematic effects.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
          <Link
            href="/templates"
            className="px-8 py-3 rounded-full bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition"
          >
            Browse Templates
          </Link>
          <Link
            href="/pricing"
            className="px-8 py-3 rounded-full border border-white/30 text-white font-semibold text-sm hover:bg-white/10 transition"
          >
            View Pricing
          </Link>
        </div>
      </div>
    </section>
  );
}
