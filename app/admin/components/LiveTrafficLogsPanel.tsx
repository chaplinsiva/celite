// agent-notes: { ctx: "Universal Admin Live Traffic & Activity Logs Panel with rich interactive charts, pie charts, funnel graphs, and real-time stream", deps: ["lib/supabaseClient.ts", "recharts"], state: active, last: "sato@2026-08-16" }
"use client";

import { useEffect, useState, useMemo, useCallback } from 'react';
import { getSupabaseBrowserClient } from '../../../lib/supabaseClient';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

type TrafficEvent = {
  id: string;
  anonymous_id: string | null;
  session_id: string | null;
  user_id: string | null;
  user_email: string | null;
  event_type: string;
  url: string | null;
  path: string;
  source: string;
  medium: string | null;
  campaign: string | null;
  resolved_campaign_name: string | null;
  resolved_content_name: string | null;
  product_slug: string | null;
  product_name: string | null;
  referrer_url: string | null;
  referrer_domain: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  confidence_level: string | null;
  created_at: string;
};

type SourceBreakdown = {
  source: string;
  views: number;
  uniqueVisitors: number;
  productViews: number;
  signups: number;
  checkouts: number;
  subscriptions: number;
  signupRate: number;
  conversionRate: number;
};

type FunnelStage = {
  stage: string;
  count: number;
  rate: number;
};

type LiveTrafficData = {
  summary: {
    totalViews: number;
    uniqueAnonymous: number;
    uniqueSessions: number;
    uniqueUsers: number;
    productViewsCount: number;
    signupsCount: number;
    checkoutStartsCount: number;
    subscriptionsCount: number;
  };
  sourcesBreakdown: SourceBreakdown[];
  funnelStages: FunnelStage[];
  timelineTrend: Array<{
    time: string;
    views: number;
    productViews: number;
    signups: number;
    checkouts: number;
    subscriptions: number;
  }>;
  eventTypeDistribution: Array<{ name: string; value: number }>;
  signupsBySource: Array<{ name: string; value: number }>;
  signupsList: Array<{
    id: string;
    userId: string;
    email?: string;
    source: string;
    campaign?: string | null;
    path: string;
    timestamp: string;
  }>;
  topPages: Array<{ path: string; views: number }>;
  topProducts: Array<{ product: string; views: number; topSource: string }>;
  deviceBreakdown: Record<string, number>;
  browserBreakdown: Record<string, number>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  events: TrafficEvent[];
};

type SubTab = 'stream' | 'charts' | 'signups' | 'funnel' | 'pages' | 'devices';

