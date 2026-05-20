"use client";

import { useEffect, useState, useMemo } from 'react';
import { getSupabaseBrowserClient } from '../../../lib/supabaseClient';

type CheckoutRow = {
  id: string;
  user_id: string;
  checkout_type: string;
  billing_name: string | null;
  billing_email: string | null;
  billing_mobile: string | null;
  subscription_plan: string | null;
  total_amount: string | null;
  status: string; // 'initiated' | 'completed' | 'failed'
  razorpay_subscription_id: string | null;
  razorpay_payment_id: string | null;
  created_at: string;
  updated_at: string;
};

type StatusType = 'completed' | 'initiated' | 'failed';

function getStatus(s: CheckoutRow): StatusType {
  if (s.status === 'completed') return 'completed';
  if (s.status === 'failed') return 'failed';
  return 'initiated';
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;

  const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  if (isToday) return `Today, ${timeStr}`;
  if (isYesterday) return `Yesterday, ${timeStr}`;

  const dateFormatted = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  return `${dateFormatted}, ${timeStr}`;
}

const STATUS_CONFIG: Record<StatusType, { label: string; bg: string; text: string; border: string; icon: string }> = {
  completed: { label: 'Completed', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: '✓' },
  initiated: { label: 'Initiated', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: '◌' },
  failed: { label: 'Failed', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: '✕' },
};

const FILTER_TABS = ['all', 'completed', 'initiated', 'failed'] as const;
type FilterTab = typeof FILTER_TABS[number];

