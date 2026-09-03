// <!-- agent-notes: { ctx: "crown badge component for celite market exclusive templates", deps: ["lucide-react", "lib/utils.ts"], state: active, last: "sato@2026-09-03" } -->
import React from 'react';
import { Crown } from 'lucide-react';
import { cn } from '../lib/utils';

interface MarketExclusiveBadgeProps {
  price?: number | string | null;
  className?: string;
  variant?: 'card' | 'product' | 'subtle';
}

export default function MarketExclusiveBadge({
  price,
  className,
  variant = 'card'
}: MarketExclusiveBadgeProps) {
  if (variant === 'product') {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1 rounded-full",
          "bg-amber-50 border border-amber-300 text-amber-950",
          "shadow-xs transition-all",
          className
        )}
      >
        <span className="w-5 h-5 rounded-full bg-amber-400 text-black flex items-center justify-center shadow-xs shrink-0">
          <Crown className="w-3 h-3 fill-black text-black stroke-[2.5]" />
        </span>
        <span className="text-xs font-bold text-amber-900 tracking-tight">
          Celite Market Exclusive
        </span>
        {price !== undefined && price !== null && Number(price) > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-black text-xs border border-amber-300">
            ₹{price}
          </span>
        )}
      </div>
    );
  }

  if (variant === 'subtle') {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md",
          "bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-semibold",
          className
        )}
      >
        <Crown className="w-3 h-3 fill-amber-400 text-amber-400" />
        <span>Market Exclusive</span>
      </div>
    );
  }

  // Default 'card' overlay badge
  return (
    <div
      className={cn(
        "z-20 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full",
        "bg-[#0d0f19]/90 text-amber-300 border border-amber-400/60",
        "shadow-[0_4px_16px_rgba(0,0,0,0.6),0_0_12px_rgba(245,158,11,0.35)] backdrop-blur-md",
        "text-[10px] sm:text-[11px] font-extrabold tracking-wider uppercase transition-all duration-300",
        "group-hover:border-amber-300 group-hover:shadow-[0_0_20px_rgba(245,158,11,0.6)] group-hover:scale-105",
        className
      )}
    >
      <span className="w-4 h-4 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-black flex items-center justify-center shadow-[0_0_8px_rgba(245,158,11,0.8)]">
        <Crown className="w-2.5 h-2.5 fill-black text-black stroke-[2.5]" />
      </span>
      <span className="bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 bg-clip-text text-transparent drop-shadow-sm font-black">
        Market
      </span>
      {price !== undefined && price !== null && Number(price) > 0 && (
        <span className="text-zinc-400 font-normal pl-0.5">
          ₹{price}
        </span>
      )}
    </div>
  );
}
