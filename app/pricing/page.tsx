'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import { formatPrice } from '@/lib/currency';

function PricingContent() {
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
        let monthlyPaise = Number(settingsMap.RAZORPAY_MONTHLY_AMOUNT || '79900');
        let yearlyPaise = Number(settingsMap.RAZORPAY_YEARLY_AMOUNT || '549900');
        
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
        // Use defaults
        setMonthlyPrice(799);
        setYearlyPrice(5499);
      } finally {
        setLoading(false);
      }
    };
    
    loadPrices();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-white">Loading pricing...</div>
      </div>
    );
  }

  return (
    <>
      <section className="max-w-5xl mx-auto text-center mb-16">
        <span className="uppercase tracking-[0.4em] text-xs text-zinc-500">Pricing</span>
        <h1 className="mt-4 text-4xl md:text-5xl font-bold">Choose Your Plan</h1>
        <p className="mt-6 text-lg text-zinc-300 leading-relaxed">
          Unlock unlimited access to premium templates and elevate your creative projects. Upgrade anytime as your needs grow.
        </p>
      </section>

      <section className="max-w-5xl mx-auto">
        <div className="rounded-xl border border-white/10 bg-black/40 p-4 md:p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-stretch md:justify-center">
            {/* Free Plan */}
            <div className="flex flex-col justify-between h-full flex-1 border border-white/10 bg-black/20 rounded-lg p-6 w-full md:w-[calc(33.333%-1rem)]">
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

            {/* Monthly Plan */}
            <div className="flex flex-col justify-between h-full bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-xl w-full md:w-[calc(33.333%-1rem)] p-6 md:p-8">
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

            {/* Yearly Plan */}
            <div className="flex flex-col justify-between h-full flex-1 border border-white/10 bg-black/20 rounded-lg p-6 w-full md:w-[calc(33.333%-1rem)]">
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

export default function PricingPage() {
  return (
    <main className="bg-black min-h-screen pt-24 pb-20 px-4 sm:px-8 text-white">
      <PricingContent />
    </main>
  );
}
