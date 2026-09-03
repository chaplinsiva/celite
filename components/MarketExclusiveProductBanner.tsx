// <!-- agent-notes: { ctx: "celite market exclusive pay-per-item ad banner for product detail page", deps: ["lucide-react", "lib/templateUtils.ts", "lib/utils.ts"], state: active, last: "sato@2026-09-03" } -->
import React from 'react';
import { Crown, ExternalLink, ShieldCheck, Sparkles, AlertCircle, ShoppingBag } from 'lucide-react';
import { cn } from '../lib/utils';
import { getCeliteMarketUrl } from '../lib/templateUtils';

interface MarketExclusiveProductBannerProps {
  slug: string;
  name?: string;
  price?: number | string | null;
  className?: string;
}

export default function MarketExclusiveProductBanner({
  slug,
  name,
  price,
  className
}: MarketExclusiveProductBannerProps) {
  const marketUrl = getCeliteMarketUrl(slug);
  const formattedPrice = price && Number(price) > 0 ? `₹${price}` : '₹399';

  return (
    <div
      className={cn(
        "relative rounded-3xl overflow-hidden p-6 sm:p-8",
        "bg-gradient-to-br from-[#0e101a] via-[#121422] to-[#0a0b12]",
        "border-2 border-amber-500/40 shadow-[0_0_50px_-10px_rgba(245,158,11,0.3)]",
        "transition-all duration-300 group",
        className
      )}
    >
      {/* Top Floating Amber Hairline */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent pointer-events-none" />

      {/* Ambient Radial Golden Glow */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/15 rounded-full blur-[70px] pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-yellow-500/10 rounded-full blur-[70px] pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-5">
        {/* Top Tag & Status */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-black tracking-wider uppercase">
            <Crown className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>Celite Market Exclusive</span>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-200/80 bg-black/40 px-2.5 py-1 rounded-md border border-white/5">
            <Sparkles className="w-3 h-3 text-amber-400" /> Pay-Per-Download Asset
          </span>
        </div>

        {/* Big Alert: NOT INCLUDED IN SUBSCRIPTION */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-400/30 flex items-start gap-3.5">
          <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center shrink-0 text-amber-400 mt-0.5">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-amber-300 tracking-wide mb-1">
              Not Included in Celite Subscription
            </h4>
            <p className="text-xs text-zinc-300 leading-relaxed">
              This template is an exclusive release sold individually on <strong>Celite Market</strong>. It cannot be unlocked or downloaded using standard Celite monthly subscription plans.
            </p>
          </div>
        </div>

        {/* Pricing & Callout Details */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div>
            <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block mb-1">
              Direct Pay-Per-Item Price
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-[900] text-white tracking-tight drop-shadow-md">
                {formattedPrice}
              </span>
              <span className="text-xs text-zinc-400 font-medium">/ one-time purchase</span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              Includes individual commercial license & instant file download.
            </p>
          </div>

          {/* Big Ad CTA Button */}
          <a
            href={marketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl",
              "bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500",
              "hover:from-amber-400 hover:to-yellow-400 text-black font-black text-sm sm:text-base",
              "shadow-[0_0_30px_rgba(245,158,11,0.5)] hover:shadow-[0_0_40px_rgba(245,158,11,0.7)]",
              "border border-amber-200/80 active:scale-[0.98] transition-all duration-300 text-center"
            )}
          >
            <ShoppingBag className="w-4 h-4 text-black stroke-[2.5]" />
            <span>Pay & Download on Celite Market</span>
            <ExternalLink className="w-4 h-4 text-black stroke-[2.5]" />
          </a>
        </div>

        {/* Trust Guarantees */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-4 border-t border-white/[0.08] text-[11px] text-zinc-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Verified Celite Market Creator</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Lifetime Access & Updates</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>Commercial License Included</span>
          </div>
        </div>
      </div>
    </div>
  );
}
