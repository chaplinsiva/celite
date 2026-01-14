'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Sparkles } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import { formatPrice } from '@/lib/currency';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function PricingContent() {
  const [monthlyPrice, setMonthlyPrice] = useState<number | null>(null);
  const [yearlyPrice, setYearlyPrice] = useState<number | null>(null);
  const [pongalPrice, setPongalPrice] = useState<number | null>(null);
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
        const pongalPaiseStr = settingsMap.PONGAL_WEEKLY_PRICE;

        if (!monthlyPaiseStr || !yearlyPaiseStr) {
          throw new Error('Subscription prices not found in database');
        }

        let monthlyPaise = Number(monthlyPaiseStr);
        let yearlyPaise = Number(yearlyPaiseStr);
        let pongalPaise = pongalPaiseStr ? Number(pongalPaiseStr) : 49900; // Default ₹499

        // Convert from paise to INR
        if (monthlyPaise >= 10000) {
          monthlyPaise = monthlyPaise / 100;
        }
        if (yearlyPaise >= 100000) {
          yearlyPaise = yearlyPaise / 100;
        }
        if (pongalPaise >= 1000) {
          pongalPaise = pongalPaise / 100;
        }

        setMonthlyPrice(Math.round(monthlyPaise));
        setYearlyPrice(Math.round(yearlyPaise));
        setPongalPrice(Math.round(pongalPaise));
      } catch (error) {
        console.error('Error loading prices:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPrices();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading pricing..." />;
  }

  if (monthlyPrice === null || yearlyPrice === null || pongalPrice === null) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Unable to load pricing information. Please try again later.</p>
      </div>
    );
  }

  const features = [
    "Unlimited After Effects Templates",
    "Premium Stock Music & SFX",
    "High-Quality Stock Images",
    "Professional 3D Models",
    "Unlimited Downloads",
    "Full Source File Access",
    "Commercial License",
    "Priority Support"
  ];

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-160px)] py-8">
      <div className="w-full">
        {/* Header Section */}
        <section className="relative max-w-4xl mx-auto text-center mb-12 md:mb-16 px-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 md:mb-4">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Choose Your Plan
            </span>
          </h1>
          <p className="text-zinc-600 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            Unlock unlimited access to premium templates and elevate your creative projects.
          </p>
        </section>

        {/* Pricing Cards */}
        <section className="relative max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
            
            {/* Monthly Plan */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl md:rounded-3xl opacity-75 group-hover:opacity-100 blur transition duration-500"></div>
              <div className="relative bg-white rounded-2xl md:rounded-3xl p-6 sm:p-8 shadow-xl border-2 border-blue-100">
                {/* Popular Badge */}
                <div className="absolute -top-3 md:-top-4 left-1/2 -translate-x-1/2">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-full shadow-lg flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Most Popular
                  </div>
                </div>

                <div className="text-center mb-4 sm:mb-6 mt-2 sm:mt-4">
                  <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 mb-3 sm:mb-4">Monthly</h2>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-lg sm:text-xl text-zinc-400 line-through">₹899</span>
                    <span className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                      ₹{monthlyPrice}
                    </span>
                  </div>
                  <p className="text-zinc-600 text-sm">per month</p>
                  <p className="text-blue-600 text-xs font-semibold mt-1">Limited offer - Save 33%</p>
                </div>

                <Link
                  href="/checkout?subscription=monthly"
                  className="block w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 sm:py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl text-center mb-4 sm:mb-6 text-sm sm:text-base"
                >
                  Subscribe Now
                </Link>

                <ul className="space-y-2 sm:space-y-3">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 sm:gap-3 text-zinc-700">
                      <Check className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Pongal Weekly Plan - Center */}
            <div className="relative group">
              <div className="relative bg-white rounded-2xl md:rounded-3xl p-6 sm:p-8 shadow-lg border-2 border-rose-200 hover:border-rose-300 transition-all hover:shadow-xl">
                <div className="text-center mb-4 sm:mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 mb-3 sm:mb-4">Weekly</h2>
                  <div className="mb-2">
                    <span className="text-4xl sm:text-5xl font-bold text-zinc-900">
                      ₹{pongalPrice}
                    </span>
                  </div>
                  <p className="text-zinc-600 text-sm">for 3 weeks</p>
                  <p className="text-rose-600 text-xs font-semibold mt-1">
                    🎉 Pongal Offer - 3 downloads per week
                  </p>
                </div>

                <Link
                  href="/checkout?subscription=pongal_weekly"
                  className="block w-full bg-gradient-to-r from-blue-500 via-rose-400 to-blue-600 text-white py-3 sm:py-4 rounded-xl font-semibold hover:from-blue-600 hover:via-rose-500 hover:to-blue-700 transition-all shadow-md hover:shadow-lg text-center mb-4 sm:mb-6 text-sm sm:text-base"
                >
                  Subscribe Now
                </Link>

                <ul className="space-y-2 sm:space-y-3">
                  <li className="flex items-start gap-2 sm:gap-3 text-zinc-700">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm">3 Downloads per week</span>
                  </li>
                  <li className="flex items-start gap-2 sm:gap-3 text-zinc-700">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm">Valid for 3 weeks</span>
                  </li>
                  <li className="flex items-start gap-2 sm:gap-3 text-zinc-700">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm">All Premium Templates</span>
                  </li>
                  <li className="flex items-start gap-2 sm:gap-3 text-zinc-700">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm">Full Source File Access</span>
                  </li>
                  <li className="flex items-start gap-2 sm:gap-3 text-zinc-700">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm">Commercial License</span>
                  </li>
                  <li className="flex items-start gap-2 sm:gap-3 text-zinc-700">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm">Auto-cancels after 3 weeks</span>
                  </li>
                  <li className="flex items-start gap-2 sm:gap-3 text-zinc-700">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm">Premium Stock Music & SFX</span>
                  </li>
                  <li className="flex items-start gap-2 sm:gap-3 text-zinc-700">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm">Priority Support</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Yearly Plan */}
            <div className="relative group">
              <div className="relative bg-white rounded-2xl md:rounded-3xl p-6 sm:p-8 shadow-lg border-2 border-zinc-200 hover:border-blue-300 transition-all hover:shadow-xl">
                <div className="text-center mb-4 sm:mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 mb-3 sm:mb-4">Yearly</h2>
                  <div className="mb-2">
                    <span className="text-4xl sm:text-5xl font-bold text-zinc-900">
                      ₹{yearlyPrice.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-zinc-600 text-sm">per year</p>
                  <p className="text-green-600 text-xs font-semibold mt-1">
                    Save ₹{((monthlyPrice * 12) - yearlyPrice).toLocaleString()} with annual plan
                  </p>
                </div>

                <Link
                  href="/checkout?subscription=yearly"
                  className="block w-full bg-zinc-900 text-white py-3 sm:py-4 rounded-xl font-semibold hover:bg-zinc-800 transition-all shadow-md hover:shadow-lg text-center mb-4 sm:mb-6 text-sm sm:text-base"
                >
                  Subscribe Now
                </Link>

                <ul className="space-y-2 sm:space-y-3">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 sm:gap-3 text-zinc-700">
                      <Check className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-900 flex-shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="mt-12 md:mt-16 text-center px-4">
            <p className="text-zinc-500 text-xs sm:text-sm mb-3 sm:mb-4">Trusted by 10,000+ creators worldwide</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm text-zinc-600">
              <div className="flex items-center gap-2">
                <Check className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                Cancel anytime
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                Secure payment
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                Instant access
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

