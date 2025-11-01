'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseBrowserClient } from '../lib/supabaseClient';
import { useAppContext } from '../context/AppContext';

type Plan = {
  name: string;
  price: string;
  tagline?: string | null;
  billing?: string;
  features: string[];
  cta: string;
  highlight?: boolean;
};

const basePlans: Plan[] = [
  {
    name: 'Free',
    price: '$0',
    tagline: null,
    billing: 'Simple access for creators exploring Celite',
    features: [
      'Access Individual Templates',
      'Unlimited Free Template Library',
      'Basic customization guides',
      'Community support forum',
    ],
    cta: 'Current Plan',
  },
  {
    name: 'Pro',
    price: '$10',
    billing: 'For studios and teams shipping at scale',
    features: [
      'Unlimited Pro Template Downloads (no limits)',
      'Early access to new releases every month',
      'Advanced animation presets & color controls',
      'Commercial usage rights',
      'Priority Creator Support (24h response)',
    ],
    cta: 'Upgrade to Pro',
    highlight: true,
  },
];

export default function Pricing() {
  const { user } = useAppContext();
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [isActive, setIsActive] = useState(false);
  const [subPlan, setSubPlan] = useState<'monthly' | 'yearly' | null>(null);
  const [validUntil, setValidUntil] = useState<string | null>(null);
  const [currency] = useState<'USD' | 'INR'>('INR'); // Always use INR
  const [monthlyINR, setMonthlyINR] = useState(799); // Default: ₹799 per month
  const [yearlyINR, setYearlyINR] = useState(5499); // Default: ₹5,499 per year

  useEffect(() => {
    const load = async () => {
      // Load subscription prices from database
      const supabase = getSupabaseBrowserClient();
      const { data: settings } = await supabase.from('settings').select('key,value');
      const settingsMap: Record<string, string> = {};
      (settings || []).forEach((row: any) => { settingsMap[row.key] = row.value; });
      
      // Get amounts from database (should be in paise)
      let monthlyPaise = Number(settingsMap.RAZORPAY_MONTHLY_AMOUNT || '79900');
      let yearlyPaise = Number(settingsMap.RAZORPAY_YEARLY_AMOUNT || '549900');
      
      // Convert from paise to INR for display
      // Monthly: if >= 10000, it's in paise (e.g., 79900), divide by 100
      // Yearly: if >= 100000, it's in paise (e.g., 549900), divide by 100
      // Otherwise, treat as INR already
      if (monthlyPaise >= 10000) {
        setMonthlyINR(Math.round(monthlyPaise / 100));
      } else {
        setMonthlyINR(Math.round(monthlyPaise));
      }
      
      if (yearlyPaise >= 100000) {
        setYearlyINR(Math.round(yearlyPaise / 100));
      } else {
        setYearlyINR(Math.round(yearlyPaise));
      }

      // Load user subscription status
      if (!user) { setIsActive(false); setSubPlan(null); setValidUntil(null); return; }
      const { data } = await supabase
        .from('subscriptions')
        .select('is_active, plan, valid_until')
        .eq('user_id', (user as any).id)
        .maybeSingle();
      if (!data) { setIsActive(false); setSubPlan(null); setValidUntil(null); return; }
      const active = !!data.is_active && (!data.valid_until || new Date(data.valid_until).getTime() > Date.now());
      setIsActive(active);
      setSubPlan((data.plan === 'yearly' || data.plan === 'monthly') ? data.plan : null);
      setValidUntil(data.valid_until ?? null);
    };
    load();
  }, [user]);

  const plans = useMemo(() => {
    // Prices from database (already in INR)
    const monthlyPrice = `₹${monthlyINR.toLocaleString('en-IN')}`;
    const yearlyPrice = `₹${yearlyINR.toLocaleString('en-IN')}`;
    
    return basePlans.map((p) => {
      if (p.name !== 'Pro') return { ...p, tagline: isActive ? null : 'Current Plan' };
      return {
        ...p,
        price: period === 'monthly' ? monthlyPrice : yearlyPrice,
        cta: isActive ? 'Manage' : (period === 'monthly' ? 'Upgrade Monthly' : 'Upgrade Yearly'),
        tagline: isActive ? 'Current Plan' : null,
      };
    });
  }, [period, isActive, monthlyINR, yearlyINR]);

  const loadRazorpay = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existing) return resolve();
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Razorpay'));
      document.body.appendChild(script);
    });
  };

  const activate = async (selected: 'monthly' | 'yearly') => {
    if (!user) return;
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      await loadRazorpay();
      const res = await fetch('/api/payments/razorpay/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selected, currency: currency === 'INR' ? 'INR' : 'USD' }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        alert(json.error || 'Subscription failed');
        return;
      }
      const sub = json.subscription;
      // Open Razorpay checkout for subscription
      // @ts-ignore
      const rzp = new window.Razorpay({
        key: sub?.razorpay_key || '',
        subscription_id: sub.id,
        image: '/Logo.png',
        handler: async (resp: any) => {
          try {
            // After payment, activate subscription in our DB
            const activateRes = await fetch('/api/subscription/activate', {
              method: 'POST',
              headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ plan: selected }),
            });
            if (activateRes.ok) {
              // Refresh subscription status
              const { data } = await supabase
                .from('subscriptions')
                .select('is_active, plan, valid_until')
                .eq('user_id', (user as any).id)
                .maybeSingle();
              if (data) {
                const active = !!data.is_active && (!data.valid_until || new Date(data.valid_until).getTime() > Date.now());
                setIsActive(active);
                setSubPlan((data.plan === 'yearly' || data.plan === 'monthly') ? data.plan : null);
                setValidUntil(data.valid_until ?? null);
              }
            }
          } catch {}
        },
        prefill: {
          email: (user as any)?.email || '',
          name: (user as any)?.user_metadata?.first_name && (user as any)?.user_metadata?.last_name
            ? `${(user as any).user_metadata.first_name} ${(user as any).user_metadata.last_name}`.trim()
            : (user as any)?.email?.split('@')[0] || '',
        },
        theme: { color: '#ffffff' },
      });
      rzp.open();
    } catch (e: any) {
      alert(e?.message || 'Subscription failed to start');
    }
  };

  return (
    <section className="w-full bg-black py-16 sm:py-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <span className="uppercase tracking-[0.3em] text-xs text-zinc-500">Pricing</span>
          <h2 className="mt-4 text-4xl font-bold text-white">Choose Your Creative Flow</h2>
          <p className="mt-4 text-zinc-300 text-base">
            Flexible plans crafted to support solo creators and growing teams.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-2 py-1 text-xs text-white">
            <button
              onClick={() => setPeriod('monthly')}
              className={`px-3 py-1 rounded-full ${period === 'monthly' ? 'bg-white text-black' : 'text-white/80'}`}
            >Monthly</button>
            <button
              onClick={() => setPeriod('yearly')}
              className={`px-3 py-1 rounded-full ${period === 'yearly' ? 'bg-white text-black' : 'text-white/80'}`}
            >Yearly</button>
          </div>
          {isActive && (
            <p className="mt-3 text-xs text-green-300">
              Current plan: {subPlan === 'yearly' ? 'Yearly' : 'Monthly'}{validUntil ? ` • renews ${new Date(validUntil).toLocaleDateString()}` : ''}
            </p>
          )}
        </div>
        <div className="grid gap-8 md:grid-cols-2">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`relative rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-950/70 to-zinc-900/40 p-8 sm:p-10 shadow-xl transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl ${
                plan.highlight ? 'ring-1 ring-blue-400/40' : ''
              }`}
            >
              {plan.tagline && (
                <span className="inline-flex items-center rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-wider text-white/80">
                  {plan.tagline}
                </span>
              )}
              <h3 className="mt-4 text-2xl font-semibold text-white">{plan.name}</h3>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white">{plan.price}</span>
                <span className="text-sm text-zinc-400">{plan.name === 'Pro' && period === 'yearly' ? '/year' : '/month'}</span>
              </div>
              {plan.billing && <p className="mt-3 text-sm text-zinc-400">{plan.billing}</p>}
              <ul className="mt-6 space-y-3 text-sm text-zinc-300">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <span className="mt-1 inline-flex h-2 w-2 flex-none rounded-full bg-white/60"></span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              {(() => {
                const isPro = plan.name === 'Pro';
                const isMonthlyActive = isActive && subPlan === 'monthly';
                const isYearlyActive = isActive && subPlan === 'yearly';
                let ctaText = plan.cta;
                let disabled = false;
                let target: 'monthly' | 'yearly' = period;
                if (isPro) {
                  // Use prices from state (fetched from database)
                  const monthlyPriceText = `₹${monthlyINR.toLocaleString('en-IN')}`;
                  const yearlyPriceText = `₹${yearlyINR.toLocaleString('en-IN')}`;
                  
                  if (isYearlyActive) {
                    ctaText = 'Current Plan';
                    disabled = true;
                  } else if (isMonthlyActive) {
                    ctaText = `Upgrade to Yearly (${yearlyPriceText})`;
                    target = 'yearly';
                    disabled = false;
                  } else {
                    ctaText = period === 'yearly' ? `Upgrade Yearly (${yearlyPriceText})` : `Upgrade Monthly (${monthlyPriceText})`;
                    target = period; // Ensure target matches the period toggle
                  }
                }
                return (
                  <button
                className={`mt-8 w-full rounded-full px-5 py-3 text-sm font-semibold transition ${
                  plan.highlight
                    ? 'bg-white text-black hover:bg-zinc-200'
                    : 'border border-white/30 text-white hover:border-white hover:bg-white/10'
                }`}
                    onClick={() => { 
                      if (isPro && !disabled) {
                        const finalTarget = target || period; // Ensure we use the correct target
                        activate(finalTarget); 
                      }
                    }}
                    disabled={isPro && disabled}
              >
                    {ctaText}
              </button>
                );
              })()}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

