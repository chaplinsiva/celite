"use client";

export const dynamic = 'force-dynamic';

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { formatPriceWithDecimal } from "../../lib/currency";
import { GlowingEffect } from "../../components/ui/glowing-effect";
import { cn } from "../../lib/utils";
import LoadingSpinner from "../../components/ui/loading-spinner";

export default function CartPage() {
  const [mounted, setMounted] = useState(false);
  const { user, cartItems, cartCount, removeFromCart, resetCart } = useAppContext();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <LoadingSpinner message="Loading cart..." fullScreen />;
  }

  const subtotal = cartItems.reduce((sum, item) => sum + item.price, 0);

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
            <h1 className="text-3xl font-semibold text-white">Your cart is empty</h1>
            <p className="mt-4 text-zinc-300">
              Sign in with the demo credentials to add templates and explore checkout.
            </p>
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

  return (
    <main className="relative bg-black min-h-screen pt-24 pb-20 px-4 sm:px-6 text-white overflow-hidden">
      {/* Colorful Background Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      </div>
      
      <div className="relative max-w-5xl mx-auto space-y-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl md:text-4xl font-bold text-white">Your Cart</h1>
          <p className="text-sm text-zinc-400">{cartCount} item{cartCount === 1 ? '' : 's'} ready to render.</p>
        </header>

        {cartItems.length === 0 ? (
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
            <p className="text-zinc-300">No templates yet. Browse the featured collection to get started.</p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-zinc-200"
            >
              Explore templates
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
            <section className="space-y-4">
              {cartItems.map((item) => (
                <article key={item.slug} className={cn(
                  "relative flex gap-4 rounded-[1.25rem] md:rounded-[1.5rem] border-[0.75px] border-white/10 bg-black/40 backdrop-blur-sm p-4 shadow"
                )}>
                  <GlowingEffect
                    spread={40}
                    glow={true}
                    disabled={false}
                    proximity={64}
                    inactiveZone={0.01}
                    borderWidth={3}
                  />
                  {item.img && item.img.trim() !== '' ? (
                    <div className="relative h-24 w-36 overflow-hidden rounded-xl">
                      <Image
                        src={item.img}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="144px"
                        priority={item.slug === cartItems[0]?.slug}
                      />
                    </div>
                  ) : (
                    <div className="relative h-24 w-36 overflow-hidden rounded-xl bg-zinc-800/50 flex items-center justify-center">
                      <svg className="w-8 h-8 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-white">{item.name}</h2>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{formatPriceWithDecimal(item.price)}</span>
                      <button
                        onClick={() => removeFromCart(item.slug)}
                        className="text-xs font-semibold uppercase tracking-widest text-red-300 hover:text-red-100 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </section>

            <aside className={cn(
              "relative rounded-[1.25rem] md:rounded-[1.5rem] border-[0.75px] border-white/10 bg-black/40 backdrop-blur-sm p-6 shadow-lg space-y-4"
            )}>
              <GlowingEffect
                spread={40}
                glow={true}
                disabled={false}
                proximity={64}
                inactiveZone={0.01}
                borderWidth={3}
              />
              <h3 className="text-xl font-semibold text-white">Summary</h3>
              <div className="flex items-center justify-between text-sm text-zinc-300">
                <span>Subtotal</span>
                <span>{formatPriceWithDecimal(subtotal)}</span>
              </div>
              <p className="text-xs text-zinc-500">Taxes and discounts will be calculated at checkout.</p>
              <Link
                href="/checkout"
                className="inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
              >
                Checkout
              </Link>
              <button
                onClick={resetCart}
                className="w-full rounded-full border border-white/20 px-5 py-2 text-xs text-white transition hover:border-white hover:bg-white/10"
              >
                Clear cart
              </button>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

