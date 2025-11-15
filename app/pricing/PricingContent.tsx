'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import { formatPrice } from '@/lib/currency';
import { GlowingEffect } from '@/components/ui/glowing-effect';
import { cn } from '@/lib/utils';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function PricingContent() {
  const [weeklyPrice, setWeeklyPrice] = useState<number | null>(null);
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
        const weeklyPaiseStr = settingsMap.RAZORPAY_WEEKLY_AMOUNT;
        const monthlyPaiseStr = settingsMap.RAZORPAY_MONTHLY_AMOUNT;
        const yearlyPaiseStr = settingsMap.RAZORPAY_YEARLY_AMOUNT;
        
        if (!weeklyPaiseStr || !monthlyPaiseStr || !yearlyPaiseStr) {
          throw new Error('Subscription prices not found in database');
        }
        
        let weeklyPaise = Number(weeklyPaiseStr);
        let monthlyPaise = Number(monthlyPaiseStr);
        let yearlyPaise = Number(yearlyPaiseStr);
        
        // Convert from paise to INR
        // If >= 1000 for weekly, >= 10000 for monthly or >= 100000 for yearly, it's in paise, divide by 100
        // Otherwise, it's already in rupees
        if (weeklyPaise >= 1000) {
          weeklyPaise = weeklyPaise / 100;
        }
        if (monthlyPaise >= 10000) {
          monthlyPaise = monthlyPaise / 100;
        }
        if (yearlyPaise >= 100000) {
          yearlyPaise = yearlyPaise / 100;
        }
        
        setWeeklyPrice(Math.round(weeklyPaise));
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

  if (weeklyPrice === null || monthlyPrice === null || yearlyPrice === null) {
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
          Unlock unlimited access to premium templates and elevate your creative projects. Upgrade anytime as your needs grow.
        </p>
      </section>

      <section className="relative max-w-5xl mx-auto">
        <div className="flex flex-col gap-4 md:flex-row md:items-stretch md:justify-center md:flex-wrap">
          {/* Monthly Plan */}
          <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-white/10 p-2 md:rounded-[1.5rem] md:p-3 w-full md:w-[calc(33.333%-1rem)] md:order-1">
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
              borderWidth={3}
            />
            <div className="relative flex flex-col justify-between h-full overflow-hidden rounded-xl border-[0.75px] border-white/10 bg-black/40 backdrop-blur-sm p-6 md:p-8 shadow-sm dark:shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)]">
              <div className="space-y-4 mb-6">
                <div>
                  <h2 className="font-medium text-white text-lg mb-2">Monthly</h2>
                  <span className="block text-2xl font-semibold text-white mb-2">{formatPrice(monthlyPrice)} / mo</span>
                  <p className="text-zinc-400 text-sm">For creators who want premium access</p>
                </div>
                <Button asChild className="w-full mt-4" variant="default">
                  <Link href="/checkout?subscription=monthly">Subscribe Monthly</Link>
                </Button>
              </div>
              <ul className="border-t border-white/10 pt-4 space-y-3 text-sm flex-1">
                {["Unlimited Premium Templates", "Full Source Files Access", "Priority Support", "Commercial License", "Regular Updates", "Early Access to New Templates", "Download Any Template"].map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-zinc-300">
                    <Check className="size-4 text-white flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* One Week Special Plan */}
          <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-white/10 p-2 md:rounded-[1.5rem] md:p-3 w-full md:w-[calc(33.333%-1rem)] md:order-2">
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
              borderWidth={3}
            />
            <div className="relative flex flex-col justify-between h-full overflow-hidden rounded-xl border-[0.75px] border-white/10 bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-blue-500/20 backdrop-blur-sm p-6 md:p-8 shadow-sm dark:shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)]">
              {/* Special Badge */}
              <div className="absolute top-4 right-4 z-20 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-xl">
                SPECIAL
              </div>
              <div className="space-y-4 mb-6 relative">
                <div>
                  <h2 className="font-medium text-white text-lg mb-2">Weekly</h2>
                  <span className="block text-2xl font-semibold text-white mb-2">{formatPrice(weeklyPrice)} / week</span>
                  <p className="text-zinc-400 text-sm">Limited time offer - Full access</p>
                </div>
                <Button asChild className="w-full mt-4 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-0" variant="default">
                  <Link href="/checkout?subscription=weekly">Subscribe Weekly</Link>
                </Button>
              </div>
              <ul className="border-t border-white/10 pt-4 space-y-3 text-sm flex-1">
                {["Unlimited Premium Templates", "Full Source Files Access", "Priority Support", "Commercial License", "Regular Updates", "Early Access to New Templates", "Download Any Template"].map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-zinc-300">
                    <Check className="size-4 text-white flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Yearly Plan */}
          <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-white/10 p-2 md:rounded-[1.5rem] md:p-3 w-full md:w-[calc(33.333%-1rem)] md:order-3">
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
              borderWidth={3}
            />
            <div className="relative flex flex-col justify-between h-full overflow-hidden rounded-xl border-[0.75px] border-white/10 bg-black/40 backdrop-blur-sm p-6 shadow-sm dark:shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)]">
              <div className="space-y-4 mb-6">
                <div>
                  <h2 className="font-medium text-white text-lg mb-2">Yearly</h2>
                  <span className="block text-2xl font-semibold text-white mb-2">{formatPrice(yearlyPrice)} / year</span>
                  <p className="text-zinc-400 text-sm">Best value for professionals - Save 42%</p>
                </div>
                <Button asChild className="w-full mt-4" variant="default">
                  <Link href="/checkout?subscription=yearly">Subscribe Yearly</Link>
                </Button>
              </div>
              <ul className="border-t border-white/10 pt-4 space-y-3 text-sm flex-1">
                {["Everything in Monthly", "Save 42% vs Monthly", "Priority Template Requests", "Early Access to New Templates", "Dedicated Support Channel", "Annual Billing Discount", "Premium Resources Access"].map((item, index) => (
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

