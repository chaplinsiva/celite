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
  const [weeklyPrice, setWeeklyPrice] = useState(199);
  const [monthlyPrice, setMonthlyPrice] = useState(799);
  const [yearlyPrice, setYearlyPrice] = useState(5499);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPrices = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: settings } = await supabase.from('settings').select('key,value');
        const settingsMap: Record<string, string> = {};
        (settings || []).forEach((row: any) => { settingsMap[row.key] = row.value; });
        
        // Get amounts in paise
        let weeklyPaise = Number(settingsMap.RAZORPAY_WEEKLY_AMOUNT || '19900');
        let monthlyPaise = Number(settingsMap.RAZORPAY_MONTHLY_AMOUNT || '79900');
        let yearlyPaise = Number(settingsMap.RAZORPAY_YEARLY_AMOUNT || '549900');
        
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
        // Use defaults
        setWeeklyPrice(199);
        setMonthlyPrice(799);
        setYearlyPrice(5499);
      } finally {
        setLoading(false);
      }
    };
    
    loadPrices();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading pricing..." />;
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
          {/* Free Plan */}
          <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-white/10 p-2 md:rounded-[1.5rem] md:p-3 w-full md:w-[calc(25%-1rem)]">
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
                      <h2 className="font-medium text-white text-lg mb-2">Free</h2>
                      <span className="block text-2xl font-semibold text-white mb-2">₹0 / mo</span>
                      <p className="text-zinc-400 text-sm">Perfect to test the template experience</p>
                    </div>
                    <Button asChild className="w-full mt-4" variant="outline">
                      <Link href="/templates">Browse Templates</Link>
                    </Button>
                  </div>
              <ul className="border-t border-white/10 pt-4 space-y-3 text-sm flex-1">
                {["Browse all templates", "Preview videos", "View template details", "Basic search and filters", "Email support"].map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-zinc-300">
                    <Check className="size-4 text-white flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* One Week Special Plan */}
          <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-white/10 p-2 md:rounded-[1.5rem] md:p-3 w-full md:w-[calc(25%-1rem)]">
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
                  <h2 className="font-medium text-white text-lg mb-2">One Week Special</h2>
                  <span className="block text-2xl font-semibold text-white mb-2">{formatPrice(weeklyPrice)} / week</span>
                  <p className="text-zinc-400 text-sm">Limited time offer - Full access</p>
                </div>
                <Button asChild className="w-full mt-4 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-0" variant="default">
                  <Link href="/checkout?subscription=weekly">Get Special Offer</Link>
                </Button>
              </div>
              <div className="mb-4">
                <div className="text-sm font-medium text-white">Everything in Free, plus:</div>
              </div>
              <ul className="mt-0 space-y-3 text-sm flex-1">
                {["Unlimited Premium Templates", "Full Source Files Access", "Priority Support", "Commercial License", "Regular Updates", "Early Access to New Templates", "Download Any Template"].map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-zinc-300">
                    <Check className="size-4 text-white flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Monthly Plan */}
          <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-white/10 p-2 md:rounded-[1.5rem] md:p-3 w-full md:w-[calc(25%-1rem)]">
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
              <div className="mb-4">
                <div className="text-sm font-medium text-white">Everything in Free, plus:</div>
              </div>
              <ul className="mt-0 space-y-3 text-sm flex-1">
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
          <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-white/10 p-2 md:rounded-[1.5rem] md:p-3 w-full md:w-[calc(25%-1rem)]">
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

