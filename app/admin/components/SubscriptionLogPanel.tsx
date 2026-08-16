// agent-notes: { ctx: "Admin subscription log panel with universal attribution badges, interactive customer journey visualizer, and manual correction", deps: ["lib/supabaseClient.ts"], state: active, last: "sato@2026-08-16" }
"use client";

import { useEffect, useState, useMemo } from 'react';
import { getSupabaseBrowserClient } from '../../../lib/supabaseClient';

type AttributionInfo = {
  id?: string;
  first_source: string | null;
  first_medium: string | null;
  first_campaign: string | null;
  first_content: string | null;
  first_landing_page: string | null;
  first_referrer: string | null;
  first_product_viewed: string | null;
  first_visit_at: string | null;
  last_source: string | null;
  last_medium: string | null;
  last_campaign: string | null;
  last_content: string | null;
  last_landing_page: string | null;
  last_referrer: string | null;
  last_product_viewed: string | null;
  last_visit_at: string | null;
  journey_touch_count?: number;
  journey_session_count?: number;
  confidence_level?: string;
  confidence_reason?: string | null;
  is_manually_corrected?: boolean;
  correction_reason?: string | null;
  is_snapshot?: boolean;
};

type CheckoutRow = {
  id: string;
  user_id: string;
  checkout_type: string;
  billing_name: string | null;
  billing_email: string | null;
  billing_mobile: string | null;
  subscription_plan: string | null;
  total_amount: string | null;
  status: string; // 'completed' | 'initiated' | 'failed'
  razorpay_subscription_id: string | null;
  razorpay_payment_id: string | null;
  created_at: string;
  updated_at: string;
  attribution?: AttributionInfo | null;
};

type TimelineEvent = {
  id: string;
  event_type: string;
  source: string;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  resolved_campaign_name: string | null;
  resolved_content_name: string | null;
  resolved_adset_name: string | null;
  path: string;
  url: string | null;
  product_slug: string | null;
  referrer_url: string | null;
  referrer_domain: string | null;
  device_type: string | null;
  session_id: string | null;
  confidence_level: string | null;
  created_at: string;
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
  completed: { label: 'Completed', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: '✓' },
  initiated: { label: 'Initiated', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: '◌' },
  failed: { label: 'Failed', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: '✕' },
};