export default function SubscriptionLogPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkouts, setCheckouts] = useState<CheckoutRow[]>([]);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const supabase = getSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setError('Not signed in'); setLoading(false); return; }

        const res = await fetch('/api/admin/checkout-logs', {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        const json = await res.json();
        if (!res.ok || !json.ok) { setError(json.error || 'Failed to load'); setLoading(false); return; }
        setCheckouts(json.data || []);
      } catch (e: any) {
        setError(e?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredCheckouts = useMemo(() => {
    let list = [...checkouts]; // already sorted latest first from API

    if (filter !== 'all') {
      list = list.filter(s => getStatus(s) === filter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        (s.billing_email || '').toLowerCase().includes(q) ||
        (s.billing_name || '').toLowerCase().includes(q) ||
        (s.billing_mobile || '').includes(q)
      );
    }

    return list;
  }, [checkouts, filter, search]);

  const counts = useMemo(() => {
    const c = { all: checkouts.length, completed: 0, initiated: 0, failed: 0 };
    checkouts.forEach(s => { c[getStatus(s)]++; });
    return c;
  }, [checkouts]);

  // Revenue from completed checkouts
  const totalRevenue = useMemo(() => {
    return checkouts
      .filter(c => c.status === 'completed')
      .reduce((sum, c) => sum + Number(c.total_amount || 0), 0);
  }, [checkouts]);

  if (loading) return <div className="text-center py-8 text-zinc-500">Loading subscription log…</div>;
  if (error) return <div className="text-sm text-red-500 py-8 text-center">{error}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-900">Subscription Log</h2>
        <p className="text-sm text-zinc-500 mt-1">Real-time checkout activity from checkout_details</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
          <div className="text-2xl font-bold text-green-700">{counts.completed}</div>
          <div className="text-[11px] font-medium text-green-600 mt-1">Completed</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
          <div className="text-2xl font-bold text-amber-700">{counts.initiated}</div>
          <div className="text-[11px] font-medium text-amber-600 mt-1">Initiated</div>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
          <div className="text-2xl font-bold text-red-700">{counts.failed}</div>
          <div className="text-[11px] font-medium text-red-600 mt-1">Failed</div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-center">
          <div className="text-2xl font-bold text-blue-700">₹{totalRevenue.toLocaleString('en-IN')}</div>
          <div className="text-[11px] font-medium text-blue-600 mt-1">Revenue</div>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100 p-1">
            {FILTER_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${filter === tab
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/50'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                <span className="ml-1.5 text-zinc-400">({counts[tab]})</span>
              </button>
            ))}
          </div>
          <div className="ml-auto relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder="Search name, email, phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-lg bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-64"
            />
          </div>
        </div>
      </div>

      {/* Log entries */}
      <div className="space-y-2">
        {filteredCheckouts.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center text-zinc-400">
            No checkout events found
          </div>
        ) : (
          filteredCheckouts.map((c) => {
            const status = getStatus(c);
            const cfg = STATUS_CONFIG[status];
            const name = c.billing_name || 'User';
            const phone = (c.billing_mobile || '').replace(/[^0-9]/g, '');

            const waMsg = status === 'completed'
              ? encodeURIComponent(`Hi ${name}, thank you for subscribing to Celite! If you have any questions or need assistance with your ${c.subscription_plan || ''} plan, feel free to reach out — we're happy to help!`)
              : status === 'initiated'
              ? encodeURIComponent(`Hi ${name}, we noticed you started a subscription checkout on Celite but didn't complete it. If you faced any issues or have questions, we're here to help — feel free to reach out!`)
              : encodeURIComponent(`Hi ${name}, we noticed there was an issue with your recent subscription attempt on Celite. We'd love to help resolve it — please feel free to reach out!`);

            const emSubject = status === 'completed'
              ? encodeURIComponent('Welcome to Celite!')
              : encodeURIComponent('Need Help with Your Celite Subscription?');

            const emBody = status === 'completed'
              ? encodeURIComponent(`Hi ${name},\n\nThank you for subscribing to Celite! If you have any questions or need assistance with your ${c.subscription_plan || ''} plan, feel free to reach out — we're happy to help!\n\nBest regards,\nCelite Team`)
              : encodeURIComponent(`Hi ${name},\n\nWe noticed you recently tried to subscribe on Celite. If you faced any issues or have questions, we're here to help!\n\nFeel free to reach out and we'll get you sorted.\n\nBest regards,\nCelite Team`);

            const waUrl = phone ? `https://wa.me/${phone}?text=${waMsg}` : `https://wa.me/?text=${waMsg}`;
            const emUrl = c.billing_email ? `mailto:${c.billing_email}?subject=${emSubject}&body=${emBody}` : '';

            return (
              <div key={c.id} className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Status badge */}
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                    <span>{cfg.icon}</span> {cfg.label}
                  </span>

                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-900 truncate">{name}</span>
                      {c.billing_email && <span className="text-[11px] text-zinc-400 truncate hidden sm:inline">{c.billing_email}</span>}
                      {c.billing_mobile && <span className="text-[11px] text-zinc-400 hidden lg:inline">{c.billing_mobile}</span>}
                    </div>
                  </div>

                  {/* Plan badge */}
                  {c.subscription_plan && (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${c.subscription_plan === 'yearly' ? 'bg-purple-50 text-purple-700' :
                      c.subscription_plan === 'monthly' ? 'bg-blue-50 text-blue-700' :
                      'bg-zinc-100 text-zinc-600'}`}>
                      {c.subscription_plan.toUpperCase()}
                    </span>
                  )}

                  {/* Amount */}
                  {c.total_amount && (
                    <span className="text-xs font-semibold text-zinc-700">₹{Number(c.total_amount).toLocaleString('en-IN')}</span>
                  )}

                  {/* Timestamp */}
                  <span className="text-[11px] text-zinc-400 whitespace-nowrap" title={new Date(c.created_at).toLocaleString()}>
                    {formatDateTime(c.created_at)}
                  </span>

                  {/* Razorpay ID */}
                  {c.razorpay_subscription_id && (
                    <span className="font-mono text-[10px] text-zinc-400 hidden lg:inline">
                      {c.razorpay_subscription_id.slice(0, 16)}
                    </span>
                  )}

                  {/* Contact buttons */}
                  <div className="flex items-center gap-1">
                    <a href={waUrl} target="_blank" rel="noopener noreferrer" title={`WhatsApp ${name}`} className="p-1.5 rounded-lg hover:bg-green-50 transition-colors group">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-zinc-300 group-hover:text-green-600 transition-colors">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="currentColor"/>
                        <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 01-4.264-1.222l-.306-.183-2.869.852.852-2.869-.183-.306A8 8 0 1112 20z" fill="currentColor"/>
                      </svg>
                    </a>
                    {emUrl && (
                      <a href={emUrl} title={`Email ${name}`} className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors group">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300 group-hover:text-blue-600 transition-colors">
                          <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
