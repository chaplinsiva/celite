"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, Suspense } from "react";
import { useAppContext } from "../../context/AppContext";
import { getSupabaseBrowserClient } from "../../lib/supabaseClient";
import { formatPriceWithDecimal } from "../../lib/currency";
import { trackBeginCheckout, trackPurchase, trackSubscribe } from "../../lib/gtag";
import LoadingSpinner from "../../components/ui/loading-spinner";
import { GlowingEffect } from "../../components/ui/glowing-effect";
import { cn } from "../../lib/utils";

type BillingDetails = {
  name: string;
  email: string;
  mobile: string;
  company?: string;
};

// Component to handle search params (needs to be in Suspense)
function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, cartItems, cartCount, resetCart, addToCart } = useAppContext();
  const [billing, setBilling] = useState<BillingDetails>({
    name: user?.email.split("@")[0] ?? "",
    email: user?.email ?? "",
    mobile: "",
    company: "",
  });
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const addedProductRef = useRef<string | null>(null); // Track if we've already added a product
  
  const [subscriptionPlan, setSubscriptionPlan] = useState<'monthly' | 'yearly' | null>(null);
  const [subscriptionPrice, setSubscriptionPrice] = useState<number | null>(null);
  const [isAnnual, setIsAnnual] = useState<boolean>(true); // Default to Annual (ON)

  // Handle subscription checkout (from Pricing page)
  useEffect(() => {
    const subscriptionType = searchParams?.get('subscription') as 'monthly' | 'yearly' | null;
    if (subscriptionType && (subscriptionType === 'monthly' || subscriptionType === 'yearly')) {
      setSubscriptionPlan(subscriptionType);
      setIsAnnual(subscriptionType === 'yearly');
      // Load subscription price from database
      const loadSubscriptionPrice = async () => {
        const supabase = getSupabaseBrowserClient();
        const { data: settings } = await supabase.from('settings').select('key,value');
        const settingsMap: Record<string, string> = {};
        (settings || []).forEach((row: any) => { settingsMap[row.key] = row.value; });
        
        let amountPaise = 0;
        if (subscriptionType === 'monthly') {
          const monthlyAmount = settingsMap.RAZORPAY_MONTHLY_AMOUNT;
          if (!monthlyAmount) throw new Error('Monthly subscription price not found');
          amountPaise = Number(monthlyAmount);
        } else {
          const yearlyAmount = settingsMap.RAZORPAY_YEARLY_AMOUNT;
          if (!yearlyAmount) throw new Error('Yearly subscription price not found');
          amountPaise = Number(yearlyAmount);
        }
        
        // Convert from paise to INR
        const amountINR = amountPaise >= 1000 ? amountPaise / 100 : amountPaise;
        setSubscriptionPrice(Math.round(amountINR));
      };
      loadSubscriptionPrice();
    }
  }, [searchParams]);

  // Update subscription plan when toggle changes
  useEffect(() => {
    if (subscriptionPlan) {
      const newPlan = isAnnual ? 'yearly' : 'monthly';
      if (newPlan !== subscriptionPlan) {
        setSubscriptionPlan(newPlan);
        // Reload price for new plan
        const loadSubscriptionPrice = async () => {
          const supabase = getSupabaseBrowserClient();
          const { data: settings } = await supabase.from('settings').select('key,value');
          const settingsMap: Record<string, string> = {};
          (settings || []).forEach((row: any) => { settingsMap[row.key] = row.value; });
          
          let amountPaise = 0;
          if (newPlan === 'monthly') {
            const monthlyAmount = settingsMap.RAZORPAY_MONTHLY_AMOUNT;
            if (!monthlyAmount) throw new Error('Monthly subscription price not found');
            amountPaise = Number(monthlyAmount);
          } else {
            const yearlyAmount = settingsMap.RAZORPAY_YEARLY_AMOUNT;
            if (!yearlyAmount) throw new Error('Yearly subscription price not found');
            amountPaise = Number(yearlyAmount);
          }
          
          const amountINR = amountPaise >= 1000 ? amountPaise / 100 : amountPaise;
          setSubscriptionPrice(Math.round(amountINR));
        };
        loadSubscriptionPrice();
      }
    }
  }, [isAnnual, subscriptionPlan]);

  // Handle direct product checkout (from Buy Now)
  useEffect(() => {
    const productSlug = searchParams?.get('product');
    if (productSlug && cartCount === 0 && !subscriptionPlan) {
      // Don't add if we've already processed this product
      if (addedProductRef.current === productSlug) return;
      
      // Check if item is already in cart to avoid duplicate adds
      const alreadyInCart = cartItems.some(item => item.slug === productSlug);
      if (alreadyInCart) {
        addedProductRef.current = productSlug;
        return;
      }
      
      // Fetch product and add to cart
      const fetchProduct = async () => {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase
          .from('templates')
          .select('slug, name, price, img')
          .eq('slug', productSlug)
          .maybeSingle();
        if (data) {
          // Double-check cartItems haven't changed during async operation
          const stillNotInCart = !cartItems.some(item => item.slug === data.slug);
          if (stillNotInCart && addedProductRef.current !== productSlug) {
            addedProductRef.current = productSlug;
            addToCart({
              slug: data.slug,
              name: data.name,
              price: Number(data.price),
              img: data.img,
            });
          }
        }
      };
      fetchProduct();
    }
  }, [searchParams, cartCount, addToCart, cartItems, subscriptionPlan]);

  const subtotal = subscriptionPlan && subscriptionPrice 
    ? subscriptionPrice 
    : cartItems.reduce((sum, item) => sum + item.price, 0);

  // Track begin_checkout event when checkout page loads with items
  useEffect(() => {
    // Only track if not subscription and has cart items
    if (!subscriptionPlan && cartItems.length > 0) {
      trackBeginCheckout(
        cartItems.map((item) => ({
          item_id: item.slug,
          item_name: item.name,
          price: item.price,
          quantity: 1,
        })),
        subtotal,
        'INR'
      );
    }
  }, [subscriptionPlan, cartItems.length]); // Track when cart items change or subscription plan is set

  if (!user) {
    return (
      <main className="relative bg-black min-h-screen pt-24 pb-20 px-4 sm:px-6 text-white overflow-hidden">
        {/* Colorful Background Gradients */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          <div className={cn(
            "relative rounded-[1.25rem] md:rounded-[1.5rem] border-[0.75px] border-white/10 bg-black/40 backdrop-blur-sm p-8 md:p-12"
          )}>
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
              borderWidth={3}
            />
            <h1 className="text-3xl font-semibold text-white">Sign in to checkout</h1>
            <Link
              href="/login"
              className="mt-6 inline-flex items-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
            >
              Sign in
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Show empty cart message only if not a subscription checkout
  if (cartCount === 0 && !subscriptionPlan) {
    return (
      <main className="relative bg-black min-h-screen pt-24 pb-20 px-4 sm:px-6 text-white overflow-hidden">
        {/* Colorful Background Gradients */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        </div>
        <div className="relative max-w-4xl mx-auto">
          <div className={cn(
            "relative rounded-[1.25rem] md:rounded-[1.5rem] border-[0.75px] border-white/10 bg-black/40 backdrop-blur-sm p-8 md:p-10 text-center"
          )}>
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
              borderWidth={3}
            />
            <h1 className="text-3xl font-semibold text-white">Your cart is empty</h1>
            <p className="mt-4 text-zinc-300">Add templates to begin checkout.</p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-zinc-200"
            >
              Browse templates
            </Link>
          </div>
        </div>
      </main>
    );
  }

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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // Validate mobile number (Indian format: 10 digits, optionally with +91)
    const mobileRegex = /^(\+91)?[6-9]\d{9}$/;
    const cleanMobile = billing.mobile.replace(/\s+/g, '').replace(/\+91/g, '');
    if (!mobileRegex.test(cleanMobile)) {
      setPaymentError('Please enter a valid 10-digit mobile number');
      return;
    }

    setProcessing(true);
    setPaymentError(null);
    
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setPaymentError('Session expired. Please log in again.');
        setProcessing(false);
        return;
      }

      // Load Razorpay
      await loadRazorpay();

      // Handle subscription payment
      if (subscriptionPlan && subscriptionPrice) {
        // Create subscription
        const subRes = await fetch('/api/payments/razorpay/subscription', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ 
            plan: subscriptionPlan, 
            currency: 'INR',
            billing: {
              name: billing.name,
              email: billing.email,
              mobile: cleanMobile,
              company: billing.company || null,
            },
          }),
        });

        const subJson = await subRes.json();
        if (!subRes.ok || !subJson.ok) {
          throw new Error(subJson.error || 'Subscription initialization failed');
        }

        const sub = subJson.subscription;
        // Open Razorpay checkout for subscription
        // @ts-ignore
        const rzp = new window.Razorpay({
          key: sub?.razorpay_key || '',
          subscription_id: sub.id,
          image: '/PNG1.png',
          prefill: {
            name: billing.name,
            email: billing.email,
            contact: `+91${cleanMobile}`,
          },
          handler: async (resp: any) => {
            try {
              // Get Razorpay subscription ID from response or sub object
              const razorpaySubscriptionId = resp.razorpay_subscription_id || sub?.id || null;
              
              // Activate subscription in our DB with Razorpay subscription ID
              const activateRes = await fetch('/api/subscription/activate', {
                method: 'POST',
                headers: { 
                  Authorization: `Bearer ${session.access_token}`, 
                  'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ 
                  plan: subscriptionPlan,
                  razorpay_subscription_id: razorpaySubscriptionId 
                }),
              });
              
              if (activateRes.ok) {
                // Track subscription event
                trackSubscribe({
                  method: 'razorpay',
                  plan_id: subscriptionPlan,
                  plan_name: subscriptionPlan === 'yearly' ? 'Yearly Pro Plan' : 'Monthly Pro Plan',
                  value: subscriptionPrice || 0,
                  currency: 'INR',
                });
                
                // Redirect to dashboard
                router.push("/dashboard?payment=success");
              } else {
                setPaymentError('Subscription activation failed');
                setProcessing(false);
              }
            } catch (e: any) {
              setPaymentError(e?.message || 'Subscription activation failed');
              setProcessing(false);
            }
          },
          theme: { color: '#ffffff' },
          modal: {
            ondismiss: () => {
              setProcessing(false);
            },
          },
        });

        rzp.open();
      } else {
        // Handle one-time product payment
        // Calculate total amount in paise
        const amountInPaise = Math.round(subtotal * 100);

        // Create Razorpay order for all cart items
        // For multiple items, we'll create a combined order
        const productInfo = cartItems.length === 1 
          ? cartItems[0]
          : { slug: 'multiple', name: `${cartItems.length} Templates`, price: subtotal, img: cartItems[0]?.img || '' };

        const res = await fetch('/api/payments/razorpay/order', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ 
            amount: amountInPaise,
            product: productInfo,
            billing: {
              name: billing.name,
              email: billing.email,
              mobile: cleanMobile,
              company: billing.company || null,
            },
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error || 'Payment initialization failed');
        }

        // Open Razorpay checkout
        // @ts-ignore
        const rzp = new window.Razorpay({
          key: json.key,
          amount: json.order.amount,
          currency: json.order.currency,
          name: 'Celite',
          description: cartItems.length === 1 ? cartItems[0].name : `${cartItems.length} Templates`,
          image: '/PNG1.png',
          order_id: json.order.id,
          prefill: {
            name: billing.name,
            email: billing.email,
            contact: `+91${cleanMobile}`,
          },
          handler: async (resp: any) => {
            try {
              // Verify payment
              const verifyRes = await fetch('/api/payments/razorpay/verify', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                  razorpay_order_id: resp.razorpay_order_id,
                  razorpay_payment_id: resp.razorpay_payment_id,
                  razorpay_signature: resp.razorpay_signature,
                  billing: {
                    name: billing.name,
                    email: billing.email,
                    mobile: cleanMobile,
                    company: billing.company || null,
                  },
                  cartItems: cartItems,
                }),
              });

              const verifyJson = await verifyRes.json();
              if (verifyRes.ok && verifyJson.ok) {
                // Track purchase event
                trackPurchase({
                  transaction_id: verifyJson.order_id || resp.razorpay_order_id,
                  value: subtotal,
                  currency: 'INR',
                  items: cartItems.map((item) => ({
                    item_id: item.slug,
                    item_name: item.name,
                    price: item.price,
                    quantity: 1,
                  })),
                });
                
                // Clear cart
                await resetCart();
                // Redirect to dashboard
                router.push("/dashboard?payment=success");
              } else {
                setPaymentError(verifyJson.error || 'Payment verification failed');
                setProcessing(false);
              }
            } catch (e: any) {
              setPaymentError(e?.message || 'Payment verification failed');
              setProcessing(false);
            }
          },
          theme: { color: '#ffffff' },
          modal: {
            ondismiss: () => {
              setProcessing(false);
            },
          },
        });

        rzp.open();
      }
    } catch (e: any) {
      console.error(e);
      setPaymentError(e?.message || 'Something went wrong processing your payment.');
      setProcessing(false);
    }
  };

  return (
    <main className="relative bg-black min-h-screen pt-24 pb-24 px-4 sm:px-6 text-white overflow-hidden">
      {/* Colorful Background Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      </div>
      
      <div className="relative max-w-6xl mx-auto grid gap-6 lg:gap-8 lg:grid-cols-[1.7fr_1fr]">
        <section className={cn(
          "relative rounded-[1.25rem] md:rounded-[1.5rem] border-[0.75px] border-white/10 bg-black/40 backdrop-blur-sm p-6 md:p-8 shadow-xl space-y-8"
        )}>
          <GlowingEffect
            spread={40}
            glow={true}
            disabled={false}
            proximity={64}
            inactiveZone={0.01}
            borderWidth={3}
          />
          <div>
            <h1 className="text-3xl font-semibold">{subscriptionPlan ? 'Subscribe' : 'Checkout'}</h1>
            <p className="mt-2 text-sm text-zinc-400">
              {subscriptionPlan 
                ? `Secure payment for ${subscriptionPlan === 'monthly' ? 'monthly' : 'yearly'} Pro subscription.`
                : 'Secure payment for cinematic After Effects templates.'
              }
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-7">
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Billing details</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-zinc-200">
                  Name
                  <input
                    value={billing.name}
                    onChange={(evt) => setBilling((prev) => ({ ...prev, name: evt.target.value }))}
                    className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-violet-400/70 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-colors"
                    required
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-zinc-200">
                  Email
                  <input
                    type="email"
                    value={billing.email}
                    onChange={(evt) => setBilling((prev) => ({ ...prev, email: evt.target.value }))}
                    className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-violet-400/70 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-colors"
                    required
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-zinc-200">
                  Mobile Number
                  <input
                    type="tel"
                    value={billing.mobile}
                    onChange={(evt) => {
                      const value = evt.target.value.replace(/\D/g, ''); // Only allow digits
                      if (value.length <= 10) {
                        setBilling((prev) => ({ ...prev, mobile: value }));
                      }
                    }}
                    className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-violet-400/70 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-colors"
                    placeholder="9876543210"
                    maxLength={10}
                    required
                  />
                  <span className="text-xs text-zinc-500">10-digit mobile number (e.g., 9876543210)</span>
                </label>
                <label className="flex flex-col gap-2 text-sm text-zinc-200 sm:col-span-2">
                  Company / Studio (optional)
                  <input
                    value={billing.company}
                    onChange={(evt) => setBilling((prev) => ({ ...prev, company: evt.target.value }))}
                    className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-violet-400/70 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-colors"
                    placeholder="Celite Productions"
                  />
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Payment</h2>
              <div className={cn(
                "rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm p-4 text-sm text-zinc-300"
              )}>
                <p>Payment will be processed securely through Razorpay. You'll be redirected to a secure payment gateway after submitting your details.</p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-zinc-400">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 rounded border-white/20 bg-black/40" required />
                I agree to the Celite license and understand templates include one brand deployment.
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 rounded border-white/20 bg-black/40" />
                Email me about new template drops.
              </label>
            </div>

            {paymentError && (
              <div className="rounded-2xl border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">
                {paymentError}
              </div>
            )}

            <button
              type="submit"
              disabled={processing}
              className="w-full rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {processing ? 'Processing…' : `Pay ${formatPriceWithDecimal(subtotal)}`}
            </button>
          </form>
        </section>

        <aside className={cn(
          "relative space-y-6 rounded-[1.25rem] md:rounded-[1.5rem] border-[0.75px] border-white/10 bg-black/40 backdrop-blur-sm p-6 md:p-8 shadow-xl"
        )}>
          <GlowingEffect
            spread={40}
            glow={true}
            disabled={false}
            proximity={64}
            inactiveZone={0.01}
            borderWidth={3}
          />
          <div>
            <h2 className="text-xl font-semibold">{subscriptionPlan ? 'Subscription Summary' : 'Order summary'}</h2>
            {subscriptionPlan ? (
              <p className="mt-1 text-sm text-zinc-400">
                {subscriptionPlan === 'monthly' ? 'Monthly' : 'Yearly'} Pro Subscription
              </p>
            ) : (
              <p className="mt-1 text-sm text-zinc-400">{cartCount} template{cartCount === 1 ? '' : 's'} in your cart.</p>
            )}
          </div>
          {subscriptionPlan ? (
            <div className="space-y-4 text-sm text-zinc-300">
              {/* Toggle Switch */}
              <div className="flex items-center justify-center gap-3 pb-4 border-b border-white/10">
                <span className={cn("text-xs font-medium transition-colors", isAnnual ? "text-zinc-400" : "text-white")}>
                  Monthly
                </span>
                <button
                  type="button"
                  onClick={() => setIsAnnual(!isAnnual)}
                  className={cn(
                    "relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black",
                    isAnnual ? "bg-gradient-to-r from-purple-500 to-blue-500" : "bg-zinc-700"
                  )}
                  role="switch"
                  aria-checked={isAnnual}
                  aria-label="Toggle billing period"
                >
                  <span
                    className={cn(
                      "inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-lg",
                      isAnnual ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
                <span className={cn("text-xs font-medium transition-colors", isAnnual ? "text-white" : "text-zinc-400")}>
                  Annual
                </span>
              </div>
              <div className="flex flex-col gap-2 p-3 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span>Pro {subscriptionPlan === 'monthly' ? 'Monthly' : 'Yearly'} Plan</span>
                  <span className="text-lg font-semibold">
                    {isAnnual ? '₹399' : '₹599'} <span className="text-sm font-normal">/ month</span>
                  </span>
                </div>
                {isAnnual && (
                  <p className="text-xs text-zinc-400">
                    Billed yearly at ₹4,788. Save 33%.
                  </p>
                )}
                {!isAnnual && (
                  <p className="text-xs text-zinc-400">
                    Billed monthly.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <ul className="space-y-4 text-sm text-zinc-300">
              {cartItems.map((item) => (
                <li key={item.slug} className="flex items-center justify-between">
                  <span>{item.name}</span>
                  <span>{formatPriceWithDecimal(item.price)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-white/10 pt-4 text-sm text-zinc-300">
            <div className="flex items-center justify-between">
              <span>{subscriptionPlan ? 'Subscription Price' : 'Subtotal'}</span>
              <span>{formatPriceWithDecimal(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-500 mt-2">
              <span>Taxes</span>
              <span>Calculated at payment</span>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-white/10 pt-4 text-lg font-semibold">
            <span>Total due today</span>
            <span>{subscriptionPrice ? `₹${subscriptionPrice.toLocaleString('en-IN')}` : `₹${subtotal.toLocaleString('en-IN')}`}</span>
          </div>
          <p className="text-xs text-zinc-500">
            {subscriptionPlan 
              ? 'Payments are processed securely. Your subscription will be activated immediately after payment.'
              : 'Payments are processed securely. Template downloads will be available immediately after checkout.'
            }
          </p>
          {!subscriptionPlan && (
            <Link href="/cart" className="text-xs text-blue-300 hover:underline">
              Return to cart
            </Link>
          )}
        </aside>
      </div>
    </main>
  );
}

// Main page component with Suspense boundary
export default function CheckoutPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Loading checkout..." fullScreen />}>
      <CheckoutContent />
    </Suspense>
  );
}

