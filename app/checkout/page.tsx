"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { getSupabaseBrowserClient } from "../../lib/supabaseClient";
import { formatPriceWithDecimal } from "../../lib/currency";

type BillingDetails = {
  name: string;
  email: string;
  mobile: string;
  company?: string;
};

export default function CheckoutPage() {
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
  
  // Handle direct product checkout (from Buy Now)
  useEffect(() => {
    const productSlug = searchParams?.get('product');
    if (productSlug && cartCount === 0) {
      // Check if item is already in cart to avoid duplicate adds
      const alreadyInCart = cartItems.some(item => item.slug === productSlug);
      if (alreadyInCart) return;
      
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
          if (stillNotInCart) {
            addToCart({
              slug: data.slug,
              name: data.name,
              price: Number(data.price),
              img: data.img,
              quantity: 1,
            });
          }
        }
      };
      fetchProduct();
    }
  }, [searchParams, cartCount, addToCart, cartItems]);

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (!user) {
    return (
      <main className="bg-black min-h-screen pt-24 pb-20 px-6 text-white">
        <div className="max-w-3xl mx-auto text-center rounded-3xl border border-white/10 bg-white/5 p-12">
          <h1 className="text-3xl font-semibold">Sign in to checkout</h1>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  if (cartCount === 0) {
    return (
      <main className="bg-black min-h-screen pt-24 pb-20 px-6 text-white">
        <div className="max-w-4xl mx-auto rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
          <h1 className="text-3xl font-semibold">Your cart is empty</h1>
          <p className="mt-4 text-zinc-300">Add templates to begin checkout.</p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            Browse templates
          </Link>
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
        image: '/Logo.png',
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
    } catch (e: any) {
      console.error(e);
      setPaymentError(e?.message || 'Something went wrong processing your payment.');
      setProcessing(false);
    }
  };

  return (
    <main className="bg-black min-h-screen pt-24 pb-24 px-6 text-white">
      <div className="max-w-6xl mx-auto grid gap-10 lg:grid-cols-[1.7fr_1fr]">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl space-y-8">
          <div>
            <h1 className="text-3xl font-semibold">Checkout</h1>
            <p className="mt-2 text-sm text-zinc-400">Secure payment for cinematic After Effects templates.</p>
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
                    className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                    required
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-zinc-200">
                  Email
                  <input
                    type="email"
                    value={billing.email}
                    onChange={(evt) => setBilling((prev) => ({ ...prev, email: evt.target.value }))}
                    className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
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
                    className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
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
                    className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                    placeholder="Celite Productions"
                  />
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Payment</h2>
              <div className="rounded-xl border border-white/10 bg-black/40 p-4 text-sm text-zinc-300">
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
              <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">
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

        <aside className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl">
          <div>
            <h2 className="text-xl font-semibold">Order summary</h2>
            <p className="mt-1 text-sm text-zinc-400">{cartCount} template{cartCount === 1 ? '' : 's'} in your cart.</p>
          </div>
          <ul className="space-y-4 text-sm text-zinc-300">
            {cartItems.map((item) => (
              <li key={item.slug} className="flex items-center justify-between">
                <span>{item.name} × {item.quantity}</span>
                <span>{formatPriceWithDecimal(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-white/10 pt-4 text-sm text-zinc-300">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span>{formatPriceWithDecimal(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-500 mt-2">
              <span>Taxes</span>
              <span>Calculated at payment</span>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-white/10 pt-4 text-lg font-semibold">
            <span>Total due today</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <p className="text-xs text-zinc-500">
            Payments are processed securely. Template downloads will be available immediately after checkout.
          </p>
          <Link href="/cart" className="text-xs text-blue-300 hover:underline">
            Return to cart
          </Link>
        </aside>
      </div>
    </main>
  );
}

