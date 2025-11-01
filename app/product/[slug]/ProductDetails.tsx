"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppContext, TemplateCartItem } from '../../../context/AppContext';
import { getSupabaseBrowserClient } from '../../../lib/supabaseClient';
import { formatPrice } from '../../../lib/currency';
import { useLoginModal } from '../../../context/LoginModalContext';
import type { Template } from '../../../data/templateData';
interface Review {
  name: string;
  rating: number;
  comment: string;
  date: string;
}

interface ProductDetailsProps {
  product: Template;
  related: Template[];
  reviews: Review[];
}

export default function ProductDetails({ product, related, reviews }: ProductDetailsProps) {
  const { addToCart, user } = useAppContext();
  const { openLoginModal } = useLoginModal();
  const router = useRouter();
  const [feedback, setFeedback] = useState<string | null>(null);
  const relatedVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const [hoveredRelated, setHoveredRelated] = useState<string | null>(null);
  const [relatedMuted, setRelatedMuted] = useState<Record<string, boolean>>({});
  const [isSubActive, setIsSubActive] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [purchased, setPurchased] = useState<boolean>(false);
  const [purchaseStatus, setPurchaseStatus] = useState<string | null>(null);
  const [paying, setPaying] = useState<boolean>(false);

  useEffect(() => {
    const loadSub = async () => {
      try {
        if (!user) {
          setIsSubActive(false);
          setPurchased(false);
          setPurchaseStatus(null);
          return;
        }
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase
          .from('subscriptions')
          .select('is_active, valid_until')
          .eq('user_id', (user as any).id)
          .maybeSingle();
        if (!data) { setIsSubActive(false); return; }
        const active = !!data.is_active && (!data.valid_until || new Date(data.valid_until).getTime() > Date.now());
        setIsSubActive(active);

        // Check purchase status - use orders table (purchases table may not exist)
        const { data: orders } = await supabase
          .from('orders')
          .select('id, status')
          .eq('user_id', (user as any).id);
        const orderIds = (orders ?? []).map((o: any) => o.id);
        if (orderIds.length > 0) {
          const { data: items } = await supabase
            .from('order_items')
            .select('order_id')
            .in('order_id', orderIds)
            .eq('slug', product.slug)
            .limit(1);
          const hasPurchase = (items ?? []).length > 0;
          setPurchased(hasPurchase);
          
          // If purchase exists, check if status is failed
          if (hasPurchase && orders && orders.length > 0) {
            const failedOrder = orders.find((o: any) => o.status === 'failed');
            setPurchaseStatus(failedOrder ? 'failed' : 'paid');
          } else {
            setPurchaseStatus(null);
          }
        } else {
          setPurchased(false);
          setPurchaseStatus(null);
        }
      } catch {
        setIsSubActive(false);
        setPurchased(false);
        setPurchaseStatus(null);
      }
    };
    loadSub();
  }, [user, product.slug]);

  // Check if limited offer is valid (FREE for subscribed users during limited time)
  const { effectivePrice, hasActiveLimitedOffer, daysRemaining } = useMemo(() => {
    const productAny = product as any;
    const isLimitedOffer = productAny?.is_limited_offer;
    
    if (!isLimitedOffer) {
      return { effectivePrice: product.price, hasActiveLimitedOffer: false, daysRemaining: null };
    }
    
    const startDate = productAny.limited_offer_start_date ? new Date(productAny.limited_offer_start_date) : new Date();
    const durationDays = productAny.limited_offer_duration_days || 0;
    if (durationDays <= 0) {
      return { effectivePrice: product.price, hasActiveLimitedOffer: false, daysRemaining: null };
    }
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + durationDays);
    const now = new Date();
    
    // Check if offer is still active
    if (now >= startDate && now <= endDate) {
      const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      // Free only for subscribed users
      const effectivePrice = isSubActive ? 0 : product.price;
      return { effectivePrice, hasActiveLimitedOffer: true, daysRemaining };
    }
    
    return { effectivePrice: product.price, hasActiveLimitedOffer: false, daysRemaining: null };
  }, [isSubActive, product]);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        openLoginModal();
        setDownloading(false);
        return;
      }
      const res = await fetch(`/api/download/${product.slug}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        let message = 'Download not available.';
        try {
          const j = await res.json();
          message = j.error || message;
        } catch {}
        setFeedback(message);
      } else {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${product.slug}.rar`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      setFeedback('Something went wrong while generating download link.');
    } finally {
      setTimeout(() => setFeedback(null), 3000);
      setDownloading(false);
    }
  };

  const handleBuyNow = async () => {
    try {
      setPaying(true);
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        openLoginModal();
        setPaying(false);
        return;
      }
      
      // If it's free for subscribed users (limited offer), add directly to purchases
      if (hasActiveLimitedOffer && effectivePrice === 0) {
        const res = await fetch('/api/purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ slug: product.slug }),
        });
        const json = await res.json();
        if (res.ok && json.ok) {
          setPurchased(true);
          setFeedback('Added to your purchases! You can download now.');
        } else {
          setFeedback(json.error || 'Failed to add to purchases');
        }
        setPaying(false);
        setTimeout(() => setFeedback(null), 3000);
        return;
      }
      
      // Otherwise, proceed with Razorpay payment
      await loadRazorpay();
      // Create order in backend (amount in paise) - use effective price (limited offer if available)
      const priceToUse = hasActiveLimitedOffer ? effectivePrice : product.price;
      const res = await fetch('/api/payments/razorpay/order', {
        method: 'POST', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ amount: priceToUse * 100, product: { slug: product.slug, name: product.name, price: priceToUse, img: product.img } })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) { setFeedback(json.error || 'Payment init failed'); setPaying(false); return; }
      const options: any = {
        key: json.key,
        amount: json.order.amount,
        currency: json.order.currency,
        name: 'Celite',
        description: product.name,
        image: '/Logo.png',
        order_id: json.order.id,
        handler: async (resp: any) => {
          try {
            // Get fresh session inside handler
            const supabase = getSupabaseBrowserClient();
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (!currentSession) {
              setFeedback('Session expired. Please log in again.');
              return;
            }
            const verify = await fetch('/api/payments/razorpay/verify', {
              method: 'POST', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${currentSession.access_token}` },
              body: JSON.stringify({ razorpay_order_id: resp.razorpay_order_id, razorpay_payment_id: resp.razorpay_payment_id, razorpay_signature: resp.razorpay_signature })
            });
            const vjson = await verify.json();
            if (verify.ok && vjson.ok) {
              setPurchased(true);
              setFeedback('Payment successful. You can download now.');
            } else {
              setFeedback(vjson.error || 'Payment verify failed');
            }
          } catch (e: any) {
            setFeedback(e?.message || 'Payment verify failed');
          }
        },
        prefill: {
          email: (user as any)?.email || '',
          name: (user as any)?.user_metadata?.first_name && (user as any)?.user_metadata?.last_name
            ? `${(user as any).user_metadata.first_name} ${(user as any).user_metadata.last_name}`.trim()
            : (user as any)?.email?.split('@')[0] || '',
        },
        theme: { color: '#ffffff' },
      };
      // @ts-ignore
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e) {
      setFeedback('Payment failed to start');
    } finally {
      setTimeout(() => setFeedback(null), 3000);
      setPaying(false);
    }
  };

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


  const handleAddToCart = async () => {
    if (!user) {
      openLoginModal();
      return;
    }
    
    // If it's free for subscribed users (limited offer), add directly to purchases
    if (hasActiveLimitedOffer && effectivePrice === 0) {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setFeedback('Please log in.');
          return;
        }
        const res = await fetch('/api/purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ slug: product.slug }),
        });
        const json = await res.json();
        if (res.ok && json.ok) {
          setPurchased(true);
          setFeedback('Added to your purchases! You can download now.');
        } else {
          setFeedback(json.error || 'Failed to add to purchases');
        }
        setTimeout(() => setFeedback(null), 3000);
      } catch (e: any) {
        setFeedback(e?.message || 'Failed to add to purchases');
        setTimeout(() => setFeedback(null), 3000);
      }
      return;
    }
    
    // Otherwise, add to cart with effective price
    const priceToUse = hasActiveLimitedOffer ? effectivePrice : product.price;
    const cartItem: TemplateCartItem = {
      slug: product.slug,
      name: product.name,
      price: priceToUse,
      img: product.img,
      quantity: 1,
    };
    addToCart(cartItem);
    setFeedback('Template added to your cart.');
    setTimeout(() => setFeedback(null), 2500);
  };

  const onRelatedEnter = (slug: string, hasVideo?: boolean) => {
    if (!hasVideo) return;
    setHoveredRelated(slug);
    const vid = relatedVideoRefs.current[slug];
    if (vid) {
      vid.currentTime = 0;
      const isMuted = relatedMuted[slug] ?? true;
      vid.muted = isMuted;
      const p = vid.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }
  };

  const onRelatedLeave = (slug: string) => {
    const vid = relatedVideoRefs.current[slug];
    if (vid) {
      vid.pause();
      vid.currentTime = 0;
    }
    setHoveredRelated((h) => (h === slug ? null : h));
  };

  const toggleRelatedMute = (slug: string) => {
    const nextMuted = !(relatedMuted[slug] ?? true);
    setRelatedMuted((m) => ({ ...m, [slug]: nextMuted }));
    const vid = relatedVideoRefs.current[slug];
    if (vid) vid.muted = nextMuted;
  };

  const retryPayment = () => {
    // Navigate to checkout or retry payment
    router.push(`/checkout?product=${product.slug}`);
  };

  // Show payment failed UI if purchase status is failed (only if we have a purchase but status is failed)
  // Note: We only show this if there's actually a purchase attempt that failed
  // If purchaseStatus is null, we don't show the failed UI

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes gradient-border {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}} />
      <main className="bg-black min-h-screen pt-0 sm:pt-16 px-1 sm:px-0">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-10 mb-14 mt-10 py-8 sm:py-12 px-3 sm:px-8 bg-zinc-900/80 rounded-3xl shadow-lg">
        {/* Product Gallery */}
        <div className="flex-1 flex flex-col items-center md:items-start w-full">
          {product.video ? (
            <video width="480" height="270" src={product.video} controls preload="metadata" poster={product.img}
              className="w-full max-w-xs sm:max-w-sm md:max-w-sm lg:max-w-xs rounded-2xl shadow-xl object-cover mb-7"
            >
              Sorry, your browser does not support embedded videos.
            </video>
          ) : (
            <img src={product.img} alt={product.name} className="w-full max-w-xs sm:max-w-sm md:max-w-sm lg:max-w-xs rounded-2xl shadow-xl object-cover mb-7" />
          )}
        </div>
        {/* Product Info */}
        <div className="flex-[1.5] flex flex-col justify-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{product.name}</h1>
          <h2 className="text-lg text-zinc-300 mb-4 font-medium">{product.subtitle}</h2>
          <div className="text-zinc-200 leading-relaxed mb-5">{product.desc}</div>
          <ul className="list-disc pl-6 text-zinc-400 mb-4 text-sm">
            {product.features.map((f, idx) => <li key={idx}>{f}</li>)}
          </ul>
          <div className="flex flex-wrap gap-5 mb-6">
            <div>
              <h3 className="font-semibold text-zinc-200 mb-1 text-base">Software</h3>
              <ul className="list-disc pl-5 text-zinc-400">
                {product.software.map((soft, idx) => <li key={idx}>{soft}</li>)}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-zinc-200 mb-1 text-base">Plugins</h3>
              <ul className="list-disc pl-5 text-zinc-400">
                {product.plugins.map((plugin, idx) => <li key={idx}>{plugin}</li>)}
              </ul>
            </div>
          </div>
          {isSubActive ? (
            <div className="flex items-center gap-4 mb-6">
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="px-7 py-3 rounded-full bg-white text-black font-semibold shadow hover:bg-zinc-200 transition disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {downloading ? 'Preparing…' : 'Download Now'}
              </button>
            </div>
          ) : purchased ? (
            <div className="flex items-center gap-4 mb-6">
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="px-7 py-3 rounded-full bg-white text-black font-semibold shadow hover:bg-zinc-200 transition disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {downloading ? 'Preparing…' : 'Download Now'}
              </button>
              <span className="text-xs text-green-300">Purchased</span>
            </div>
          ) : (
            <div className="flex flex-col gap-4 mb-6">
              {hasActiveLimitedOffer && (
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-2 py-1 rounded-lg bg-white text-black text-xs font-semibold border border-black/20">LIMITED</span>
                  {daysRemaining !== null && daysRemaining !== undefined && (
                    <span className="text-xs text-white">
                      {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
                    </span>
                  )}
                  {isSubActive && (
                    <span className="text-xs text-white">Only for Subscribed Users</span>
                  )}
                </div>
              )}
              <div className="space-y-4">
                <div className="flex items-center gap-4 flex-wrap">
                  {hasActiveLimitedOffer ? (
                    <div className="flex items-center gap-3">
                      {isSubActive ? (
                        <>
                          <span className="text-2xl font-bold text-green-400">FREE</span>
                          <span className="text-lg text-zinc-400 line-through">{formatPrice(product.price)}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-2xl font-bold text-white line-through">{formatPrice(product.price)}</span>
                          <span className="text-lg text-zinc-400 ml-2">FREE for Subscribers</span>
                        </>
                      )}
                    </div>
                  ) : (
                    <span className="text-2xl font-bold text-white">{formatPrice(product.price)}</span>
                  )}
                  <div className="flex items-center gap-3">
                  {hasActiveLimitedOffer && !isSubActive ? (
                    <Link
                      href="/pricing"
                      className="relative inline-flex items-center justify-center px-7 py-3 rounded-full text-white font-semibold group"
                      style={{
                        padding: '2px',
                        background: 'linear-gradient(90deg, #ec4899, #3b82f6, #ec4899, #3b82f6)',
                        backgroundSize: '200% 200%',
                        animation: 'gradient-border 3s ease infinite',
                      }}
                    >
                      <span className="relative z-10 bg-black rounded-full px-7 py-3 w-full h-full flex items-center justify-center">
                        Subscribe Now
                      </span>
                    </Link>
                  ) : (
                      <>
                        <button
                          type="button"
                          onClick={handleAddToCart}
                          className="px-7 py-3 rounded-full bg-white text-black font-semibold shadow hover:bg-zinc-200 transition"
                        >
                          {hasActiveLimitedOffer && effectivePrice === 0 ? 'Claim Free' : 'Add to Cart'}
                        </button>
                        <button
                          type="button"
                          onClick={handleBuyNow}
                          disabled={paying}
                          className="px-7 py-3 rounded-full border border-white/25 text-white font-semibold shadow hover:bg-white/10 transition disabled:opacity-70"
                        >
                          {paying ? 'Processing…' : (hasActiveLimitedOffer && effectivePrice === 0 ? 'Get Free' : 'Buy Now')}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {!isSubActive && !hasActiveLimitedOffer && (
                  <Link
                    href="/pricing"
                    className="relative inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-black text-white text-sm font-semibold group"
                    style={{
                      padding: '2px',
                      background: 'linear-gradient(90deg, #ec4899, #3b82f6, #ec4899, #3b82f6)',
                      backgroundSize: '200% 200%',
                      animation: 'gradient-border 3s ease infinite',
                    }}
                  >
                    <span className="relative z-10 bg-black rounded-lg px-5 py-2.5 w-full h-full flex items-center justify-center">
                      Subscribe to Unlock everything
                    </span>
                  </Link>
                )}
              </div>
              {hasActiveLimitedOffer && !isSubActive && (
                <p 
                  className="text-xs font-medium"
                  style={{
                    background: 'linear-gradient(90deg, #ec4899, #3b82f6, #ec4899, #3b82f6)',
                    backgroundSize: '200% 200%',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    animation: 'gradient-border 3s ease infinite',
                  }}
                >
                  Subscribe to get this template for FREE! Limited time offer.
                </p>
              )}
            </div>
          )}
          {feedback && <p className="text-sm text-blue-300">{feedback}</p>}
        </div>
      </div>
      {/* Related Products */}
      <section className="max-w-5xl mx-auto w-full mb-12">
        <h3 className="text-xl font-bold text-white mb-5">Related Products</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {related.map((r) => (
            <div
              key={r.slug}
              className="bg-zinc-900 rounded-xl shadow-md p-3 flex flex-col items-center"
              onMouseEnter={() => onRelatedEnter(r.slug, !!r.video)}
              onMouseLeave={() => onRelatedLeave(r.slug)}
            >
              <div className="relative w-full h-32 sm:h-40 rounded-lg mb-2 overflow-hidden">
                <img
                  src={r.img}
                  alt={r.name}
                  className="absolute inset-0 w-full h-full object-cover rounded-lg transition-opacity duration-200"
                  style={{ opacity: hoveredRelated === r.slug && r.video ? 0 : 1 }}
                />
                {r.video && (
                  <video
                    ref={(el) => { relatedVideoRefs.current[r.slug] = el; }}
                    src={r.video}
                    poster={r.img}
                    playsInline
                    muted={(relatedMuted[r.slug] ?? true)}
                    preload="metadata"
                    className={`absolute inset-0 w-full h-full object-cover rounded-lg transition-opacity duration-200 ${hoveredRelated === r.slug ? 'opacity-100' : 'opacity-0'}`}
                  >
                    Sorry, your browser does not support embedded videos.
                  </video>
                )}
                {hoveredRelated === r.slug && r.video && (
                  <button
                    aria-label={(relatedMuted[r.slug] ?? true) ? 'Unmute audio' : 'Mute audio'}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleRelatedMute(r.slug); }}
                    className="absolute bottom-2 right-2 bg-black/70 text-white rounded-full w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center"
                    title={(relatedMuted[r.slug] ?? true) ? 'Unmute' : 'Mute'}
                  >
                    {(relatedMuted[r.slug] ?? true) ? (
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M3 9v6h4l5 5V4L7 9H3z"></path>
                        <path d="M16 9l5 5m0-5l-5 5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M3 9v6h4l5 5V4L7 9H3z"></path>
                        <path d="M16 8a5 5 0 010 8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                        <path d="M18 6a8 8 0 010 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
              <span className="text-zinc-200 font-semibold text-lg mb-1">{r.name}</span>
              <div className="text-xs text-zinc-500">{formatPrice(r.price)}</div>
              <Link
                href={`/product/${r.slug}`}
                className="px-4 py-1 mt-2 rounded-lg bg-white text-black text-sm font-medium shadow hover:bg-zinc-200 transition"
              >
                View
              </Link>
            </div>
          ))}
        </div>
      </section>
      {/* Reviews/Comments */}
      <section className="max-w-5xl mx-auto w-full mb-12">
        <h3 className="text-xl font-bold text-white mb-5">Comments & Reviews</h3>
        <div className="flex flex-col gap-7">
          {reviews.map((rev, idx) => (
            <div key={rev.name+rev.date+idx} className="bg-zinc-900 rounded-xl px-6 py-5 flex flex-col sm:flex-row items-start gap-4 shadow">
              <div className="flex flex-col w-full">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-white">{rev.name}</span>
                  <span className="text-yellow-400">{'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}</span>
                  <span className="text-xs text-zinc-500 ml-2">{new Date(rev.date).toLocaleDateString()}</span>
                </div>
                <div className="text-zinc-300 text-sm">{rev.comment}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
    </>
  );
}