const EVENT_CONFIG: Record<string, { label: string; icon: string; bg: string; text: string; border: string }> = {
  landing: { label: 'Landing', icon: '🌐', bg: 'bg-zinc-100', text: 'text-zinc-700', border: 'border-zinc-200' },
  homepage: { label: 'Homepage', icon: '🏠', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  product_view: { label: 'Product View', icon: '🎬', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  category_view: { label: 'Category View', icon: '📁', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  pricing_view: { label: 'Pricing View', icon: '💎', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  signup: { label: 'User Signup', icon: '👤', bg: 'bg-emerald-100', text: 'text-emerald-800 font-bold', border: 'border-emerald-300' },
  login: { label: 'Login', icon: '🔑', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  checkout_started: { label: 'Checkout Start', icon: '🛒', bg: 'bg-orange-50', text: 'text-orange-700 font-bold', border: 'border-orange-200' },
  payment_started: { label: 'Payment Start', icon: '💳', bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-200' },
  subscription_created: { label: 'Subscribed', icon: '⭐', bg: 'bg-emerald-500', text: 'text-white font-bold', border: 'border-emerald-600' },
};

const CHART_PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1', '#64748b'];

export default function LiveTrafficLogsPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LiveTrafficData | null>(null);
  const [activeTab, setActiveTab] = useState<SubTab>('charts');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [deviceFilter, setDeviceFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const loadTraffic = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      setError(null);
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Not signed in'); setLoading(false); return; }

      const params = new URLSearchParams();
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (eventTypeFilter !== 'all') params.set('eventType', eventTypeFilter);
      if (sourceFilter !== 'all') params.set('source', sourceFilter);
      if (deviceFilter !== 'all') params.set('device', deviceFilter);
      if (search) params.set('search', search);
      params.set('page', page.toString());
      params.set('limit', '50');

      const res = await fetch(`/api/admin/analytics/live-traffic?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || 'Failed to load live traffic logs');
        if (!isBackground) setLoading(false);
        return;
      }
      setData(json);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load live traffic logs';
      setError(msg);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [dateFrom, dateTo, eventTypeFilter, sourceFilter, deviceFilter, search, page]);

  useEffect(() => {
    loadTraffic();
  }, [loadTraffic]);

  // Auto-refresh interval (every 30 seconds)
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      loadTraffic(true);
    }, 30000);
    return () => clearInterval(timer);
  }, [autoRefresh, loadTraffic]);

  const deviceChartData = useMemo(() => {
    if (!data?.deviceBreakdown) return [];
    return Object.entries(data.deviceBreakdown).map(([name, value]) => ({ name, value }));
  }, [data]);

  const browserChartData = useMemo(() => {
    if (!data?.browserBreakdown) return [];
    return Object.entries(data.browserBreakdown).map(([name, value]) => ({ name, value }));
  }, [data]);

  const sourcesPieData = useMemo(() => {
    if (!data?.sourcesBreakdown) return [];
    return data.sourcesBreakdown.map((s) => ({
      name: s.source,
      value: s.views,
    }));
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
            📡 Live Traffic & Visitor Activity Dashboard
            <span className="flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Real-Time Stream
            </span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Real-time analytics, visual funnel flow, and source distribution across all website views and signups
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Auto Refresh Switch */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              autoRefresh
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-zinc-100 border-zinc-200 text-zinc-500'
            }`}
          >
            <span>🔄</span> Auto-Refresh ({autoRefresh ? '30s' : 'Off'})
          </button>
          <button
            onClick={() => loadTraffic(false)}
            className="px-3.5 py-1.5 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-xs"
          >
            Refresh Now
          </button>
        </div>
      </div>

      {/* Metric Counter Cards */}
      {data?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-xs text-center">
            <div className="text-[11px] font-semibold text-zinc-400 uppercase">Total Hits / Views</div>
            <div className="text-xl font-bold text-zinc-900 mt-0.5">{data.summary.totalViews}</div>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-xs text-center">
            <div className="text-[11px] font-semibold text-zinc-400 uppercase">Unique Visitors</div>
            <div className="text-xl font-bold text-blue-600 mt-0.5">{data.summary.uniqueAnonymous}</div>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-xs text-center">
            <div className="text-[11px] font-semibold text-zinc-400 uppercase">Active Sessions</div>
            <div className="text-xl font-bold text-indigo-600 mt-0.5">{data.summary.uniqueSessions}</div>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-xs text-center">
            <div className="text-[11px] font-semibold text-zinc-400 uppercase">Product Views</div>
            <div className="text-xl font-bold text-purple-600 mt-0.5">{data.summary.productViewsCount}</div>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3.5 shadow-xs text-center">
            <div className="text-[11px] font-bold text-emerald-800 uppercase">User Signups</div>
            <div className="text-xl font-bold text-emerald-700 mt-0.5">{data.summary.signupsCount}</div>
          </div>
          <div className="rounded-2xl border border-orange-200 bg-orange-50/40 p-3.5 shadow-xs text-center">
            <div className="text-[11px] font-bold text-orange-800 uppercase">Checkout Starts</div>
            <div className="text-xl font-bold text-orange-700 mt-0.5">{data.summary.checkoutStartsCount}</div>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-3.5 shadow-xs text-center">
            <div className="text-[11px] font-bold text-blue-800 uppercase">Subscriptions</div>
            <div className="text-xl font-bold text-blue-700 mt-0.5">{data.summary.subscriptionsCount}</div>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-zinc-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Event Type Filter */}
          <select
            value={eventTypeFilter}
            onChange={(e) => { setEventTypeFilter(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white"
          >
            <option value="all">All Events</option>
            <option value="landing">Landing Pages</option>
            <option value="homepage">Homepage</option>
            <option value="product_view">Product Views</option>
            <option value="signup">Signups</option>
            <option value="checkout_started">Checkout Starts</option>
            <option value="subscription_created">Subscriptions</option>
          </select>

          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white"
          >
            <option value="all">All Sources</option>
            <option value="Instagram Paid">Instagram Paid</option>
            <option value="Instagram Organic">Instagram Organic</option>
            <option value="Facebook Paid">Facebook Paid</option>
            <option value="Facebook Organic">Facebook Organic</option>
            <option value="Google Ads">Google Ads</option>
            <option value="Google Organic">Google Organic</option>
            <option value="YouTube">YouTube</option>
            <option value="ChatGPT / AI">ChatGPT / AI</option>
            <option value="Referral">Referral</option>
            <option value="Direct">Direct</option>
            <option value="Unknown">Unknown</option>
          </select>

          {/* Date Range Inputs */}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white text-zinc-700"
            title="From Date"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white text-zinc-700"
            title="To Date"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search path, product, campaign, user..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="px-3 py-1.5 text-xs rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
          />
        </div>
      </div>

      {/* Subtab Navigation */}
      <div className="border-b border-zinc-200 flex items-center gap-2 overflow-x-auto pb-px">
        {[
          { key: 'charts', label: '📊 Visual Charts & Graphs' },
          { key: 'stream', label: '📡 Live Activity Stream' },
          { key: 'signups', label: '👥 Signups by Source' },
          { key: 'funnel', label: '⏳ Full-Funnel Breakdown' },
          { key: 'pages', label: '🌐 Top Pages & Products' },
          { key: 'devices', label: '📱 Devices & Tech' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as SubTab)}
            className={`px-3.5 py-2 text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
              activeTab === t.key
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* SUBTAB: VISUAL CHARTS & GRAPHS */}
      {activeTab === 'charts' && (
        <div className="space-y-6">
          {/* Row 1: Activity Timeline Trend & Traffic by Source Donut */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Timeline Area Chart (2 cols) */}
            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                    📈 Visitor Activity & Conversion Trendline
                  </h3>
                  <p className="text-[11px] text-zinc-400">Hits, Product Views, Signups, and Subscriptions over time</p>
                </div>
              </div>

              <div className="h-64 w-full">
                {data?.timelineTrend && data.timelineTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.timelineTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="colorProducts" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="colorSignups" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                      <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Area type="monotone" dataKey="views" name="Page Views" stroke="#3b82f6" fillOpacity={1} fill="url(#colorViews)" />
                      <Area type="monotone" dataKey="productViews" name="Product Views" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorProducts)" />
                      <Area type="monotone" dataKey="signups" name="User Signups" stroke="#10b981" fillOpacity={1} fill="url(#colorSignups)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-zinc-400">
                    No time-series data available yet.
                  </div>
                )}
              </div>
            </div>

            {/* Traffic Sources Pie/Donut (1 col) */}
            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs space-y-3 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                  🥧 Traffic Share by Marketing Source
                </h3>
                <p className="text-[11px] text-zinc-400">Percentage distribution of all incoming views</p>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourcesPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {sourcesPieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: unknown) => [`${String(v)} views`, '']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-1 max-h-28 overflow-y-auto">
                {sourcesPieData.map((s, idx) => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_PALETTE[idx % CHART_PALETTE.length] }}></span>
                      <span className="text-zinc-700 truncate">{s.name}</span>
                    </div>
                    <span className="font-semibold text-zinc-900 ml-2">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: Full Funnel Stages Bar Chart & Signups by Source Pie */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Visual Funnel Bar Chart */}
            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                ⏳ Conversion Funnel Drop-off Rate
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.funnelStages || []} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                    <XAxis dataKey="stage" angle={-15} textAnchor="end" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value: unknown) => [`${String(value)} count`, '']} />
                    <Bar dataKey="count" name="Total Actions" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                      {(data?.funnelStages || []).map((_, index) => (
                        <Cell key={`funnel-cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Signups by Source Distribution */}
            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                👥 User Signups by Marketing Source
              </h3>
              {data?.signupsBySource && data.signupsBySource.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.signupsBySource} layout="vertical" margin={{ top: 10, right: 20, left: 40, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f4f4f5" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: unknown) => [`${String(v)} signups`, '']} />
                      <Bar dataKey="value" name="Signups" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-xs text-zinc-400">
                  No signup acquisitions recorded in this period yet.
                </div>
              )}
            </div>
          </div>

          {/* Row 3: Event Type Distribution & Devices */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Event Type Share */}
            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                🎯 Event Type Distribution
              </h3>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data?.eventTypeDistribution || []}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                    >
                      {(data?.eventTypeDistribution || []).map((_, index) => (
                        <Cell key={`ev-cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Devices Share */}
            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                📱 Device & Platform Share
              </h3>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deviceChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={75}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                    >
                      {deviceChartData.map((_, index) => (
                        <Cell key={`dev-cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 1: LIVE EVENT STREAM TABLE */}
      {activeTab === 'stream' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 text-zinc-600 text-[10px] uppercase font-semibold border-b border-zinc-200">
                  <tr>
                    <th className="py-3 px-4">Event Type</th>
                    <th className="py-3 px-4">Marketing Source & Medium</th>
                    <th className="py-3 px-4">Campaign / Content</th>
                    <th className="py-3 px-4">Path & Product</th>
                    <th className="py-3 px-4">Visitor / User</th>
                    <th className="py-3 px-4">Device</th>
                    <th className="py-3 px-4 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-zinc-400 text-xs">
                        Loading live event stream…
                      </td>
                    </tr>
                  ) : !data?.events || data.events.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-zinc-400 text-xs">
                        No activity logs found for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    data.events.map((e) => {
                      const cfg = EVENT_CONFIG[e.event_type] || EVENT_CONFIG.landing;
                      return (
                        <tr key={e.id} className="hover:bg-zinc-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                            >
                              <span>{cfg.icon}</span>
                              <span>{cfg.label}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-zinc-900">{e.source}</div>
                            {e.medium && <div className="text-[10px] text-zinc-400">{e.medium}</div>}
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-zinc-900 font-medium truncate max-w-xs">
                              {e.resolved_campaign_name || e.campaign || '—'}
                            </div>
                            {e.resolved_content_name && (
                              <div className="text-[10px] text-zinc-500 truncate max-w-xs">
                                Ad: {e.resolved_content_name}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-mono text-zinc-800 text-[11px] truncate max-w-xs">{e.path}</div>
                            {e.product_slug && (
                              <div className="text-[10px] text-blue-600 font-mono font-semibold">
                                🎬 {e.product_slug}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {e.user_email ? (
                              <div>
                                <span className="font-semibold text-zinc-900">{e.user_email}</span>
                                <div className="text-[10px] text-emerald-600 font-medium">Logged In</div>
                              </div>
                            ) : (
                              <div>
                                <span className="font-mono text-zinc-400 text-[10px] truncate block max-w-[120px]">
                                  {e.anonymous_id || 'Anonymous'}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-zinc-700 text-[11px] flex items-center gap-1">
                              <span>{e.device_type === 'Mobile' ? '📱' : '💻'}</span>
                              <span>{e.device_type || 'Desktop'}</span>
                            </div>
                            {e.browser && <div className="text-[10px] text-zinc-400">{e.browser}</div>}
                          </td>
                          <td className="py-3 px-4 text-right text-zinc-400 text-[11px] font-mono whitespace-nowrap">
                            {new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-zinc-200 pt-3">
              <div className="text-xs text-zinc-500 font-medium">
                Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} total hits)
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-700 bg-white hover:bg-zinc-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                  disabled={page === data.pagination.totalPages}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-700 bg-white hover:bg-zinc-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: SIGNUPS BY SOURCE */}
      {activeTab === 'signups' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <span>👥</span> Signups & User Acquisitions by Marketing Source
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Exact discovery channel and campaign that converted each registered user account.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 text-zinc-600 text-[10px] uppercase font-semibold border-b border-zinc-200">
                  <tr>
                    <th className="py-3 px-4">User / Email</th>
                    <th className="py-3 px-4">Acquisition Source</th>
                    <th className="py-3 px-4">Campaign Name</th>
                    <th className="py-3 px-4">Registration Path</th>
                    <th className="py-3 px-4 text-right">Registered Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-medium">
                  {!data?.signupsList || data.signupsList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-zinc-400 text-xs">
                        No signups recorded in the selected period.
                      </td>
                    </tr>
                  ) : (
                    data.signupsList.map((s) => (
                      <tr key={s.id} className="hover:bg-zinc-50/70">
                        <td className="py-3 px-4 font-semibold text-zinc-900">{s.email || s.userId}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            {s.source}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-zinc-700">{s.campaign || '—'}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-zinc-500">{s.path}</td>
                        <td className="py-3 px-4 text-right text-zinc-400 text-[11px]">
                          {new Date(s.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: FULL FUNNEL BREAKDOWN */}
      {activeTab === 'funnel' && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4 shadow-xs">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <span>⏳</span> Multi-Channel Conversion Funnel Matrix
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Views → Product Views → Signups → Checkout Starts → Subscriptions by Source
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 text-zinc-600 text-[10px] uppercase font-semibold border-b border-zinc-200">
                <tr>
                  <th className="py-3 px-4">Marketing Source</th>
                  <th className="py-3 px-4 text-right">Views</th>
                  <th className="py-3 px-4 text-right">Unique Visitors</th>
                  <th className="py-3 px-4 text-right">Product Views</th>
                  <th className="py-3 px-4 text-right">Signups</th>
                  <th className="py-3 px-4 text-right">Checkout Starts</th>
                  <th className="py-3 px-4 text-right">Subscriptions</th>
                  <th className="py-3 px-4 text-right">Signup Rate</th>
                  <th className="py-3 px-4 text-right">Conv. Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium">
                {data?.sourcesBreakdown.map((s) => (
                  <tr key={s.source} className="hover:bg-zinc-50/70">
                    <td className="py-3 px-4 font-semibold text-zinc-900">{s.source}</td>
                    <td className="py-3 px-4 text-right text-zinc-800">{s.views}</td>
                    <td className="py-3 px-4 text-right text-zinc-600">{s.uniqueVisitors}</td>
                    <td className="py-3 px-4 text-right text-purple-600 font-semibold">{s.productViews}</td>
                    <td className="py-3 px-4 text-right text-emerald-600 font-bold">{s.signups}</td>
                    <td className="py-3 px-4 text-right text-orange-600 font-semibold">{s.checkouts}</td>
                    <td className="py-3 px-4 text-right text-blue-600 font-bold">{s.subscriptions}</td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-700">{s.signupRate}%</td>
                    <td className="py-3 px-4 text-right font-bold text-blue-700">{s.conversionRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 4: TOP PAGES & PRODUCTS */}
      {activeTab === 'pages' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Pages */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-3 shadow-xs">
            <h3 className="text-sm font-bold text-zinc-900">🌐 Most Viewed Landing Paths</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] uppercase text-zinc-400 font-semibold border-b border-zinc-100">
                  <tr>
                    <th className="py-2">Path</th>
                    <th className="py-2 text-right">Total Views</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50 font-medium">
                  {data?.topPages.map((p) => (
                    <tr key={p.path} className="hover:bg-zinc-50">
                      <td className="py-2 font-mono text-zinc-800 text-[11px] truncate max-w-xs">{p.path}</td>
                      <td className="py-2 text-right font-bold text-zinc-900">{p.views}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-3 shadow-xs">
            <h3 className="text-sm font-bold text-zinc-900">🎬 Most Viewed Templates & Products</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] uppercase text-zinc-400 font-semibold border-b border-zinc-100">
                  <tr>
                    <th className="py-2">Product Slug</th>
                    <th className="py-2 text-right">Views</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50 font-medium">
                  {data?.topProducts.map((pr) => (
                    <tr key={pr.product} className="hover:bg-zinc-50">
                      <td className="py-2 font-mono font-semibold text-blue-600 text-[11px]">{pr.product}</td>
                      <td className="py-2 text-right font-bold text-zinc-900">{pr.views}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 5: DEVICES & BROWSERS */}
      {activeTab === 'devices' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Devices Chart */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-3 shadow-xs">
            <h3 className="text-sm font-bold text-zinc-900">📱 Device Distribution</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deviceChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                  >
                    {deviceChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Browsers Chart */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-3 shadow-xs">
            <h3 className="text-sm font-bold text-zinc-900">🌐 Browser Distribution</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={browserChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={75}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                  >
                    {browserChartData.map((_, index) => (
                      <Cell key={`br-cell-${index}`} fill={CHART_PALETTE[(index + 2) % CHART_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