function getSourceBadge(sourceName?: string | null) {
  if (!sourceName) return { bg: 'bg-zinc-100', text: 'text-zinc-500', border: 'border-zinc-200', label: 'Unknown' };
  const s = sourceName.toLowerCase();
  if (s.includes('instagram paid')) {
    return { bg: 'bg-gradient-to-r from-pink-500/10 to-rose-500/10', text: 'text-pink-700 font-semibold', border: 'border-pink-300', label: '📸 IG Paid' };
  }
  if (s.includes('instagram')) {
    return { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-200', label: '📷 IG Organic' };
  }
  if (s.includes('facebook paid')) {
    return { bg: 'bg-blue-100', text: 'text-blue-800 font-semibold', border: 'border-blue-300', label: '📘 FB Paid' };
  }
  if (s.includes('facebook')) {
    return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: '👥 FB Organic' };
  }
  if (s.includes('google ads')) {
    return { bg: 'bg-amber-50', text: 'text-amber-800 font-semibold', border: 'border-amber-300', label: '🔍 Google Ads' };
  }
  if (s.includes('google')) {
    return { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', label: '🌐 Google' };
  }
  if (s.includes('youtube paid')) {
    return { bg: 'bg-red-100', text: 'text-red-800 font-semibold', border: 'border-red-300', label: '▶ YouTube Ads' };
  }
  if (s.includes('youtube')) {
    return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: '▶ YouTube' };
  }
  if (s.includes('bing')) {
    return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', label: '🔎 Bing' };
  }
  if (s.includes('ai') || s.includes('chatgpt')) {
    return { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', label: '🤖 AI Search' };
  }
  if (s.includes('whatsapp')) {
    return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', label: '💬 WhatsApp' };
  }
  if (s.includes('email')) {
    return { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', label: '✉️ Email' };
  }
  if (s.includes('referral')) {
    return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: '🔗 Referral' };
  }
  if (s.includes('previously attributed')) {
    return { bg: 'bg-amber-50/70', text: 'text-amber-800 font-medium', border: 'border-amber-200', label: '⚡ Direct (Returning)' };
  }
  if (s.includes('genuine direct') || s === 'direct') {
    return { bg: 'bg-zinc-100', text: 'text-zinc-600', border: 'border-zinc-200', label: '⚡ Direct' };
  }
  if (s.includes('unknown') || s.includes('missing')) {
    return { bg: 'bg-zinc-100', text: 'text-zinc-400 italic', border: 'border-zinc-200', label: '❓ Unknown' };
  }
  return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', label: sourceName };
}

const FILTER_TABS = ['all', 'completed', 'initiated', 'failed'] as const;
type FilterTab = typeof FILTER_TABS[number];

const ALL_SOURCES = [
  'All Sources',
  'Instagram Paid',
  'Instagram Organic',
  'Facebook Paid',
  'Facebook Organic',
  'Google Ads',
  'Google Organic',
  'YouTube Paid',
  'YouTube Organic',
  'Bing Search',
  'ChatGPT / AI',
  'Referral',
  'WhatsApp',
  'Email',
  'Direct',
  'Unknown',
];

export default function SubscriptionLogPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkouts, setCheckouts] = useState<CheckoutRow[]>([]);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('All Sources');
  const [search, setSearch] = useState('');
  const [logPage, setLogPage] = useState(1);
  const [selectedCheckout, setSelectedCheckout] = useState<CheckoutRow | null>(null);
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [journeyTimeline, setJourneyTimeline] = useState<TimelineEvent[]>([]);

  // Manual Correction State
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [correctionForm, setCorrectionForm] = useState({
    firstSource: '',
    firstCampaign: '',
    firstContent: '',
    lastSource: '',
    lastCampaign: '',
    lastContent: '',
    reason: '',
  });

  const logsPerPage = 20;

  const loadLogs = async () => {
    try {
      setLoading(true);
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Not signed in'); setLoading(false); return; }

      const res = await fetch('/api/admin/checkout-logs', {
        headers: { Authorization: `Bearer ${session.access_token}` },
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

  useEffect(() => {
    loadLogs();
  }, []);

  const openJourneyModal = async (checkout: CheckoutRow) => {
    setSelectedCheckout(checkout);
    setJourneyTimeline([]);
    setJourneyLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/admin/analytics/journey/${checkout.id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setJourneyTimeline(json.timeline || []);
      }
    } catch (e) {
      console.error('Failed to load journey timeline:', e);
    } finally {
      setJourneyLoading(false);
    }
  };

  const openCorrection = (checkout: CheckoutRow) => {
    const attr = checkout.attribution;
    setCorrectionForm({
      firstSource: attr?.first_source || 'Instagram Paid',
      firstCampaign: attr?.first_campaign || '',
      firstContent: attr?.first_content || '',
      lastSource: attr?.last_source || attr?.first_source || 'Direct',
      lastCampaign: attr?.last_campaign || '',
      lastContent: attr?.last_content || '',
      reason: '',
    });
    setShowCorrectionModal(true);
  };

  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCheckout?.attribution?.id && !selectedCheckout?.id) return;
    if (!correctionForm.reason.trim()) {
      alert('Please enter an audit reason for manual correction.');
      return;
    }

    try {
      setCorrecting(true);
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/admin/analytics/attribution/correct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          subscriptionAttributionId: selectedCheckout.attribution?.id || selectedCheckout.id,
          ...correctionForm,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        alert(json.error || 'Failed to update attribution');
        setCorrecting(false);
        return;
      }

      setShowCorrectionModal(false);
      setSelectedCheckout(null);
      loadLogs();
    } catch (e: any) {
      alert(e?.message || 'Error saving correction');
    } finally {
      setCorrecting(false);
    }
  };

  const filteredCheckouts = useMemo(() => {
    let list = [...checkouts];

    if (filter !== 'all') {
      list = list.filter((s) => getStatus(s) === filter);
    }

    if (sourceFilter !== 'All Sources') {
      list = list.filter((s) => {
        const first = s.attribution?.first_source;
        const last = s.attribution?.last_source;
        return (
          first?.toLowerCase().includes(sourceFilter.toLowerCase()) ||
          last?.toLowerCase().includes(sourceFilter.toLowerCase())
        );
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          (s.billing_email || '').toLowerCase().includes(q) ||
          (s.billing_name || '').toLowerCase().includes(q) ||
          (s.billing_mobile || '').includes(q) ||
          (s.attribution?.first_campaign || '').toLowerCase().includes(q) ||
          (s.attribution?.first_product_viewed || '').toLowerCase().includes(q) ||
          (s.attribution?.first_source || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [checkouts, filter, sourceFilter, search]);

  useEffect(() => {
    setLogPage(1);
  }, [filter, sourceFilter, search]);

  const totalLogPages = Math.ceil(filteredCheckouts.length / logsPerPage);
  const paginatedCheckouts = filteredCheckouts.slice(
    (logPage - 1) * logsPerPage,
    logPage * logsPerPage
  );

  const counts = useMemo(() => {
    const c = { all: checkouts.length, completed: 0, initiated: 0, failed: 0 };
    checkouts.forEach((s) => {
      c[getStatus(s)]++;
    });
    return c;
  }, [checkouts]);

  const totalRevenue = useMemo(() => {
    return checkouts
      .filter((c) => c.status === 'completed')
      .reduce((sum, c) => sum + Number(c.total_amount || 0), 0);
  }, [checkouts]);

  if (loading)
    return (
      <div className="text-center py-12 text-zinc-500 font-medium text-xs">
        Loading subscription log with customer journey tracking…
      </div>
    );
  if (error) return <div className="text-xs text-red-500 py-8 text-center">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
            Subscription Log
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold">
              Universal Journey Enabled
            </span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Real-time subscriber checkouts with immutable First-Touch & Last-Touch origin tracking
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-center">
          <div className="text-2xl font-bold text-emerald-700">{counts.completed}</div>
          <div className="text-[11px] font-medium text-emerald-600 mt-1">Completed</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-center">
          <div className="text-2xl font-bold text-amber-700">{counts.initiated}</div>
          <div className="text-[11px] font-medium text-amber-600 mt-1">Initiated</div>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 text-center">
          <div className="text-2xl font-bold text-red-700">{counts.failed}</div>
          <div className="text-[11px] font-medium text-red-600 mt-1">Failed</div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 text-center">
          <div className="text-2xl font-bold text-blue-700">₹{totalRevenue.toLocaleString('en-IN')}</div>
          <div className="text-[11px] font-medium text-blue-600 mt-1">Total Revenue</div>
        </div>
      </div>

      {/* Controls & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-zinc-200 shadow-xs">
        <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto">
          {FILTER_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                filter === t
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {t} ({counts[t]})
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white"
          >
            {ALL_SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search email, name, campaign..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-56"
          />
        </div>
      </div>

      {/* Checkouts List */}
      <div className="space-y-2.5">
        {paginatedCheckouts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-zinc-200 p-8 text-zinc-400 text-xs">
            No subscription checkouts match the selected filters.
          </div>
        ) : (
          paginatedCheckouts.map((c) => {
            const st = getStatus(c);
            const cfg = STATUS_CONFIG[st];
            const attr = c.attribution;
            const firstBadge = getSourceBadge(attr?.first_source);
            const lastBadge = getSourceBadge(attr?.last_source || attr?.first_source);
            const isAssisted =
              attr?.first_source &&
              attr?.last_source &&
              attr.first_source !== attr.last_source;

            const name = c.billing_name || c.billing_email?.split('@')[0] || 'Subscriber';
            const phoneClean = c.billing_mobile?.replace(/\D/g, '') || '';
            const waPhone = phoneClean.length === 10 ? `91${phoneClean}` : phoneClean;
            const waUrl = `https://wa.me/${waPhone}`;
            const emUrl = c.billing_email ? `mailto:${c.billing_email}` : '';

            return (
              <div
                key={c.id}
                onClick={() => openJourneyModal(c)}
                className="group bg-white rounded-2xl border border-zinc-200 p-4 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: Status & Customer */}
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-xl border text-xs font-bold ${cfg.bg} ${cfg.text} ${cfg.border}`}
                      title={cfg.label}
                    >
                      {cfg.icon}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-900 group-hover:text-blue-600 transition-colors truncate">
                          {name}
                        </span>
                        {c.subscription_plan && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              c.subscription_plan === 'yearly'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {c.subscription_plan.toUpperCase()}
                          </span>
                        )}
                        {attr?.is_manually_corrected && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                            Corrected
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                        {c.billing_email && <span className="truncate max-w-[180px]">{c.billing_email}</span>}
                        {c.billing_mobile && <span>• {c.billing_mobile}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Middle: Attribution Badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {attr?.first_source ? (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] ${firstBadge.bg} ${firstBadge.text} ${firstBadge.border}`}
                          title={`First Touch: ${attr.first_source}`}
                        >
                          1st: {firstBadge.label}
                        </span>

                        {isAssisted && (
                          <>
                            <span className="text-zinc-300">→</span>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] ${lastBadge.bg} ${lastBadge.text} ${lastBadge.border}`}
                              title={`Last Touch: ${attr.last_source}`}
                            >
                              Last: {lastBadge.label}
                            </span>
                          </>
                        )}

                        {attr.first_campaign && (
                          <span className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 text-[10px] font-mono border border-zinc-200">
                            📣 {attr.first_campaign}
                          </span>
                        )}

                        {attr.first_product_viewed && (
                          <span
                            className="hidden lg:inline-flex items-center px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 text-[10px] font-mono border border-zinc-200 truncate max-w-[140px]"
                            title={attr.first_product_viewed}
                          >
                            🎬 {attr.first_product_viewed}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-zinc-400 italic">No attribution</span>
                    )}
                  </div>

                  {/* Right: Amount, Time, Actions */}
                  <div className="flex items-center gap-3">
                    {c.total_amount && (
                      <span className="text-sm font-bold text-zinc-800">
                        ₹{Number(c.total_amount).toLocaleString('en-IN')}
                      </span>
                    )}

                    <span className="text-[11px] text-zinc-400 whitespace-nowrap">
                      {formatDateTime(c.created_at)}
                    </span>

                    {/* Contact buttons */}
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`WhatsApp ${name}`}
                        className="p-1.5 rounded-lg hover:bg-green-50 transition-colors group/wa"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-zinc-400 group-hover/wa:text-green-600 transition-colors">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="currentColor"/>
                          <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 01-4.264-1.222l-.306-.183-2.869.852.852-2.869-.183-.306A8 8 0 1112 20z" fill="currentColor"/>
                        </svg>
                      </a>
                      {emUrl && (
                        <a
                          href={emUrl}
                          title={`Email ${name}`}
                          className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors group/em"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400 group-hover/em:text-blue-600 transition-colors">
                            <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalLogPages > 1 && (
        <div className="flex items-center justify-between border-t border-zinc-200 pt-4">
          <div className="text-xs text-zinc-500 font-medium">
            Showing {(logPage - 1) * logsPerPage + 1}–{Math.min(logPage * logsPerPage, filteredCheckouts.length)} of {filteredCheckouts.length} entries
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 font-medium">Page {logPage} of {totalLogPages}</span>
            <button
              onClick={() => setLogPage((p) => Math.max(1, p - 1))}
              disabled={logPage === 1}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white shadow-xs"
            >
              Previous
            </button>
            <button
              onClick={() => setLogPage((p) => Math.min(totalLogPages, p + 1))}
              disabled={logPage === totalLogPages}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white shadow-xs"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Interactive Customer Journey Timeline Modal */}
      {selectedCheckout && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex items-start justify-between border-b border-zinc-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                  Customer Journey Timeline
                  {selectedCheckout.attribution?.is_snapshot && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                      Immutable Purchase Snapshot
                    </span>
                  )}
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Customer: <span className="font-semibold text-zinc-800">{selectedCheckout.billing_name || 'Subscriber'}</span> • {selectedCheckout.billing_email}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openCorrection(selectedCheckout)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors"
                >
                  ✏️ Correct Attribution
                </button>
                <button
                  onClick={() => setSelectedCheckout(null)}
                  className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg hover:bg-zinc-100 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Attribution Summary Banner */}
            {selectedCheckout.attribution && (
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-medium text-zinc-500">First Touch (Discovery)</div>
                  <div className="text-sm font-bold text-zinc-900 mt-0.5">
                    {selectedCheckout.attribution.first_source || 'Direct'}
                  </div>
                  {selectedCheckout.attribution.first_campaign && (
                    <div className="text-[11px] text-zinc-500 font-mono">
                      📣 {selectedCheckout.attribution.first_campaign}
                    </div>
                  )}
                </div>
                <div className="hidden sm:block text-zinc-400 font-bold text-lg">➔</div>
                <div>
                  <div className="text-xs font-medium text-zinc-500">Last Touch (Converting)</div>
                  <div className="text-sm font-bold text-zinc-900 mt-0.5">
                    {selectedCheckout.attribution.last_source || selectedCheckout.attribution.first_source || 'Direct'}
                  </div>
                  {selectedCheckout.attribution.last_product_viewed && (
                    <div className="text-[11px] text-blue-600 font-mono">
                      🎬 {selectedCheckout.attribution.last_product_viewed}
                    </div>
                  )}
                </div>
                <div className="border-t sm:border-t-0 sm:border-l border-zinc-200 pt-2 sm:pt-0 sm:pl-4">
                  <div className="text-xs font-medium text-zinc-500">Revenue & Plan</div>
                  <div className="text-sm font-bold text-emerald-600 mt-0.5">
                    ₹{Number(selectedCheckout.total_amount || 0).toLocaleString('en-IN')} ({(selectedCheckout.subscription_plan || 'monthly').toUpperCase()})
                  </div>
                </div>
              </div>
            )}

            {/* Chronological Vertical Journey Timeline */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-600 flex items-center justify-between">
                <span>📍 Chronological Customer Journey Stream</span>
                {journeyTimeline.length > 0 && (
                  <span className="text-[11px] font-normal text-zinc-400 lowercase">
                    {journeyTimeline.length} touchpoint events
                  </span>
                )}
              </h4>

              {journeyLoading ? (
                <div className="py-8 text-center text-zinc-400 text-xs font-medium">
                  Loading customer touchpoint stream…
                </div>
              ) : journeyTimeline.length === 0 ? (
                <div className="py-8 text-center text-zinc-400 text-xs border border-dashed border-zinc-200 rounded-xl">
                  No granular event history recorded for this checkout session.
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200">
                  {journeyTimeline.map((tp, idx) => {
                    const isFirst = idx === 0;
                    const isLast = idx === journeyTimeline.length - 1;
                    const isProduct = tp.event_type === 'product_view' || Boolean(tp.product_slug);
                    const isCheckout = tp.event_type.includes('checkout') || tp.event_type.includes('subscription');

                    return (
                      <div key={tp.id || idx} className="relative group">
                        {/* Timeline Node Icon */}
                        <div
                          className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full border-2 bg-white flex items-center justify-center text-[10px] ${
                            isFirst
                              ? 'border-emerald-500 text-emerald-600'
                              : isLast || isCheckout
                              ? 'border-blue-500 text-blue-600'
                              : isProduct
                              ? 'border-purple-500 text-purple-600'
                              : 'border-zinc-300 text-zinc-400'
                          }`}
                        >
                          {isFirst ? '🌱' : isCheckout ? '💳' : isProduct ? '🎬' : '•'}
                        </div>

                        {/* Event Card */}
                        <div className="bg-zinc-50 hover:bg-zinc-100/70 transition-colors border border-zinc-200 rounded-xl p-3.5 space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-zinc-900 uppercase">
                                {tp.event_type.replace('_', ' ')}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-zinc-200 text-zinc-700">
                                {tp.source}
                              </span>
                              {tp.medium && (
                                <span className="text-[10px] text-zinc-500">({tp.medium})</span>
                              )}
                            </div>
                            <span className="text-[11px] text-zinc-400 font-mono">
                              {new Date(tp.created_at).toLocaleString()}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-600">
                            <div>
                              <span className="text-zinc-400">Path / Page:</span>{' '}
                              <span className="font-mono text-zinc-800 text-[11px]">{tp.path || '/'}</span>
                            </div>
                            {tp.product_slug && (
                              <div>
                                <span className="text-zinc-400">Product:</span>{' '}
                                <span className="font-semibold text-blue-600">{tp.product_slug}</span>
                              </div>
                            )}
                            {(tp.resolved_campaign_name || tp.campaign) && (
                              <div className="sm:col-span-2">
                                <span className="text-zinc-400">Campaign:</span>{' '}
                                <span className="font-semibold text-zinc-800">
                                  {tp.resolved_campaign_name || tp.campaign}
                                </span>
                              </div>
                            )}
                            {(tp.resolved_content_name || tp.content) && (
                              <div className="sm:col-span-2">
                                <span className="text-zinc-400">Ad / Video Creative:</span>{' '}
                                <span className="font-semibold text-zinc-800">
                                  {tp.resolved_content_name || tp.content}
                                </span>
                              </div>
                            )}
                            {tp.referrer_url && (
                              <div className="sm:col-span-2 truncate">
                                <span className="text-zinc-400">Referrer:</span>{' '}
                                <span className="font-mono text-zinc-700 text-[11px]">{tp.referrer_url}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-zinc-100">
              <button
                onClick={() => setSelectedCheckout(null)}
                className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Attribution Correction Modal */}
      {showCorrectionModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-base font-bold text-zinc-900">✏️ Manual Attribution Correction</h3>
              <button
                onClick={() => setShowCorrectionModal(false)}
                className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg hover:bg-zinc-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCorrection} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">First Touch Source</label>
                <input
                  type="text"
                  required
                  value={correctionForm.firstSource}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, firstSource: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">First Campaign / Ad Name</label>
                <input
                  type="text"
                  value={correctionForm.firstCampaign}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, firstCampaign: e.target.value })}
                  placeholder="e.g. August Video Editors Campaign"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Last Touch Source</label>
                <input
                  type="text"
                  required
                  value={correctionForm.lastSource}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, lastSource: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Audit Correction Reason *</label>
                <textarea
                  required
                  rows={3}
                  value={correctionForm.reason}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                  placeholder="Explain why this attribution is being manually adjusted (e.g. customer verified via WhatsApp conversation that they discovered Celite via Instagram Reel)."
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowCorrectionModal(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-600 font-semibold hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={correcting}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {correcting ? 'Saving…' : 'Apply Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
