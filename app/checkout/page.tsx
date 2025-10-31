"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { getSupabaseBrowserClient } from "../../lib/supabaseClient";
import { formatPriceWithDecimal } from "../../lib/currency";

type BillingDetails = {
  name: string;
  email: string;
  company?: string;
};

export default function CheckoutPage() {
  const router = useRouter();
  const { user, cartItems, cartCount, resetCart } = useAppContext();
  const [billing, setBilling] = useState<BillingDetails>({
    name: user?.email.split("@")[0] ?? "",
    email: user?.email ?? "",
    company: "",
  });
  const [processing, setProcessing] = useState(false);
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (!user) {
    return (
      <main className="bg-black min-h-screen pt-24 pb-20 px-6 text-white">
        <div className="max-w-3xl mx-auto text-center rounded-3xl border border-white/10 bg-white/5 p-12">
          <h1 className="text-3xl font-semibold">Sign in to checkout</h1>
          <p className="mt-4 text-zinc-300">
            Use <span className="font-mono">celite@gmail.com</span> / <span className="font-mono">123</span> to experience the full flow.
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProcessing(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const total = subtotal;
      // Create order
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          user_id: (user as any).id,
          total,
          billing_name: billing.name,
          billing_email: billing.email,
          billing_company: billing.company || null,
          status: 'paid',
        })
        .select('id')
        .single();
      if (orderErr) throw orderErr;
      // Insert order items
      const items = cartItems.map((it) => ({
        order_id: order.id,
        slug: it.slug,
        name: it.name,
        price: it.price,
        quantity: it.quantity,
        img: it.img,
      }));
      const { error: itemsErr } = await supabase.from('order_items').insert(items);
      if (itemsErr) throw itemsErr;
      // Clear cart
      await resetCart();
      router.push("/dashboard");
    } catch (e) {
      console.error(e);
      setProcessing(false);
      alert('Something went wrong saving your order.');
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
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-zinc-200 sm:col-span-2">
                  Card number
                  <input
                    autoComplete="off"
                    inputMode="numeric"
                    maxLength={19}
                    placeholder="4242 4242 4242 4242"
                    className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                    required
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-zinc-200">
                  Expiry
                  <input
                    placeholder="MM/YY"
                    maxLength={5}
                    className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                    required
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-zinc-200">
                  CVC
                  <input
                    placeholder="123"
                    maxLength={4}
                    className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                    required
                  />
                </label>
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

