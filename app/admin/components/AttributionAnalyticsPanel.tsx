// agent-notes: { ctx: "Admin Attribution Analytics panel displaying source ROI, campaigns, products, and assisted conversions", deps: ["lib/supabaseClient.ts", "recharts"], state: active, last: "sato@2026-08-14" }
"use client";

import { useEffect, useState, useMemo } from 'react';
import { getSupabaseBrowserClient } from '../../../lib/supabaseClient';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

type SummaryData = {
  totalSubscriptions: number;
  totalRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  monthlyCount: number;
  yearlyCount: number;
  avgOrderValue: number;
};

type SourceBreakdownItem = {
  source: string;
  customers: number;
  revenue: number;
  monthly: number;
  yearly: number;
  avgOrderValue: number;
};

type CampaignItem = {
  campaign: string;
  source: string;
  customers: number;
  revenue: number;
  monthly: number;
  yearly: number;
  avgOrderValue: number;
};

type ProductItem = {
  product: string;
  subscriptions: number;
  revenue: number;
};

type AssistedConversionItem = {
  firstSource: string;
  lastSource: string;
  path: string;
  count: number;
  revenue: number;
};

const PIE_COLORS = ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#14b8a6', '#6366f1'];

export default function AttributionAnalyticsPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [firstTouch, setFirstTouch] = useState<SourceBreakdownItem[]>([]);
  const [lastTouch, setLastTouch] = useState<SourceBreakdownItem[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [assistedConversions, setAssistedConversions] = useState<AssistedConversionItem[]>([]);
  const [recentRecords, setRecentRecords] = useState<any[]>([]);

  // Filter States
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '365d' | 'all'>('30d');
  const [planFilter, setPlanFilter] = useState<'all' | 'monthly' | 'yearly'>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [touchMode, setTouchMode] = useState<'first' | 'last'>('first');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Not signed in'); setLoading(false); return; }

      const params = new URLSearchParams();
      if (planFilter !== 'all') params.set('plan', planFilter);
      if (sourceFilter !== 'all') params.set('source', sourceFilter);

      // Date calculations
      if (dateRange !== 'all') {
        const now = new Date();
        const daysMap = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 };
        const days = daysMap[dateRange];
        const fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        params.set('dateFrom', fromDate.toISOString());
      }

      const res = await fetch(`/api/admin/analytics/attribution?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || 'Failed to load attribution analytics');
        setLoading(false);
        return;
      }

      setSummary(json.summary);
      setFirstTouch(json.firstTouchBreakdown || []);
      setLastTouch(json.lastTouchBreakdown || []);
      setCampaigns(json.campaignBreakdown || []);
      setProducts(json.productBreakdown || []);
      setAssistedConversions(json.assistedConversions || []);
      setRecentRecords(json.recentRecords || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load attribution analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateRange, planFilter, sourceFilter]);

  const activeSourceData = touchMode === 'first' ? firstTouch : lastTouch;

  // Chart data for source revenue
  const chartData = useMemo(() => {
    return activeSourceData.slice(0, 8).map((item) => ({
      name: item.source,
      revenue: item.revenue,
      customers: item.customers,
      monthly: item.monthly,
      yearly: item.yearly,
    }));
  }, [activeSourceData]);

  // Export filtered data as CSV
  const handleExportCSV = () => {
    if (!recentRecords || recentRecords.length === 0) return;

    const headers = [
      'Created At',
      'User ID',
      'Plan',
      'Amount',
      'Currency',
      'First Source',
      'First Medium',
      'First Campaign',
      'First Landing Page',
      'First Product',
      'Last Source',
      'Last Medium',
      'Last Campaign',
      'Last Landing Page',
      'Last Product',
    ];

    const rows = recentRecords.map((r) => [
      r.created_at,
      r.user_id,
      r.subscription_plan,
      r.amount,
      r.currency,
      `"${r.first_source || ''}"`,
      `"${r.first_medium || ''}"`,
      `"${r.first_campaign || ''}"`,
      `"${r.first_landing_page || ''}"`,
      `"${r.first_product_viewed || ''}"`,
      `"${r.last_source || ''}"`,
      `"${r.last_medium || ''}"`,
      `"${r.last_campaign || ''}"`,
      `"${r.last_landing_page || ''}"`,
      `"${r.last_product_viewed || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `celite-subscription-attribution-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !summary) {
    return <div className="text-center py-16 text-zinc-500 font-medium">Loading subscription attribution analytics…</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight flex items-center gap-2.5">
            <span>🎯</span> Subscription Attribution Analytics
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            Evaluate marketing channels, paid campaigns, and organic discovery paths backed by immutable subscription records.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Date Range */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-white border border-zinc-200 text-xs font-semibold text-zinc-800 shadow-xs focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="365d">Last 365 Days</option>
            <option value="all">All Time</option>
          </select>

          {/* Plan Filter */}
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-white border border-zinc-200 text-xs font-semibold text-zinc-800 shadow-xs focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All Plans</option>
            <option value="monthly">Monthly Only</option>
            <option value="yearly">Yearly Only</option>
          </select>

          {/* CSV Export */}
          <button
            onClick={handleExportCSV}
            disabled={!recentRecords.length}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition-all shadow-xs disabled:opacity-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
        </div>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">{error}</div>}

      {/* Top High-Level KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Subscriptions</div>
          <div className="text-2xl font-black text-zinc-900 mt-2">{summary?.totalSubscriptions ?? 0}</div>
          <div className="text-[11px] text-zinc-500 mt-1">
            {summary?.monthlyCount || 0} Monthly • {summary?.yearlyCount || 0} Yearly
          </div>
        </div>

        <div className="rounded-2xl border border-blue-200/80 bg-blue-50/40 p-5 shadow-xs">
          <div className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Attributed Revenue</div>
          <div className="text-2xl font-black text-blue-900 mt-2">
            ₹{(summary?.totalRevenue ?? 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-blue-600 mt-1">
            Monthly: ₹{(summary?.monthlyRevenue || 0).toLocaleString('en-IN')} • Yearly: ₹{(summary?.yearlyRevenue || 0).toLocaleString('en-IN')}
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-5 shadow-xs">
          <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Average Order Value</div>
          <div className="text-2xl font-black text-emerald-900 mt-2">
            ₹{(summary?.avgOrderValue ?? 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-emerald-600 mt-1">Per paying subscriber</div>
        </div>

        <div className="rounded-2xl border border-pink-200/80 bg-pink-50/40 p-5 shadow-xs">
          <div className="text-xs font-semibold text-pink-700 uppercase tracking-wider">Instagram Paid Share</div>
          <div className="text-2xl font-black text-pink-900 mt-2">
            {summary?.totalSubscriptions
              ? Math.round(
                  (((firstTouch.find((s) => s.source === 'Instagram Paid')?.customers || 0) /
                    summary.totalSubscriptions) *
                    100)
                )
              : 0}
            %
          </div>
          <div className="text-[11px] text-pink-600 mt-1">
            ₹{(firstTouch.find((s) => s.source === 'Instagram Paid')?.revenue || 0).toLocaleString('en-IN')} generated
          </div>
        </div>

        <div className="rounded-2xl border border-purple-200/80 bg-purple-50/40 p-5 shadow-xs">
          <div className="text-xs font-semibold text-purple-700 uppercase tracking-wider">Assisted Conversion Rate</div>
          <div className="text-2xl font-black text-purple-900 mt-2">
            {summary?.totalSubscriptions
              ? Math.round(
                  (assistedConversions.reduce((sum, a) => sum + a.count, 0) /
                    summary.totalSubscriptions) *
                    100
                )
              : 0}
            %
          </div>
          <div className="text-[11px] text-purple-600 mt-1">
            {assistedConversions.reduce((sum, a) => sum + a.count, 0)} multi-touch journeys
          </div>
        </div>
      </div>

      {/* Touch Model Toggle & Revenue Breakdown */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-zinc-900">Revenue & Customer Volume by Source</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Compare original discovery channel (First-Touch) vs last converting channel (Last-Touch)
            </p>
          </div>

          <div className="inline-flex rounded-xl border border-zinc-200 bg-zinc-100 p-1">
            <button
              onClick={() => setTouchMode('first')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                touchMode === 'first' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              🌱 First-Touch (Discovery)
            </button>
            <button
              onClick={() => setTouchMode('last')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                touchMode === 'last' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              🎯 Last-Touch (Conversion)
            </button>
          </div>
        </div>

        {/* Charts & Table Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Bar Chart */}
          <div className="lg:col-span-2 bg-zinc-50/60 rounded-xl p-4 border border-zinc-100">
            <h4 className="text-xs font-bold text-zinc-600 uppercase tracking-wider mb-4">
              Revenue by Source (₹)
            </h4>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#71717a"
                    tick={{ fontSize: 10, fill: '#71717a' }}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#71717a"
                    tick={{ fontSize: 10, fill: '#71717a' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `₹${val.toLocaleString('en-IN')}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e4e4e7',
                      borderRadius: 12,
                      boxShadow: '0 8px 16px -4px rgb(0 0 0 / 0.1)',
                      fontSize: 12,
                    }}
                    formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={36} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-20 text-xs text-zinc-400">No data available for selected range</div>
            )}
          </div>

          {/* Share of Customers Pie */}
          <div className="bg-zinc-50/60 rounded-xl p-4 border border-zinc-100 flex flex-col items-center justify-center">
            <h4 className="text-xs font-bold text-zinc-600 uppercase tracking-wider mb-2 self-start">
              Customer Share
            </h4>
            {chartData.length > 0 ? (
              <div className="w-full flex flex-col items-center">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="customers"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any, name: any) => [`${val} customers`, name]}
                      contentStyle={{ borderRadius: 10, fontSize: 11 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="text-[11px] text-zinc-400 font-medium mt-1">Distribution across sources</div>
              </div>
            ) : (
              <div className="text-center py-20 text-xs text-zinc-400">No data</div>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto rounded-xl border border-zinc-200 shadow-xs">
          <table className="min-w-full text-xs">
            <thead className="bg-zinc-50 text-left text-[11px] uppercase text-zinc-500 font-semibold border-b border-zinc-200">
              <tr>
                <th className="px-4 py-3.5">Attribution Source</th>
                <th className="px-4 py-3.5 text-right">Customers</th>
                <th className="px-4 py-3.5 text-right">Revenue (₹)</th>
                <th className="px-4 py-3.5 text-right">Monthly Subs</th>
                <th className="px-4 py-3.5 text-right">Yearly Subs</th>
                <th className="px-4 py-3.5 text-right">Avg Order Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {activeSourceData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-zinc-400">No records found</td>
                </tr>
              ) : (
                activeSourceData.map((s) => (
                  <tr key={s.source} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-zinc-900 flex items-center gap-2">
                      <span>{s.source.includes('Instagram') ? '📸' : s.source.includes('Google') ? '🔍' : s.source.includes('YouTube') ? '▶' : s.source.includes('Facebook') ? '📘' : s.source.includes('AI') ? '🤖' : '⚡'}</span>
                      {s.source}
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-zinc-700">{s.customers}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-blue-600">₹{s.revenue.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3.5 text-right text-zinc-600">{s.monthly}</td>
                    <td className="px-4 py-3.5 text-right text-zinc-600">{s.yearly}</td>
                    <td className="px-4 py-3.5 text-right text-emerald-600 font-semibold">₹{s.avgOrderValue.toLocaleString('en-IN')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid for Campaign Analytics & Product Attribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Campaign Analytics */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <span>📣</span> Campaign Performance (UTM Campaign)
            </h3>
            <span className="text-xs text-zinc-400 font-medium">{campaigns.length} campaigns</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-200 shadow-xs">
            <table className="min-w-full text-xs">
              <thead className="bg-zinc-50 text-left text-[11px] uppercase text-zinc-500 font-semibold border-b border-zinc-200">
                <tr>
                  <th className="px-4 py-3">Campaign</th>
                  <th className="px-4 py-3 text-right">Customers</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                  <th className="px-4 py-3 text-right">M / Y Split</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {campaigns.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-6 text-zinc-400">No tagged campaign conversions yet</td></tr>
                ) : (
                  campaigns.map((c) => (
                    <tr key={c.campaign} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-zinc-900 truncate max-w-[180px]" title={c.campaign}>
                        {c.campaign}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-zinc-700">{c.customers}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600">₹{c.revenue.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right text-zinc-500 text-[11px]">{c.monthly}M / {c.yearly}Y</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Product Attribution */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <span>🎬</span> First Product Viewed Before Subscription
            </h3>
            <span className="text-xs text-zinc-400 font-medium">{products.length} products</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-200 shadow-xs">
            <table className="min-w-full text-xs">
              <thead className="bg-zinc-50 text-left text-[11px] uppercase text-zinc-500 font-semibold border-b border-zinc-200">
                <tr>
                  <th className="px-4 py-3">Template / Product Slug</th>
                  <th className="px-4 py-3 text-right">Subscriptions Generated</th>
                  <th className="px-4 py-3 text-right">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {products.length === 0 ? (
                  <tr><td colSpan={3} className="text-center py-6 text-zinc-400">No product attribution recorded yet</td></tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.product} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="px-4 py-3 font-medium text-zinc-900 truncate max-w-[200px]" title={p.product}>
                        {p.product}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-blue-600">{p.subscriptions}</td>
                      <td className="px-4 py-3 text-right font-semibold text-zinc-800">₹{p.revenue.toLocaleString('en-IN')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Assisted Conversions / Multi-touch Paths */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <span>🔀</span> Assisted Conversion Journeys (Cross-Channel Impact)
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Identifies customers who discovered Celite through one channel (e.g., Instagram Ad) but returned and converted via another (e.g., Direct / Google).
            </p>
          </div>
          <span className="text-xs bg-purple-100 text-purple-800 font-bold px-2.5 py-1 rounded-full">
            {assistedConversions.length} Unique Paths
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-zinc-200 shadow-xs">
          <table className="min-w-full text-xs">
            <thead className="bg-zinc-50 text-left text-[11px] uppercase text-zinc-500 font-semibold border-b border-zinc-200">
              <tr>
                <th className="px-4 py-3.5">Customer Journey (Discovery ➔ Conversion)</th>
                <th className="px-4 py-3.5 text-right">Subscribers</th>
                <th className="px-4 py-3.5 text-right">Revenue Generated</th>
                <th className="px-4 py-3.5 text-right">Insight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {assistedConversions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-zinc-400">
                    No multi-touch assisted journeys in this time range (all were direct single-channel conversions).
                  </td>
                </tr>
              ) : (
                assistedConversions.map((ac) => (
                  <tr key={ac.path} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-zinc-900 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-pink-50 text-pink-700 border border-pink-200">
                        {ac.firstSource}
                      </span>
                      <span className="text-zinc-400 font-bold">➔</span>
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                        {ac.lastSource}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-zinc-800">{ac.count}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-emerald-600">₹{ac.revenue.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3.5 text-right text-zinc-500 text-[11px]">
                      {ac.firstSource.includes('Paid') ? 'Paid discovery assisted final purchase' : 'Organic discovery assisted purchase'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
