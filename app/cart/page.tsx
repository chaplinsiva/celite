"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Trash2 } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useLoginModal } from '../../context/LoginModalContext';
import { getSupabaseBrowserClient } from '../../lib/supabaseClient';
import { convertR2UrlToCdn } from '../../lib/utils';

type CartItem = {
  slug: string;
  name: string;
  price: number;
  qty: number;
  img?: string | null;
};

export default function CartPage() {
  const { user } = useAppContext();
  const { openLoginModal } = useLoginModal();
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const loadCart = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        openLoginModal();
        return;
      }
      const res = await fetch('/api/cart', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || 'Failed to load cart');
        return;
      }
      setItems(json.items || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
    } else {
      loadCart();
    }
  }, [user]);

  const total = items.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.qty) || 1), 0);

  const removeItem = async (slug: string) => {
    if (!user) { openLoginModal(); return; }
    setUpdating(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { openLoginModal(); return; }
      const res = await fetch('/api/cart', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ slug }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || 'Failed to remove item');
        return;
      }
      setItems((prev) => prev.filter((i) => i.slug !== slug));
    } catch (e: any) {
      setError(e?.message || 'Failed to remove item');
    } finally {
      setUpdating(false);
    }
  };

  if (!user) {
    return (
      <main className="min-h-screen bg-zinc-50 flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white border border-zinc-200 rounded-2xl p-6 text-center space-y-4 shadow-sm">
          <ShoppingCart className="w-10 h-10 mx-auto text-zinc-400" />
          <p className="text-sm text-zinc-600">Please log in to view your cart.</p>
          <button
            onClick={openLoginModal}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
          >
            Log in
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-6 h-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Your cart</h1>
            <p className="text-sm text-zinc-500">Items saved for checkout</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm text-sm text-zinc-500">Loading...</div>
        ) : items.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm text-sm text-zinc-500">
            Your cart is empty.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              {items.map((item) => (
                <div key={item.slug} className="flex items-center gap-3 bg-white border border-zinc-200 rounded-xl p-3 shadow-sm">
                  <div className="h-16 w-24 rounded-lg bg-zinc-100 overflow-hidden flex-shrink-0">
                    <img src={convertR2UrlToCdn(item.img || '') || item.img || '/PNG1.png'} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/product/${item.slug}`} className="text-sm font-semibold text-zinc-900 hover:text-blue-600 line-clamp-1">
                      {item.name}
                    </Link>
                    <p className="text-xs text-zinc-500 mt-1">Qty: {item.qty}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-zinc-900">₹{Math.round(item.price || 0).toLocaleString('en-IN')}</p>
                    <button
                      onClick={() => removeItem(item.slug)}
                      disabled={updating}
                      className="text-xs text-red-600 hover:text-red-700 inline-flex items-center gap-1 mt-1"
                    >
                      <Trash2 className="w-4 h-4" /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500">Subtotal</span>
                <span className="text-lg font-bold text-zinc-900">₹{Math.round(total).toLocaleString('en-IN')}</span>
              </div>
              <p className="text-[11px] text-zinc-500">Taxes and fees calculated at checkout.</p>
              <button
                onClick={() => router.push('/checkout')}
                className="w-full py-3 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                Proceed to checkout
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
