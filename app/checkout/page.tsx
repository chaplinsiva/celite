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
import { CountryCodeSelect } from "../../components/ui/CountryCodeSelect";
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
  const checkoutDetailIdRef = useRef<string | null>(null); // Track checkout details ID

  const [subscriptionPlan, setSubscriptionPlan] = useState<'monthly' | 'yearly' | 'pongal_weekly' | null>(null);
  const [subscriptionPrice, setSubscriptionPrice] = useState<number | null>(null);
  const [countryCode, setCountryCode] = useState("+91"); // Default to India

  // Handle subscription checkout (from Pricing page)
  useEffect(() => {
    const subscriptionType = searchParams?.get('subscription') as 'monthly' | 'yearly' | 'pongal_weekly' | null;
    if (subscriptionType && (subscriptionType === 'monthly' || subscriptionType === 'yearly' || subscriptionType === 'pongal_weekly')) {
      setSubscriptionPlan(subscriptionType);
      // Load subscription price from database
      const loadSubscriptionPrice = async () => {
        if (subscriptionType === 'pongal_weekly') {
          const supabase = getSupabaseBrowserClient();
          const { data: settings } = await supabase.from('settings').select('key,value');
          const settingsMap: Record<string, string> = {};
          (settings || []).forEach((row: any) => { settingsMap[row.key] = row.value; });
          
          const pongalPaiseStr = settingsMap.PONGAL_WEEKLY_PRICE || '49900';
          let pongalPaise = Number(pongalPaiseStr);
          if (pongalPaise >= 1000) {
            pongalPaise = pongalPaise / 100;
          }
          setSubscriptionPrice(Math.round(pongalPaise));
          return;
        }
        
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
      <main className="bg-background min-h-screen flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-xl border-2 border-zinc-200 p-8 shadow-lg">
            <h1 className="text-2xl font-bold text-zinc-900 mb-2">Sign in to checkout</h1>
            <p className="text-zinc-600 mb-6">Please log in to complete your purchase</p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 text-white px-6 py-3 font-semibold hover:bg-blue-700 transition-colors"
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
      <main className="bg-background min-h-screen flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-xl border-2 border-zinc-200 p-8 shadow-lg">
            <h1 className="text-2xl font-bold text-zinc-900 mb-2">Your cart is empty</h1>
            <p className="text-zinc-600 mb-6">Add templates to begin checkout</p>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 text-white px-6 py-3 font-semibold hover:bg-blue-700 transition-colors"
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

    // Validate mobile number (digits only, 6-15 digits since country code is separate)
    const cleanMobile = billing.mobile.replace(/\s+/g, '').replace(/-/g, '');
    const mobileRegex = /^\d{6,15}$/;
    if (!mobileRegex.test(cleanMobile)) {
      setPaymentError('Please enter a valid mobile number (6-15 digits)');
      return;
    }
    // Combine country code with mobile number for Razorpay
    const fullMobile = `${countryCode}${cleanMobile}`;

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

      // Store checkout details in database
      checkoutDetailIdRef.current = null;
      try {
        const checkoutDetailsRes = await fetch('/api/checkout/details', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            checkout_type: subscriptionPlan ? 'subscription' : 'product',
            billing_name: billing.name,
            billing_email: billing.email,
            billing_mobile: fullMobile,
            billing_company: billing.company || null,
            subscription_plan: subscriptionPlan || null,
            cart_items: subscriptionPlan ? [] : cartItems.map(item => ({
              slug: item.slug,
              name: item.name,
              price: item.price,
              img: item.img,
            })),
            total_amount: subtotal,
          }),
        });

        const checkoutDetailsJson = await checkoutDetailsRes.json();
        if (checkoutDetailsRes.ok && checkoutDetailsJson.ok) {
          checkoutDetailIdRef.current = checkoutDetailsJson.checkout_detail_id;
        }
        // Don't fail the checkout if storing details fails, just log it
      } catch (e) {
        console.error('Failed to store checkout details:', e);
      }

      // Load Razorpay
      await loadRazorpay();

      // Handle subscription payment
      if (subscriptionPlan && subscriptionPrice) {
        // Handle all subscriptions (monthly, yearly, pongal_weekly) as recurring
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
                mobile: fullMobile,
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
              contact: fullMobile,
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
                    razorpay_subscription_id: razorpaySubscriptionId,
                    autopay_enabled: true, // Enable autopay for all subscriptions including pongal_weekly
                  }),
                });

                if (activateRes.ok) {
                  // Update checkout details status to completed
                  if (checkoutDetailIdRef.current) {
                    try {
                      await fetch('/api/checkout/details', {
                        method: 'PATCH',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${session.access_token}`,
                        },
                        body: JSON.stringify({
                          checkout_detail_id: checkoutDetailIdRef.current,
                          status: 'completed',
                          razorpay_subscription_id: razorpaySubscriptionId,
                        }),
                      });
                    } catch (e) {
                      console.error('Failed to update checkout details:', e);
                    }
                  }

                  // Track subscription event
                  const planName = subscriptionPlan === 'pongal_weekly' 
                    ? 'Pongal Weekly Offer' 
                    : subscriptionPlan === 'yearly' 
                    ? 'Yearly Pro Plan' 
                    : 'Monthly Pro Plan';
                  
                  trackSubscribe({
                    method: 'razorpay',
                    plan_id: subscriptionPlan,
                    plan_name: planName,
                    value: subscriptionPrice || 0,
                    currency: 'INR',
                  });

                  // Redirect to dashboard
                  router.push("/dashboard?payment=success");
                } else {
                  // Update checkout details status to failed
                  if (checkoutDetailIdRef.current) {
                    try {
                      await fetch('/api/checkout/details', {
                        method: 'PATCH',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${session.access_token}`,
                        },
                        body: JSON.stringify({
                          checkout_detail_id: checkoutDetailIdRef.current,
                          status: 'failed',
                        }),
                      });
                    } catch (e) {
                      console.error('Failed to update checkout details:', e);
                    }
                  }
                  setPaymentError('Subscription activation failed');
                  setProcessing(false);
                }
              } catch (e: any) {
                // Update checkout details status to failed
                if (checkoutDetailIdRef.current) {
                  try {
                    await fetch('/api/checkout/details', {
                      method: 'PATCH',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${session.access_token}`,
                      },
                      body: JSON.stringify({
                        checkout_detail_id: checkoutDetailIdRef.current,
                        status: 'failed',
                      }),
                    });
                  } catch (err) {
                    console.error('Failed to update checkout details:', err);
                  }
                }
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
              mobile: fullMobile,
              company: billing.company || null,
            },
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.ok) {
          // Update checkout details status to failed
          if (checkoutDetailIdRef.current) {
            try {
              await fetch('/api/checkout/details', {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                  checkout_detail_id: checkoutDetailIdRef.current,
                  status: 'failed',
                }),
              });
            } catch (e) {
              console.error('Failed to update checkout details:', e);
            }
          }
          throw new Error(json.error || 'Payment initialization failed');
        }

        // Update checkout details with Razorpay order ID
        if (checkoutDetailIdRef.current && json.order?.id) {
          try {
            await fetch('/api/checkout/details', {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                checkout_detail_id: checkoutDetailIdRef.current,
                status: 'payment_pending',
                razorpay_order_id: json.order.id,
              }),
            });
          } catch (e) {
            console.error('Failed to update checkout details:', e);
          }
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
            contact: fullMobile,
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
                    mobile: fullMobile,
                    company: billing.company || null,
                  },
                  cartItems: cartItems,
                }),
              });

              const verifyJson = await verifyRes.json();
              if (verifyRes.ok && verifyJson.ok) {
                // Update checkout details status to completed
                if (checkoutDetailIdRef.current) {
                  try {
                    await fetch('/api/checkout/details', {
                      method: 'PATCH',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${session.access_token}`,
                      },
                      body: JSON.stringify({
                        checkout_detail_id: checkoutDetailIdRef.current,
                        status: 'completed',
                        razorpay_payment_id: resp.razorpay_payment_id,
                        order_id: verifyJson.order_id,
                      }),
                    });
                  } catch (e) {
                    console.error('Failed to update checkout details:', e);
                  }
                }

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
                // Update checkout details status to failed
                if (checkoutDetailIdRef.current) {
                  try {
                    await fetch('/api/checkout/details', {
                      method: 'PATCH',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${session.access_token}`,
                      },
                      body: JSON.stringify({
                        checkout_detail_id: checkoutDetailIdRef.current,
                        status: 'failed',
                      }),
                    });
                  } catch (e) {
                    console.error('Failed to update checkout details:', e);
                  }
                }
                setPaymentError(verifyJson.error || 'Payment verification failed');
                setProcessing(false);
              }
            } catch (e: any) {
              // Update checkout details status to failed
              if (checkoutDetailIdRef.current) {
                try {
                  await fetch('/api/checkout/details', {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({
                      checkout_detail_id: checkoutDetailIdRef.current,
                      status: 'failed',
                    }),
                  });
                } catch (err) {
                  console.error('Failed to update checkout details:', err);
                }
              }
              setPaymentError(e?.message || 'Payment verification failed');
              setProcessing(false);
            }
          },
          theme: { color: '#ffffff' },
          modal: {
            ondismiss: () => {
              // Update checkout details status to cancelled
              if (checkoutDetailIdRef.current) {
                const supabase = getSupabaseBrowserClient();
                supabase.auth.getSession().then(({ data: { session } }) => {
                  if (session) {
                    fetch('/api/checkout/details', {
                      method: 'PATCH',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${session.access_token}`,
                      },
                      body: JSON.stringify({
                        checkout_detail_id: checkoutDetailIdRef.current,
                        status: 'cancelled',
                      }),
                    }).catch(e => console.error('Failed to update checkout details:', e));
                  }
                });
              }
              setProcessing(false);
            },
          },
        });

        rzp.open();
      }
    } catch (e: any) {
      console.error(e);
      // Update checkout details status to failed
      const supabase = getSupabaseBrowserClient();
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session && checkoutDetailIdRef.current) {
          fetch('/api/checkout/details', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              checkout_detail_id: checkoutDetailIdRef.current,
              status: 'failed',
            }),
          }).catch(err => console.error('Failed to update checkout details:', err));
        }
      });
      setPaymentError(e?.message || 'Something went wrong processing your payment.');
      setProcessing(false);
    }
  };

  return (
    <main className="bg-background min-h-screen pt-24 pb-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-blue-600 mb-2">
            {subscriptionPlan ? 'Subscribe' : 'Checkout'}
          </h1>
          <p className="text-zinc-600">
            {subscriptionPlan
              ? `Secure payment for ${subscriptionPlan === 'pongal_weekly' ? 'Pongal Weekly Offer' : subscriptionPlan === 'monthly' ? 'monthly' : 'yearly'} Pro subscription.`
              : 'Secure payment for cinematic After Effects templates.'
            }
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.7fr_1fr]">
          {/* Billing Form */}
          <section className="bg-white rounded-xl border-2 border-zinc-200 p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Billing Details */}
              <div>
                <h2 className="text-xl font-bold text-zinc-900 mb-4">Billing Details</h2>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-zinc-700 mb-2">
                      Full Name
                    </label>
                    <input
                      value={billing.name}
                      onChange={(evt) => setBilling((prev) => ({ ...prev, name: evt.target.value }))}
                      className="w-full px-4 py-3 border-2 border-zinc-200 rounded-lg focus:border-blue-500 focus:ring-0 outline-none transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={billing.email}
                      onChange={(evt) => setBilling((prev) => ({ ...prev, email: evt.target.value }))}
                      className="w-full px-4 py-3 border-2 border-zinc-200 rounded-lg focus:border-blue-500 focus:ring-0 outline-none transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 mb-2">
                      Mobile Number
                    </label>
                    <div className="flex">
                      <CountryCodeSelect
                        value={countryCode}
                        onChange={setCountryCode}
                      />
                      <input
                        type="tel"
                        value={billing.mobile}
                        onChange={(evt) => {
                          // Only allow digits for phone number (country code is separate)
                          const value = evt.target.value.replace(/\D/g, '');
                          if (value.length <= 15) {
                            setBilling((prev) => ({ ...prev, mobile: value }));
                          }
                        }}
                        className="flex-1 px-4 py-3 border-2 border-zinc-200 border-l-0 rounded-r-lg focus:border-blue-500 focus:ring-0 outline-none transition-colors"
                        placeholder="9876543210"
                        maxLength={15}
                        required
                      />
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">Select your country code from the dropdown</p>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-zinc-700 mb-2">
                      Company / Studio (optional)
                    </label>
                    <input
                      value={billing.company}
                      onChange={(evt) => setBilling((prev) => ({ ...prev, company: evt.target.value }))}
                      className="w-full px-4 py-3 border-2 border-zinc-200 rounded-lg focus:border-blue-500 focus:ring-0 outline-none transition-colors"
                      placeholder="Celite Productions"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div>
                <h2 className="text-xl font-bold text-zinc-900 mb-4">Payment</h2>
                <div className="bg-blue-50 border-2 border-blue-100 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div>
                      <p className="text-sm text-zinc-700 font-medium mb-1">Secure Payment</p>
                      <p className="text-sm text-zinc-600">
                        Payment will be processed securely through Razorpay. You'll be redirected to a secure payment gateway.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms */}
              <div className="space-y-3">
                <label className="flex items-start gap-3 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    className="mt-0.5 w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                    required
                  />
                  <span>I agree to the Celite license and understand templates include one brand deployment.</span>
                </label>
                <label className="flex items-start gap-3 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    className="mt-0.5 w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Email me about new template drops.</span>
                </label>
              </div>

              {/* Error Message */}
              {paymentError && (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 text-sm text-red-600">
                  {paymentError}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={processing}
                className="w-full bg-blue-600 text-white px-6 py-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl text-base"
              >
                {processing ? 'Processing…' : `Pay ${formatPriceWithDecimal(subtotal)}`}
              </button>
            </form>
          </section>

          {/* Order Summary */}
          <aside className="bg-white rounded-xl border-2 border-zinc-200 p-6 sm:p-8 h-fit">
            <h2 className="text-xl font-bold text-zinc-900 mb-4">
              {subscriptionPlan ? 'Subscription Summary' : 'Order Summary'}
            </h2>

            {subscriptionPlan ? (
              <div className="space-y-4">
                <div className="flex justify-between items-start py-3 border-b border-zinc-200">
                  <div className="flex-1">
                    <p className="font-semibold text-zinc-900">
                      {subscriptionPlan === 'pongal_weekly' ? 'Pongal Weekly Offer' : subscriptionPlan === 'monthly' ? 'Monthly' : 'Yearly'} Pro
                    </p>
                    <p className="text-sm text-zinc-600">
                      {subscriptionPlan === 'pongal_weekly' ? '3 downloads per week for 3 weeks' : 'Unlimited access to all templates'}
                    </p>
                    {subscriptionPlan === 'pongal_weekly' && (
                      <div className="mt-2">
                        <span className="inline-block px-2 py-1 bg-gradient-to-r from-yellow-100 to-amber-100 text-amber-700 text-xs font-semibold rounded border border-amber-200">
                          🎉 Pongal Offer
                        </span>
                      </div>
                    )}
                    {subscriptionPlan === 'monthly' && (
                      <div className="mt-2">
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                          Limited Offer
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    {subscriptionPlan === 'monthly' && (
                      <p className="text-sm text-zinc-500 line-through mb-1">₹899</p>
                    )}
                    <p className="font-bold text-zinc-900">
                      {formatPriceWithDecimal(subscriptionPrice || 0)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  {subscriptionPlan === 'pongal_weekly' ? (
                    <>
                      <div className="flex items-start gap-2">
                        <span className="text-sm text-zinc-600">3 Downloads per week (limit)</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-sm text-zinc-600">Valid for 3 weeks</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-sm text-zinc-600">Auto-renewal with autopay</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-sm text-zinc-600">All Premium Templates</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start gap-2">
                        <span className="text-sm text-zinc-600">Unlimited downloads</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-sm text-zinc-600">New templates weekly</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-sm text-zinc-600">Priority support</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.slug} className="flex gap-4 py-3 border-b border-zinc-200">
                    <img
                      src={item.img}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-zinc-900 text-sm">{item.name}</p>
                      <p className="text-sm text-zinc-600 mt-1">{formatPriceWithDecimal(item.price)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Total */}
            <div className="mt-6 pt-4 border-t-2 border-zinc-300">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-zinc-900">Total</span>
                <span className="text-2xl font-bold text-blue-600">
                  {formatPriceWithDecimal(subtotal)}
                </span>
              </div>
            </div>

            {/* Security Badge */}
            <div className="mt-6 flex items-center gap-2 text-xs text-zinc-500">
              <span>Secured by Razorpay</span>
            </div>
          </aside>
        </div>
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

