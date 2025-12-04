'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Check, Lock } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import { formatPrice } from '@/lib/currency';
import { GlowingEffect } from '@/components/ui/glowing-effect';
import { cn } from '@/lib/utils';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function PricingContent() {
  const [monthlyPrice, setMonthlyPrice] = useState<number | null>(null);
  const [yearlyPrice, setYearlyPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPrices = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: settings } = await supabase.from('settings').select('key,value');
        const settingsMap: Record<string, string> = {};
        (settings || []).forEach((row: any) => { settingsMap[row.key] = row.value; });
        
        // Get amounts in paise from backend only
        const monthlyPaiseStr = settingsMap.RAZORPAY_MONTHLY_AMOUNT;
        const yearlyPaiseStr = settingsMap.RAZORPAY_YEARLY_AMOUNT;
        
        if (!monthlyPaiseStr || !yearlyPaiseStr) {
          throw new Error('Subscription prices not found in database');
        }
        
        let monthlyPaise = Number(monthlyPaiseStr);
        let yearlyPaise = Number(yearlyPaiseStr);
        
        // Convert from paise to INR
        // If >= 10000 for monthly or >= 100000 for yearly, it's in paise, divide by 100
        // Otherwise, it's already in rupees
        if (monthlyPaise >= 10000) {
          monthlyPaise = monthlyPaise / 100;
        }
        if (yearlyPaise >= 100000) {
          yearlyPaise = yearlyPaise / 100;
        }
        
        setMonthlyPrice(Math.round(monthlyPaise));
        setYearlyPrice(Math.round(yearlyPaise));
      } catch (error) {
        console.error('Error loading prices:', error);
        // Don't set default values - show error state
      } finally {
        setLoading(false);
      }
    };
    
    loadPrices();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading pricing..." />;
  }

  if (monthlyPrice === null || yearlyPrice === null) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">Unable to load pricing information. Please try again later.</p>
      </div>
    );
  }

  return (
    <>
      <section className="relative max-w-5xl mx-auto text-center mb-16">
        <span className="uppercase tracking-[0.4em] text-xs text-zinc-400">Pricing</span>
        <h1 className="mt-4 text-4xl md:text-5xl font-bold text-white">Choose Your Plan</h1>
        <p className="mt-6 text-lg text-zinc-300 leading-relaxed">
          Unlock unlimited access to premium templates and elevate your creative projects.
        </p>
      </section>

      <section className="relative max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch max-w-4xl mx-auto">
          {/* Monthly Plan */}
          <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-white/10 p-2 md:rounded-[1.5rem] md:p-3">
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
              borderWidth={3}
            />
            <div className="relative flex flex-col justify-between h-full overflow-hidden rounded-xl border-[0.75px] border-purple-500/20 bg-gradient-to-br from-purple-600/20 via-blue-500/15 to-purple-600/10 backdrop-blur-sm p-6 md:p-8 shadow-lg shadow-purple-500/20">
              <div className="absolute top-4 right-4 z-20 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                Popular
              </div>
              <div className="space-y-4 mb-6">
                <div>
                  <h2 className="font-medium text-white text-lg mb-2">Monthly</h2>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xl text-zinc-500 line-through">₹899</span>
                    <span className="block text-3xl font-semibold text-white">₹599 / month</span>
                  </div>
                  <p className="text-zinc-400 text-sm">Billed monthly</p>
                  <p className="text-xs text-purple-400 mt-1">Limited offer</p>
                </div>
                <Button
                  asChild
                  className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 font-semibold border-0 shadow-lg shadow-purple-500/30 py-6 text-lg transition-all hover:scale-[1.02]"
                  variant="default"
                >
                  <Link href="/checkout?subscription=monthly">
                    Subscribe Now
                  </Link>
                </Button>
              </div>
              <ul className="border-t border-white/10 pt-4 space-y-3 text-sm">
                {[
                  "Unlimited Premium Templates",
                  "Full Source File Access",
                  "Commercial License",
                  "Priority Support",
                  "Regular Updates"
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-zinc-300">
                    <Check className="size-4 text-purple-400 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Yearly Plan */}
          <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-white/10 p-2 md:rounded-[1.5rem] md:p-3">
            <div className="relative flex flex-col justify-between h-full overflow-hidden rounded-xl border-[0.75px] border-white/10 bg-black/40 backdrop-blur-sm p-6 md:p-8 shadow-sm">
              <div className="space-y-4 mb-6">
                <div>
                  <h2 className="font-medium text-white text-lg mb-2">Yearly</h2>
                  <span className="block text-3xl font-semibold text-white mb-2">₹5,499 / year</span>
                  <p className="text-zinc-400 text-sm">Billed yearly. Save more with annual plan.</p>
                </div>
                <Button
                  asChild
                  className="w-full bg-white text-black hover:bg-zinc-200 font-semibold border-0 shadow-md py-6 text-lg transition-all hover:scale-[1.02]"
                  variant="default"
                >
                  <Link href="/checkout?subscription=yearly">
                    Subscribe Now
                  </Link>
                </Button>
              </div>
              <ul className="border-t border-white/10 pt-4 space-y-3 text-sm">
                {[
                  "Unlimited Premium Templates",
                  "Full Source File Access",
                  "Commercial License",
                  "Priority Support",
                  "Regular Updates"
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-zinc-300">
                    <Check className="size-4 text-white flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

