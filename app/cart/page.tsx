"use client";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { formatPriceWithDecimal } from "../../lib/currency";

export default function CartPage() {
  const [mounted, setMounted] = useState(false);
  const { user, cartItems, cartCount, removeFromCart, resetCart } = useAppContext();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <main className="bg-black min-h-screen pt-24 pb-20 px-6 text-white">
        <div className="max-w-3xl mx-auto text-center rounded-3xl border border-white/10 bg-white/5 p-12">
          <h1 className="text-3xl font-semibold">Loading...</h1>
        </div>
      </main>
    );
  }

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (!user) {
    return (
      <main className="bg-black min-h-screen pt-24 pb-20 px-6 text-white">
        <div className="max-w-3xl mx-auto text-center rounded-3xl border border-white/10 bg-white/5 p-12">
          <h1 className="text-3xl font-semibold">Your cart is empty</h1>
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
      </main>
    );
  }

  return (
    <main className="bg-black min-h-screen pt-24 pb-20 px-6 text-white">
      <div className="max-w-5xl mx-auto space-y-10">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Your Cart</h1>
          <p className="text-sm text-zinc-400">{cartCount} item{cartCount === 1 ? '' : 's'} ready to render.</p>
        </header>

        {cartItems.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
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
            <section className="space-y-5">
              {cartItems.map((item) => (
                <article key={item.slug} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 shadow">
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
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-white">{item.name}</h2>
                      <p className="text-sm text-zinc-400">Quantity: {item.quantity}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{formatPriceWithDecimal(item.price * item.quantity)}</span>
                      <button
                        onClick={() => removeFromCart(item.slug)}
                        className="text-xs font-semibold uppercase tracking-widest text-red-300 hover:text-red-100"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </section>

            <aside className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg space-y-4">
              <h3 className="text-xl font-semibold">Summary</h3>
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

