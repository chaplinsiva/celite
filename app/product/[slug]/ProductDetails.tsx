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
import { Button } from '../../../components/ui/neon-button';
import { ShinyButton } from '../../../components/ui/shiny-button';
import { GlowingEffect } from '../../../components/ui/glowing-effect';
import { cn } from '../../../lib/utils';
import type { Template } from '../../../data/templateData';
interface Review {
  name: string;
  rating: number;
  comment: string;
  date: string;
}

interface ProductDetailsProps {
  product: Template & { source_path?: string | null };
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
  // Track view_item event when product page loads
  useEffect(() => {
    trackViewItem({
      item_id: product.slug,
      item_name: product.name,
      price: 0,
      currency: 'INR',
    });
  }, [product.slug, product.name]);

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
      
      // Check if source_path exists and is a URL
      if (product.source_path) {
        // Direct redirect to drive link
        window.open(product.source_path, '_blank');
        setDownloading(false);
        return;
      }
      
      // If no source_path, show error
      setFeedback('Download link not available for this template.');
    } catch (e) {
      setFeedback('Something went wrong while opening download link.');
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
        <div className="flex-[1.5] flex flex-col">
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
              <ShinyButton
                onClick={handleDownload}
                className={downloading ? 'opacity-70 cursor-not-allowed' : ''}
              >
                {downloading ? 'Preparing…' : 'Download Now'}
              </ShinyButton>
            </div>
          ) : purchased ? (
            <div className="flex items-center gap-4 mb-6 justify-start">
              <ShinyButton
                onClick={handleDownload}
                className={downloading ? 'opacity-70 cursor-not-allowed' : ''}
              >
                {downloading ? 'Preparing…' : 'Download Now'}
              </ShinyButton>
              <span className="text-xs text-green-300">Purchased</span>
            </div>
          ) : (
            <div className="flex flex-col gap-4 mb-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4 flex-wrap justify-start">
                  <ShinyButton
                    onClick={async () => {
                      if (!user) {
                        // Not logged in - show login/signup
                        openLoginModal();
                        return;
                      }
                      if (!isSubActive) {
                        // Logged in but not subscribed - go to pricing
                        router.push('/pricing');
                        return;
                      }
                      // Subscribed - download the file
                      await handleDownload();
                    }}
                    className={downloading ? 'opacity-70 cursor-not-allowed' : ''}
                  >
                    {downloading ? 'Preparing…' : 'Download Now'}
                  </ShinyButton>
                </div>
                {!isSubActive && user && (
                  <p className="text-sm text-zinc-400">
                    Subscribe to get unlimited access to all templates
                  </p>
                )}
                {!user && (
                  <p className="text-sm text-zinc-400">
                    Sign in to download templates
                  </p>
                )}
              </div>
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
