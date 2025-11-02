import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LiquidButton } from "@/components/ui/liquid-glass-button";

export default function CTASection() {
  return (
    <section className="relative w-full py-20 sm:py-24 md:py-28 overflow-hidden bg-black">
      {/* Decorative Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 md:px-8 text-center">
        {/* Content */}
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
          Ready to Get Started?
        </h2>
        <p className="text-lg text-zinc-400 mb-8 max-w-2xl mx-auto">
          Join thousands of creators and professionals who are already using our templates to create amazing content
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/pricing">
            <LiquidButton className="text-white border rounded-full" size="lg">
              View Pricing
              <ArrowRight className="ml-2 w-4 h-4" />
            </LiquidButton>
          </Link>
          <Link
            href="/templates"
            className="px-8 py-3 rounded-full border border-white/30 text-white font-semibold text-sm hover:bg-white/10 transition"
          >
            Browse Templates
          </Link>
        </div>
      </div>
    </section>
  );
}

