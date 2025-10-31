"use client";

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '../../../lib/supabaseClient';

type Order = { id: string; user_id: string; created_at: string; total: number; status: string };
type OrderItem = { order_id: string; name: string; quantity: number; price: number };
type SubRow = { user_id: string; is_active: boolean; plan: string | null; valid_until: string | null; created_at: string; updated_at: string };

export default function AnalyticsPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [totals, setTotals] = useState<{ orderRevenue: number; subscriptionRevenue: number; orders: number; activeSubscribers: number; activeMonthly?: number; activeYearly?: number } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setError('Not signed in'); setLoading(false); return; }
        const res = await fetch('/api/admin/analytics', { headers: { Authorization: `Bearer ${session.access_token}` } });
        const json = await res.json();
        if (!res.ok || !json.ok) { setError(json.error || 'Failed to load analytics'); setLoading(false); return; }
        setOrders(json.orders);
        setItems(json.order_items);
        setSubs(json.subscriptions);
        setTotals(json.totals);
      } catch (e: any) {
        setError(e?.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div>Loading analytics…</div>;
  if (error) return <div className="text-sm text-red-300">{error}</div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold">Sales Overview</h2>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4"><div className="text-2xl font-bold">${totals?.orderRevenue?.toFixed(2) ?? '0.00'}</div><div className="text-xs text-zinc-400">Order Revenue</div></div>
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4"><div className="text-2xl font-bold">${totals?.subscriptionRevenue?.toFixed?.(2) ?? (typeof totals?.subscriptionRevenue === 'number' ? totals.subscriptionRevenue.toFixed(2) : '0.00')}</div><div className="text-xs text-zinc-400">Subscription Revenue (est./MRR)</div></div>
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4"><div className="text-2xl font-bold">{totals?.orders ?? 0}</div><div className="text-xs text-zinc-400">Orders</div></div>
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4"><div className="text-2xl font-bold">{totals?.activeSubscribers ?? 0}</div><div className="text-xs text-zinc-400">Active Subscribers{typeof totals?.activeMonthly==='number' && typeof totals?.activeYearly==='number' ? ` (${totals.activeMonthly} M • ${totals.activeYearly} Y)` : ''}</div></div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold">Order History</h3>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase text-zinc-400">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const list = items.filter((it) => it.order_id === o.id);
                const label = list.map((l) => `${l.name}${l.quantity > 1 ? ` × ${l.quantity}` : ''}`).join(', ');
                return (
                  <tr key={o.id} className="border-t border-white/10">
                    <td className="px-4 py-3 text-white">{o.id.slice(0,8)}</td>
                    <td className="px-4 py-3 text-zinc-300">{o.user_id.slice(0,8)}</td>
                    <td className="px-4 py-3 text-zinc-300">{label || '-'}</td>
                    <td className="px-4 py-3 text-zinc-300">${Number(o.total).toFixed(2)}</td>
                    <td className="px-4 py-3 text-zinc-400">{new Date(o.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-zinc-300">{o.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold">Subscriptions</h3>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase text-zinc-400">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3">Valid Until</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => {
                const active = s.is_active && (!s.valid_until || new Date(s.valid_until).getTime() > Date.now());
                return (
                  <tr key={s.user_id + (s.updated_at || '')} className="border-t border-white/10">
                    <td className="px-4 py-3 text-white">{s.user_id.slice(0,8)}</td>
                    <td className="px-4 py-3 text-zinc-300">{s.plan || '-'}</td>
                    <td className={`px-4 py-3 ${active ? 'text-green-300' : 'text-zinc-400'}`}>{active ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3 text-zinc-300">{s.valid_until ? new Date(s.valid_until).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-3 text-zinc-400">{new Date(s.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-zinc-400">{new Date(s.updated_at).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}



