'use client';

// agent-notes: { ctx: "Pricing page with 799 limited offer and yearly comparison", deps: ["lib/supabaseClient.ts", "lib/currency.ts", "lib/priceUtils.ts", "lucide-react"], state: active, last: "tara@2026-08-24" }

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Check,
  Sparkles,
  Zap,
  ShieldCheck,
  Download,
  RefreshCw,
  ArrowRight,
  HelpCircle,
  ChevronDown,
  Layers,
  Film,
  Music,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function PricingContent() {
  const searchParams = useSearchParams();
  const planParam = searchParams.get('plan') || searchParams.get('subscription');
  const [monthlyPrice, setMonthlyPrice] = useState<number | null>(null);
  const [yearlyPrice, setYearlyPrice] = useState<number | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(
    planParam === 'monthly' ? 'monthly' : 'yearly'
  );
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    if (planParam === 'monthly') {
      setBillingCycle('monthly');
    } else if (planParam === 'yearly') {
      setBillingCycle('yearly');
    }
  }, [planParam]);

  useEffect(() => {
    const loadPrices = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: settings } = await supabase.from('settings').select('key,value');
        const settingsMap: Record<string, string> = {};
        (settings || []).forEach((row: any) => {
          settingsMap[row.key] = row.value;
        });

        const monthlyPaiseStr = settingsMap.RAZORPAY_MONTHLY_AMOUNT;
        const yearlyPaiseStr = settingsMap.RAZORPAY_YEARLY_AMOUNT;

        if (!monthlyPaiseStr || !yearlyPaiseStr) {
          throw new Error('Subscription prices not found in database');
        }

        const { paiseToINR } = await import('@/lib/priceUtils');
        setMonthlyPrice(paiseToINR(Number(monthlyPaiseStr)));
        setYearlyPrice(paiseToINR(Number(yearlyPaiseStr)));
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

  if (monthlyPrice === null || yearlyPrice === null) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500 text-sm">Unable to load pricing information. Please refresh and try again.</p>
      </div>
    );
  }

  const monthlyFeatures = [
    'Unlimited Templates & Assets',
    'Wedding & Save the Date Videos',
    'Cinema Trailers & 4K Intros',
    'Stock Music & SFX (Royalty-Free)',
    'Full Commercial Client License',
    'Cancel Anytime (No lock-in)',
  ];

  const yearlyFeatures = [
    'Everything in Monthly Plan',
    'Exclusive VIP Free Asset Bundles',
    'Extended Commercial & Broadcast',
    'Priority 24/7 Creator Support',
    'Early Access to Weekly Drops',
    'Save 43% Annually (Best Value)',
  ];

  const comparisonRows = [
    { name: 'After Effects Templates (.aep)', monthly: 'Unlimited', yearly: 'Unlimited' },
    { name: 'Wedding & Save the Date Videos', monthly: 'Unlimited', yearly: 'Unlimited' },
    { name: 'Cinema Intros & 4K Trailers', monthly: 'Unlimited', yearly: 'Unlimited' },
    { name: 'Royalty-Free Music & SFX', monthly: 'Included', yearly: 'Included' },
    { name: 'Commercial Client Projects', monthly: 'Included', yearly: 'Included' },
    { name: 'Broadcast & Television License', monthly: 'Standard', yearly: 'Full Extended' },
    { name: 'Exclusive VIP Template Bundles', monthly: '—', yearly: 'Included Free' },
    { name: 'Support Level', monthly: 'Standard Support', yearly: '24/7 Priority Support' },
    { name: 'Download Speed', monthly: 'Fast Direct CDN', yearly: 'Ultra-Fast CDN Tier' },
  ];

  const faqs = [
    {
      q: 'How does the unlimited subscription work?',
      a: 'Once subscribed, you get instant, unrestricted access to download any After Effects template, wedding video invitation, cinematic trailer, stock music track, or sound effect in the Celite subscription catalogue. There are no daily download caps or hidden fees.',
    },
    {
      q: 'Can I use templates for commercial and client work?',
      a: 'Yes! Both Monthly and Yearly subscriptions include our Commercial License. You are free to create, render, and deliver final video projects for your clients, YouTube channels, Instagram reels, commercials, and paid advertising.',
    },
    {
      q: 'What happens if I cancel my subscription?',
      a: 'You can cancel anytime with a single click in your dashboard. You will retain full access until the end of your paid billing period. Any videos or projects you completed while your subscription was active remain 100% licensed forever.',
    },
    {
      q: 'Which versions of After Effects & Premiere Pro are supported?',
      a: 'Our templates are created to support modern Adobe After Effects CC (2020 through 2026+) and Premiere Pro Essential Graphics (.mogrt). No third-party plugins are required unless explicitly noted in the template specs.',
    },
    {
      q: 'What payment methods are supported?',
      a: 'We process payments securely via Razorpay. We support UPI (Google Pay, PhonePe, Paytm, BHIM), all major Credit & Debit Cards (Visa, Mastercard, RuPay), and NetBanking across 50+ Indian banks.',
    },
    {
      q: 'Do you offer refunds?',
      a: 'Because digital asset access is granted immediately upon checkout, subscriptions are generally non-refundable once assets have been downloaded. However, you can cancel renewal anytime with zero penalty.',
    },
  ];

  return (
    <div className="w-full">
      {/* 1. Main Compact Split Hero: Left Value Prop + Right Cards with Switcher */}
      <div className="w-full mb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          
          {/* Left Column: Heading & Value Proposition */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-bold mb-3 shadow-sm w-fit">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
              <span>Limited Time Offer</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-[900] tracking-tight text-zinc-950 leading-[1.1] mb-3">
              Simple, Transparent <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600">
                Unlimited Plans
              </span>
            </h1>

            <p className="text-zinc-600 text-sm sm:text-base leading-relaxed mb-5">
              Unlock unlimited downloads for video templates, wedding invitations, stock music &amp; SFX.
            </p>

            {/* Left Value Grid (Compact 2-col on sm) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5 mb-6 border-t border-zinc-200/80 pt-4">
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-zinc-800 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>Over 10,000+ Assets</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-zinc-800 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>Full Commercial &amp; Broadcast License</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-zinc-800 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>1-Click Cancellation (No Lock-in)</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-zinc-800 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>24/7 Dedicated Creator Support</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-zinc-500 font-medium">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>256-Bit SSL Razorpay</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Download className="w-4 h-4 text-blue-600" />
                <span>Direct High-Speed CDN</span>
              </div>
            </div>
          </div>

          {/* Right Column: Switcher + 2 Clean Cards */}
          <div className="lg:col-span-7 flex flex-col">
            
            {/* Top Switcher in Right Column */}
            <div className="flex items-center justify-between sm:justify-end gap-3 mb-4">
              <span className="text-xs text-zinc-500 font-semibold hidden sm:inline">Billing Cycle:</span>
              <div className="bg-zinc-100 p-1 rounded-full flex items-center border border-zinc-200 shadow-inner">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${
                    billingCycle === 'monthly'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.5)] scale-105'
                      : 'text-zinc-600 hover:text-black'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 flex items-center gap-1.5 ${
                    billingCycle === 'yearly'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.5)] scale-105'
                      : 'text-zinc-600 hover:text-black'
                  }`}
                >
                  <span>Yearly</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] uppercase font-black ${
                    billingCycle === 'yearly' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
                  }`}>
                    Save 43%
                  </span>
                </button>
              </div>
            </div>

            {/* 2 Clean Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 items-stretch">
              
              {/* Monthly Plan Card */}
              <div
                className={`relative group rounded-3xl transition-all duration-500 flex flex-col justify-between overflow-hidden ${
                  billingCycle === 'monthly'
                    ? 'bg-gradient-to-b from-[#0e111e] via-[#090b14] to-[#06070c] border-2 border-blue-500/80 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.7),0_0_30px_-5px_rgba(59,130,246,0.35)] scale-[1.01] z-10'
                    : 'bg-gradient-to-b from-[#0c0e18] via-[#080911] to-[#05060a] border border-blue-500/25 shadow-lg opacity-85 hover:opacity-100'
                }`}
              >
                {/* Top Hairline Ambient Glow */}
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-400/80 to-transparent pointer-events-none" />

                <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Integrated Top Badge & Plan Title */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-3 py-1 rounded-full bg-blue-950/90 border border-blue-400/40 text-cyan-300 text-[10px] font-extrabold uppercase tracking-wider shadow-sm flex items-center gap-1 backdrop-blur-md">
                        <Zap className="w-3 h-3 text-cyan-400" />
                        <span>Most Flexible</span>
                      </span>
                      <span className="text-[10px] font-semibold text-zinc-300 bg-white/[0.08] px-2.5 py-0.5 rounded-full border border-white/15">
                        Cancel anytime
                      </span>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-1.5">Monthly Plan</h3>

                    {/* Price */}
                    <div className="mb-4 pb-3.5 border-b border-white/[0.08]">
                      <div className="flex items-baseline gap-2">
                        <span className="text-zinc-500 text-sm sm:text-base line-through font-semibold">₹899</span>
                        <span className="text-3xl sm:text-4xl font-[900] text-white tracking-tight drop-shadow-md">
                          ₹{monthlyPrice}
                        </span>
                        <span className="text-zinc-300 text-xs font-semibold">/ month</span>
                      </div>
                      <p className="text-cyan-300 text-xs font-semibold mt-1">
                        ⚡ Limited Time Offer (Save ₹100)
                      </p>
                    </div>

                    {/* Feature Checklist */}
                    <ul className="space-y-2.5 mb-6">
                      {monthlyFeatures.map((feat, i) => (
                        <li key={i} className="flex items-center gap-2.5 text-xs sm:text-[13px] text-zinc-100 font-medium leading-tight">
                          <div className="w-4 h-4 rounded-full bg-blue-500/20 border border-blue-400/30 text-cyan-400 flex items-center justify-center flex-shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA Button */}
                  <Link
                    href="/checkout?subscription=monthly"
                    className="w-full py-3.5 rounded-xl font-extrabold text-center text-xs sm:text-sm bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border border-blue-300/40 shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_28px_rgba(59,130,246,0.65)] transition-all duration-300 hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-1.5 group"
                  >
                    <span>Get Monthly Access</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>

              {/* Yearly Plan Card (Featured Hero) */}
              <div
                className={`relative group rounded-3xl transition-all duration-500 flex flex-col justify-between overflow-hidden ${
                  billingCycle === 'yearly'
                    ? 'bg-gradient-to-b from-[#0e1428] via-[#090d1b] to-[#05070f] border-2 border-blue-400 shadow-[0_20px_55px_-10px_rgba(0,0,0,0.8),0_0_40px_-5px_rgba(59,130,246,0.45)] scale-[1.01] z-10'
                    : 'bg-gradient-to-b from-[#0c0e18] via-[#080911] to-[#05060a] border border-blue-500/25 shadow-lg opacity-85 hover:opacity-100'
                }`}
              >
                {/* Top Hairline Ambient Glow */}
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/90 to-transparent pointer-events-none" />

                <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Integrated Top Badge & Plan Title */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-3 py-1 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 border border-cyan-300/50 text-white text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1 backdrop-blur-md">
                        <Sparkles className="w-3 h-3 text-amber-300 fill-amber-300" />
                        <span>Save 43%</span>
                      </span>
                      <span className="text-[10px] font-extrabold text-cyan-300 bg-blue-950/90 px-2.5 py-0.5 rounded-full border border-blue-400/30">
                        Most Popular
                      </span>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-1.5">Yearly VIP</h3>

                    {/* Price */}
                    <div className="mb-4 pb-3.5 border-b border-white/[0.08]">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl sm:text-4xl font-[900] text-white tracking-tight drop-shadow-md">
                          ₹{Math.floor(yearlyPrice! / 12)}
                        </span>
                        <span className="text-zinc-300 text-xs font-semibold">/ month</span>
                      </div>
                      <p className="text-zinc-300 text-xs mt-1">
                        Billed ₹{yearlyPrice!.toLocaleString('en-IN')}/yr{' '}
                        <span className="text-emerald-400 font-semibold">
                          (Save ₹{((monthlyPrice! * 12) - yearlyPrice!).toLocaleString('en-IN')})
                        </span>
                      </p>
                    </div>

                    {/* Feature Checklist */}
                    <ul className="space-y-2.5 mb-6">
                      {yearlyFeatures.map((feat, i) => (
                        <li key={i} className="flex items-center gap-2.5 text-xs sm:text-[13px] text-zinc-100 font-medium leading-tight">
                          <div className="w-4 h-4 rounded-full bg-cyan-400/20 border border-cyan-300/40 text-cyan-300 flex items-center justify-center flex-shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA Button */}
                  <Link
                    href="/checkout?subscription=yearly"
                    className="w-full py-3.5 rounded-xl font-extrabold text-center text-xs sm:text-sm bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white border border-cyan-300/40 shadow-[0_0_25px_rgba(59,130,246,0.5)] hover:shadow-[0_0_35px_rgba(59,130,246,0.8)] transition-all duration-300 hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-1.5 group"
                  >
                    <span>Get Yearly VIP Access</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* 2. Side-by-Side Detailed Plan Comparison Table */}
      <div className="max-w-5xl mx-auto px-4 mb-12">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-2">
            <Layers className="w-3.5 h-3.5" />
            <span>Side-by-Side Comparison</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-zinc-950">Compare Plan Features</h2>
          <p className="text-zinc-600 text-xs sm:text-sm mt-1">
            Choose the membership tier that suits your studio workflow.
          </p>
        </div>

        <div className="rounded-2xl bg-[#090b14] border border-blue-500/20 overflow-hidden shadow-2xl">
          <div className="grid grid-cols-3 p-4 bg-[#0e111f] border-b border-white/[0.08] text-xs sm:text-sm font-bold text-white">
            <div>Feature</div>
            <div className="text-center text-zinc-300">Monthly Plan</div>
            <div className="text-center text-cyan-300">Yearly VIP</div>
          </div>

          <div className="divide-y divide-white/[0.05]">
            {comparisonRows.map((row, idx) => (
              <div
                key={idx}
                className="grid grid-cols-3 p-3.5 sm:p-4 text-xs sm:text-sm hover:bg-white/[0.02] transition-colors"
              >
                <div className="font-medium text-zinc-200">{row.name}</div>
                <div className="text-center text-zinc-400 font-medium">{row.monthly}</div>
                <div className="text-center text-cyan-300 font-semibold">{row.yearly}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Creator License Guarantees Strip */}
      <div className="max-w-5xl mx-auto px-4 mb-12">
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0b0f1d] via-[#0e1428] to-[#0b0f1d] border border-blue-500/30 shadow-[0_0_40px_-10px_rgba(59,130,246,0.25)]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-400/30 text-cyan-400 flex items-center justify-center flex-shrink-0">
                <Film className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm sm:text-base">Client &amp; YouTube Safe</h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Clear for full commercial use across client deliverables, social media ads, and broadcast.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-400/30 text-indigo-400 flex items-center justify-center flex-shrink-0">
                <Music className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm sm:text-base">Royalty-Free Audio</h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  100% copyright-cleared background music &amp; SFX with zero demonetization strikes.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-2xl bg-cyan-600/20 border border-cyan-400/30 text-cyan-300 flex items-center justify-center flex-shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm sm:text-base">Encrypted Checkout</h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  256-bit encrypted payments via Razorpay supporting UPI, Credit/Debit cards &amp; NetBanking.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Comprehensive FAQ Accordion */}
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-2">
            <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
            <span>Got Questions?</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-zinc-950">Frequently Asked Questions</h2>
          <p className="text-zinc-600 text-xs sm:text-sm mt-1">Everything you need to know about your subscription.</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = openFaq === i;
            return (
              <div
                key={i}
                className="rounded-2xl bg-[#090b14] border border-blue-500/20 overflow-hidden transition-colors hover:border-blue-400/40 shadow-lg"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-semibold text-white text-sm sm:text-base focus:outline-none"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-blue-400 transition-transform duration-300 flex-shrink-0 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-xs sm:text-sm text-zinc-400 leading-relaxed border-t border-white/[0.06] pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
