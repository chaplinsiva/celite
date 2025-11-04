"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppContext, TemplateCartItem } from '../../../context/AppContext';
import { getSupabaseBrowserClient } from '../../../lib/supabaseClient';
import { formatPrice } from '../../../lib/currency';
import { useLoginModal } from '../../../context/LoginModalContext';
import { trackViewItem, trackAddToCart } from '../../../lib/gtag';
import { getYouTubeEmbedUrl } from '../../../lib/utils';
import YouTubeVideoPlayer from '../../../components/YouTubeVideoPlayer';
import { ShinyButton } from '../../../components/ui/shiny-button';
import { Button } from '../../../components/ui/neon-button';
import { GlowingEffect } from '../../../components/ui/glowing-effect';
import { cn } from '../../../lib/utils';
import { Liquid } from '../../../components/ui/button-1';
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
  const [isSubActive, setIsSubActive] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [purchased, setPurchased] = useState<boolean>(false);
  const [purchaseStatus, setPurchaseStatus] = useState<string | null>(null);
  const [paying, setPaying] = useState<boolean>(false);
  const [isLimitedHovered, setIsLimitedHovered] = useState<boolean>(false);

  // Track view_item event when product page loads
  useEffect(() => {
    trackViewItem({
      item_id: product.slug,
      item_name: product.name,
      price: product.price,
      currency: 'INR',
    });
  }, [product.slug, product.name, product.price]);

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
        // Check if response is JSON (redirect to external URL)
        const contentType = res.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const json = await res.json();
          if (json.redirect && json.url) {
            // Redirect to external drive link
            window.open(json.url, '_blank');
            return;
          }
          return; // If it's JSON but no redirect, return early
        }
        
        // Otherwise, download as blob (Supabase storage file)
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
      
      // Redirect to checkout page instead of direct payment
      router.push(`/checkout?product=${product.slug}`);
      setPaying(false);
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
    };
    addToCart(cartItem);
    // Track add_to_cart event
    trackAddToCart({
      item_id: product.slug,
      item_name: product.name,
      price: priceToUse,
      currency: 'INR',
    });
    setFeedback('Template added to your cart.');
    setTimeout(() => setFeedback(null), 2500);
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
      <div className="max-w-5xl mx-auto mb-14 mt-10 px-4 sm:px-6 md:px-8">
        <div className="relative rounded-[1.25rem] border-[0.75px] border-white/10 p-2 md:rounded-[1.5rem] md:p-3">
          <GlowingEffect
            spread={40}
            glow={true}
            disabled={false}
            proximity={64}
            inactiveZone={0.01}
            borderWidth={3}
          />
          <div className="relative flex flex-col md:flex-row gap-10 overflow-hidden rounded-xl border-[0.75px] border-white/10 bg-black/40 backdrop-blur-sm p-6 sm:p-8 md:p-12 shadow-sm dark:shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)]">
        {/* Product Gallery */}
        <div className="flex-1 flex flex-col items-center md:items-start w-full">
          {product.video ? (
            <div className="w-full max-w-xs sm:max-w-sm md:max-w-sm lg:max-w-xs rounded-2xl shadow-xl mb-7 overflow-hidden aspect-video">
              <YouTubeVideoPlayer 
                videoUrl={product.video}
                title={product.name}
                className="w-full h-full"
                showFullscreen={true}
              />
            </div>
          ) : null}
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
            <div className="flex items-center gap-4 mb-6 justify-start">
              <Button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                variant="default"
                size="lg"
                className="px-7 py-3 font-semibold disabled:opacity-70"
              >
                {downloading ? 'Preparing…' : 'Download Now'}
              </Button>
            </div>
          ) : purchased ? (
            <div className="flex items-center gap-4 mb-6">
              <Button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                variant="default"
                size="lg"
                className="px-7 py-3 font-semibold disabled:opacity-70"
              >
                {downloading ? 'Preparing…' : 'Download Now'}
              </Button>
              <span className="text-xs text-green-300">Purchased</span>
            </div>
          ) : (
            <div className="flex flex-col gap-4 mb-6">
              {hasActiveLimitedOffer && (
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="relative inline-block w-[100px] h-[28px] group"
                    onMouseEnter={() => setIsLimitedHovered(true)}
                    onMouseLeave={() => setIsLimitedHovered(false)}
                  >
                    <div className="relative w-full h-full overflow-hidden rounded-lg">
                      <span className="absolute inset-0 rounded-lg bg-gradient-to-br from-pink-500/90 to-purple-500/90"></span>
                      <Liquid isHovered={isLimitedHovered} colors={{
                        color1: '#FFFFFF',
                        color2: '#EC4899',
                        color3: '#F472B6',
                        color4: '#FCFCFE',
                        color5: '#F9F9FD',
                        color6: '#F9A8D4',
                        color7: '#DB2777',
                        color8: '#BE185D',
                        color9: '#EC4899',
                        color10: '#F472B6',
                        color11: '#DB2777',
                        color12: '#FBCFE8',
                        color13: '#EC4899',
                        color14: '#F9A8D4',
                        color15: '#FBCFE8',
                        color16: '#EC4899',
                        color17: '#DB2777',
                      }} />
                    </div>
                    <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-transparent pointer-events-none">
                      <span className="text-white text-xs font-semibold tracking-wide whitespace-nowrap z-10">LIMITED</span>
                    </span>
                  </div>
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
                  ) : product.price === 0 ? (
                    <span className="text-3xl sm:text-4xl font-black text-white">
                      FREE
                    </span>
                  ) : (
                    <span className="text-2xl font-bold text-white">{formatPrice(product.price)}</span>
                  )}
                  <div className="flex items-center gap-3">
                  {product.price === 0 ? (
                    <Button
                      type="button"
                      onClick={handleDownload}
                      disabled={downloading}
                      variant="default"
                      size="lg"
                      className="px-7 py-3 font-semibold disabled:opacity-70"
                    >
                      {downloading ? 'Preparing…' : 'Download Now'}
                    </Button>
                  ) : hasActiveLimitedOffer && !isSubActive ? (
                    <Link href="/pricing" className="inline-block">
                      <ShinyButton>
                        Subscribe Now
                      </ShinyButton>
                    </Link>
                  ) : (
                      <>
                        <Button
                          type="button"
                          onClick={handleAddToCart}
                          variant="inverse"
                          size="lg"
                          className="px-7 py-3 font-semibold"
                        >
                          {hasActiveLimitedOffer && effectivePrice === 0 ? 'Claim Free' : 'Add to Cart'}
                        </Button>
                        <Button
                          type="button"
                          onClick={handleBuyNow}
                          disabled={paying}
                          variant="default"
                          size="lg"
                          className="px-7 py-3 font-semibold disabled:opacity-70"
                        >
                          {paying ? 'Processing…' : (hasActiveLimitedOffer && effectivePrice === 0 ? 'Get Free' : 'Buy Now')}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {!isSubActive && !hasActiveLimitedOffer && (
                  <Link href="/pricing" className="inline-block">
                    <ShinyButton>
                      Subscribe to Unlock everything
                    </ShinyButton>
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
        </div>
      </div>
      {/* Related Products */}
      <section className="max-w-5xl mx-auto w-full mb-12 px-4 sm:px-6 md:px-8">
        <h3 className="text-xl font-bold text-white mb-5">Related Products</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {related.map((r) => (
            <div key={r.slug} className="relative h-full rounded-[1.25rem] border-[0.75px] border-white/10 p-2 md:rounded-[1.5rem] md:p-3">
              <GlowingEffect
                spread={40}
                glow={true}
                disabled={false}
                proximity={64}
                inactiveZone={0.01}
                borderWidth={3}
              />
              <div className="relative flex h-full flex-col overflow-hidden rounded-xl border-[0.75px] border-white/10 bg-black/40 backdrop-blur-sm p-4 shadow-sm dark:shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)]">
                <Link href={`/product/${r.slug}`} className="absolute inset-0 z-10" aria-label={r.name || 'Template'} />
                <div className="relative w-full h-40 sm:h-48 md:h-40 rounded-lg mb-3 overflow-hidden pointer-events-none">
                  {r.video ? (
                    <YouTubeVideoPlayer 
                      videoUrl={r.video}
                      title={r.name || 'Template'}
                      className="w-full h-full"
                    />
                  ) : null}
                </div>
                <div className="flex flex-col gap-2 flex-1 relative z-0">
                  <h3 className="text-base sm:text-lg font-semibold text-white text-center leading-tight">{r.name}</h3>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-center mt-8">
          <Button
            variant="default"
            size="lg"
            className="px-7 py-3 font-semibold"
            asChild
          >
            <Link href="/templates">
              Explore More Templates
            </Link>
          </Button>
        </div>
      </section>
    </main>
    </>
  );
}
