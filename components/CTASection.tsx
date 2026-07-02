"use client";

import Link from "next/link";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { GlowingEffect } from "@/components/ui/glowing-effect";

export default function CTASection() {
  return (
    <section className="relative w-full py-20 sm:py-24 md:py-28 overflow-hidden bg-background">
      {/* Colorful Background Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute top-1/2 right-0 w-96 h-96 bg-indigo-100/40 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-violet-100/40 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-indigo-50/30"></div>
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Main CTA Card */}
        <div className="relative rounded-[1.5rem] border border-zinc-100 p-2 shadow-xl shadow-blue-900/5 bg-white">
          <GlowingEffect
            spread={40}
            glow={true}
            disabled={false}
            proximity={64}
            inactiveZone={0.01}
            borderWidth={3}
          />
          <div className="relative rounded-xl border border-zinc-100 bg-zinc-50/80 backdrop-blur-sm p-8 sm:p-12 md:p-16 shadow-inner">
            {/* Content */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center mb-6">
                <div className="relative w-fit">
                  <img
                    src="/PNG1.png"
                    alt="Celite Logo"
                    className="h-10 w-auto"
                  />
                </div>
              </div>

              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-zinc-900 mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-lg text-zinc-500 mb-8 max-w-2xl mx-auto">
                Join thousands of creators and professionals who are already using our templates to create amazing content
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link href="/pricing">
                  <LiquidButton className="text-white bg-blue-600 hover:bg-blue-700 border-none rounded-full" size="lg">
                    Get Started
                  </LiquidButton>
                </Link>
                <Link
                  href="/video-templates"
                  className="relative px-8 py-3 rounded-full border border-zinc-200 bg-white text-zinc-700 font-semibold text-sm hover:bg-zinc-50 hover:border-zinc-300 transition-all duration-200 shadow-sm"
                >
                  Browse Templates
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

