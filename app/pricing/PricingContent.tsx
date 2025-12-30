'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function PricingContent() {
  const router = useRouter();
  const [monthlyPrice, setMonthlyPrice] = useState<number | null>(null);
  const [yearlyPrice, setYearlyPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isYearly, setIsYearly] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    const loadPrices = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: settings } = await supabase.from('settings').select('key,value');
        const settingsMap: Record<string, string> = {};
        (settings || []).forEach((row: any) => { settingsMap[row.key] = row.value; });

        const monthlyPaiseStr = settingsMap.RAZORPAY_MONTHLY_AMOUNT;
        const yearlyPaiseStr = settingsMap.RAZORPAY_YEARLY_AMOUNT;

        if (!monthlyPaiseStr || !yearlyPaiseStr) {
          throw new Error('Subscription prices not found in database');
        }

        let monthlyPaise = Number(monthlyPaiseStr);
        let yearlyPaise = Number(yearlyPaiseStr);

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
      } finally {
        setLoading(false);
      }
    };

    loadPrices();
  }, []);

  const handleSubscribe = () => {
    setIsNavigating(true);
    router.push(`/checkout?subscription=${isYearly ? 'yearly' : 'monthly'}`);
  };

  if (loading) {
    return <LoadingSpinner message="Loading pricing..." />;
  }

  if (monthlyPrice === null || yearlyPrice === null) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-600">Unable to load pricing information. Please try again later.</p>
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

  const yearlyPerMonth = Math.round(yearlyPrice / 12);
  const savings = (monthlyPrice * 12) - yearlyPrice;

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-160px)] py-8">
      <div className="w-full max-w-md mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 mb-3">
            Choose Your Plan
          </h1>
          <p className="text-zinc-500 text-base max-w-xl mx-auto">
            Unlock unlimited access to premium templates.
          </p>
        </div>

        {/* Toggle Switch */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <span className={`text-sm font-medium ${!isYearly ? 'text-zinc-900' : 'text-zinc-400'}`}>
            Monthly
          </span>
          <button
            onClick={() => setIsYearly(!isYearly)}
            className={`relative w-14 h-7 rounded-full transition-colors ${isYearly ? 'bg-zinc-900' : 'bg-zinc-300'}`}
          >
            <div
              className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${isYearly ? 'translate-x-8' : 'translate-x-1'
                }`}
            />
          </button>
          <span className={`text-sm font-medium ${isYearly ? 'text-zinc-900' : 'text-zinc-400'}`}>
            Yearly
            {isYearly && (
              <span className="ml-1 text-xs text-green-600 font-semibold">Save ₹{savings.toLocaleString()}</span>
            )}
          </span>
        </div>

        {/* Pricing Card */}
        <div className="bg-zinc-900 text-white rounded-2xl p-6 sm:p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold mb-4">
              {isYearly ? 'Yearly Plan' : 'Monthly Plan'}
            </h2>

            {isYearly ? (
              <>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-lg text-zinc-500 line-through">₹{monthlyPrice}</span>
                  <span className="text-4xl font-bold">₹{yearlyPerMonth}</span>
                  <span className="text-zinc-400 text-lg">/month</span>
                </div>
                <p className="text-zinc-400 text-sm">Billed ₹{yearlyPrice.toLocaleString()} yearly</p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-lg text-zinc-500 line-through">₹899</span>
                  <span className="text-4xl font-bold">₹{monthlyPrice}</span>
                  <span className="text-zinc-400 text-lg">/month</span>
                </div>
                <p className="text-zinc-400 text-sm">Billed monthly</p>
              </>
            )}
          </div>

          <button
            onClick={handleSubscribe}
            disabled={isNavigating}
            className="relative block w-full bg-white text-zinc-900 py-3 rounded-lg font-semibold hover:bg-zinc-100 transition-colors text-center mb-6 disabled:opacity-70"
          >
            {isNavigating ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                Loading...
              </span>
            ) : (
              'Subscribe Now'
            )}
          </button>

          <ul className="space-y-3">
            {features.map((feature, index) => (
              <li key={index} className="flex items-start gap-3 text-zinc-300">
                <Check className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Trust Indicators */}
        <div className="mt-8 text-center">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 text-sm text-zinc-500">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-zinc-900" />
              Cancel anytime
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-zinc-900" />
              Secure payment
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-zinc-900" />
              Instant access
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
