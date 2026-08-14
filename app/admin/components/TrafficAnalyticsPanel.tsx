// agent-notes: { ctx: "Admin Traffic Sources Analytics panel analyzing visitor_attributions, multi-touch journeys, and conversion rates", deps: ["lib/supabaseClient.ts", "recharts"], state: active, last: "sato@2026-08-14" }
"use client";

import { useEffect, useState, useMemo, useCallback } from 'react';
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

type TrafficSummary = {
  totalVisitors: number;
  totalConverted: number;
  overallConversionRate: number;
  multiTouchCount: number;
  multiTouchPercentage: number;
  topSource: string;
  topSourceShare: string;
  topMedium: string;
  topLandingPage: string;
};

type TrafficSourceItem = {
  source: string;
  firstTouchCount: number;
  lastTouchCount: number;
  uniqueUsersCount: number;
  percentage: string;
  conversions: number;
  conversionRate: number;
  topMedium: string;
  topLandingPage: string;
  topCampaign: string;
};

type TrafficMediumItem = {
  medium: string;
  count: number;
  percentage: number;
  conversions: number;
  conversionRate: number;
};

type TrafficCampaignItem = {
  campaign: string;
  source: string;
  medium: string;
  visitors: number;
  conversions: number;
  conversionRate: number;
};

type TrafficLandingPageItem = {
  path: string;
  visitors: number;
  conversions: number;
  conversionRate: number;
  topSource: string;
};

type TrafficProductItem = {
  product: string;
  visitors: number;
  conversions: number;
  conversionRate: number;
  topSource: string;
};

type TrafficJourneyItem = {
  firstSource: string;
  lastSource: string;
  path: string;
  count: number;
  conversions: number;
};

type VisitorLogRow = {
  id: string;
  userId: string;
  anonymousId: string;
  firstSource: string;
  firstMedium: string;
  firstCampaign: string;
  firstContent: string;
  firstTerm: string;
  firstLandingPage: string;
  firstReferrer: string;
  firstProductViewed: string;
  firstVisitAt: string;
  lastSource: string;
  lastMedium: string;
  lastCampaign: string;
  lastContent: string;
  lastLandingPage: string;
  lastReferrer: string;
  lastProductViewed: string;
  lastVisitAt: string;
  createdAt: string;
  hasConverted: boolean;
  subscriptionPlan?: string | null;
  subscriptionStatus?: string | null;
};

const CHART_COLORS = [
  '#3b82f6', // blue
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#10b981', // emerald
  '#f59e0b', // amber
  '#06b6d4', // cyan
  '#6366f1', // indigo
  '#f43f5e', // rose
];

export default function TrafficAnalyticsPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [summary, setSummary] = useState<TrafficSummary | null>(null);
  const [sources, setSources] = useState<TrafficSourceItem[]>([]);
  const [mediums, setMediums] = useState<TrafficMediumItem[]>([]);
  const [campaigns, setCampaigns] = useState<TrafficCampaignItem[]>([]);
  const [landingPages, setLandingPages] = useState<TrafficLandingPageItem[]>([]);
  const [products, setProducts] = useState<TrafficProductItem[]>([]);
  const [journeys, setJourneys] = useState<TrafficJourneyItem[]>([]);
  const [visitorLogs, setVisitorLogs] = useState<VisitorLogRow[]>([]);

  // Filter States
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '365d' | 'all'>('30d');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [mediumFilter, setMediumFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'sources' | 'mediums' | 'landingPages' | 'journeys' | 'logs'>('sources');

  // Logs Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [logConvFilter, setLogConvFilter] = useState<'all' | 'converted' | 'non_converted'>('all');
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorLogRow | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not signed in');
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();
      if (sourceFilter !== 'all') params.set('source', sourceFilter);
      if (mediumFilter !== 'all') params.set('medium', mediumFilter);

      if (dateRange !== 'all') {
        const now = new Date();
        const daysMap = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 };
        const days = daysMap[dateRange];
        const fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        params.set('dateFrom', fromDate.toISOString());
      }

      const res = await fetch(`/api/admin/analytics/traffic?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Failed to fetch traffic analytics');
      }

      const d = json.data;
      setSummary(d.summary);
      setSources(d.sources || []);
      setMediums(d.mediums || []);
      setCampaigns(d.campaigns || []);
      setLandingPages(d.landingPages || []);
      setProducts(d.products || []);
      setJourneys(d.journeys || []);
      setVisitorLogs(d.visitorLogs || []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error fetching traffic analytics';
      console.error('Error fetching traffic analytics:', e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [dateRange, sourceFilter, mediumFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Chart data for Sources (First vs Last Touch)
  const sourceChartData = useMemo(() => {
    return sources.slice(0, 8).map((s) => ({
      name: s.source.length > 16 ? `${s.source.slice(0, 14)}…` : s.source,
      fullName: s.source,
      'First Touch (Acquisition)': s.firstTouchCount,
      'Last Touch (Conversion)': s.lastTouchCount,
      conversions: s.conversions,
    }));
  }, [sources]);

  // Chart data for Mediums Donut
  const mediumChartData = useMemo(() => {
    return mediums.map((m) => ({
      name: m.medium.charAt(0).toUpperCase() + m.medium.slice(1),
      value: m.count,
      percentage: m.percentage,
      conversions: m.conversions,
    }));
  }, [mediums]);

  // Filtered visitor logs
  const filteredLogs = useMemo(() => {
    return visitorLogs.filter((v) => {
      if (logConvFilter === 'converted' && !v.hasConverted) return false;
      if (logConvFilter === 'non_converted' && v.hasConverted) return false;

      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        v.userId?.toLowerCase().includes(term) ||
        v.firstSource?.toLowerCase().includes(term) ||
        v.lastSource?.toLowerCase().includes(term) ||
        v.firstLandingPage?.toLowerCase().includes(term) ||
        v.firstProductViewed?.toLowerCase().includes(term) ||
        v.firstCampaign?.toLowerCase().includes(term) ||
        v.firstMedium?.toLowerCase().includes(term)
      );
    });
  }, [visitorLogs, searchTerm, logConvFilter]);

  // Export CSV
  const handleExportCSV = () => {
    if (!visitorLogs.length) return;
    const headers = [
      'Record ID',
      'User ID',
      'Anonymous ID',
      'First Source',
      'First Medium',
      'First Campaign',
      'First Content',
      'First Landing Page',
      'First Referrer',
      'First Product Viewed',
      'First Visit At',
      'Last Source',
      'Last Medium',
      'Last Campaign',
      'Last Landing Page',
      'Last Referrer',
      'Last Product Viewed',
      'Last Visit At',
      'Has Converted',
      'Subscription Plan',
      'Subscription Status',
      'Created At',
    ];

    const rows = visitorLogs.map((r) => [
      r.id,
      r.userId,
      r.anonymousId || '',
      `"${r.firstSource}"`,
      `"${r.firstMedium}"`,
      `"${r.firstCampaign}"`,
      `"${r.firstContent}"`,
      `"${r.firstLandingPage}"`,
      `"${r.firstReferrer}"`,
      `"${r.firstProductViewed}"`,
      r.firstVisitAt,
      `"${r.lastSource}"`,
      `"${r.lastMedium}"`,
      `"${r.lastCampaign}"`,
      `"${r.lastLandingPage}"`,
      `"${r.lastReferrer}"`,
      `"${r.lastProductViewed}"`,
      r.lastVisitAt,
      r.hasConverted ? 'Yes' : 'No',
      r.subscriptionPlan || '',
      r.subscriptionStatus || '',
      r.createdAt,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `celite-traffic-sources-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for source badges / icons
  const getSourceIcon = (sourceName: string) => {
    const s = sourceName.toLowerCase();
    if (s.includes('google')) return '🔍';
    if (s.includes('instagram')) return '📸';
    if (s.includes('youtube')) return '▶️';
    if (s.includes('facebook')) return '👥';
    if (s.includes('twitter') || s.includes('x')) return '🐦';
    if (s.includes('direct')) return '🎯';
    if (s.includes('email') || s.includes('newsletter')) return '✉️';
    return '🌐';
  };

  if (loading && !summary) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-zinc-500 font-medium text-sm">Loading Traffic Sources Analysis…</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 font-sans">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🌐</span>
            <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">
              Traffic Sources & Journey Analysis
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
              visitor_attributions
            </span>
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            Real-time traffic acquisition attribution, landing page discovery, multi-touch paths, and visitor-to-subscriber conversion rates.
          </p>
        </div>

        {/* Action Controls & Filters */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Date Range Preset */}
          <div className="flex items-center bg-zinc-100 p-1 rounded-xl border border-zinc-200/80">
            {(['7d', '30d', '90d', '365d', 'all'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  dateRange === r
                    ? 'bg-white text-zinc-900 shadow-xs font-bold'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                {r === '7d' ? '7D' : r === '30d' ? '30D' : r === '90d' ? '90D' : r === '365d' ? '1Y' : 'All'}
              </button>
            ))}
          </div>

          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white border border-zinc-200 text-xs font-semibold text-zinc-800 shadow-xs focus:ring-2 focus:ring-blue-500/20 outline-none"
          >
            <option value="all">All Sources</option>
            {sources.map((s) => (
              <option key={s.source} value={s.source}>
                {s.source} ({s.firstTouchCount})
              </option>
            ))}
          </select>

          {/* Medium Filter */}
          <select
            value={mediumFilter}
            onChange={(e) => setMediumFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white border border-zinc-200 text-xs font-semibold text-zinc-800 shadow-xs focus:ring-2 focus:ring-blue-500/20 outline-none"
          >
            <option value="all">All Mediums</option>
            {mediums.map((m) => (
              <option key={m.medium} value={m.medium}>
                {m.medium.charAt(0).toUpperCase() + m.medium.slice(1)} ({m.count})
              </option>
            ))}
          </select>

          {/* Refresh Button */}
          <button
            onClick={() => loadData()}
            title="Refresh Data"
            className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors"
          >
            <svg
              className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            disabled={!visitorLogs.length}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition-all shadow-xs disabled:opacity-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200 flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Card 1: Total Visitors */}
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs relative overflow-hidden group hover:border-blue-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Visitors</span>
              <span className="p-2 rounded-xl bg-blue-50 text-blue-600 text-sm">👥</span>
            </div>
            <div className="mt-3 text-2xl font-black text-zinc-900">{summary.totalVisitors.toLocaleString()}</div>
            <div className="mt-1 text-xs text-zinc-400 font-medium">Tracked in visitor_attributions</div>
          </div>

          {/* Card 2: Top Source */}
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs relative overflow-hidden group hover:border-pink-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Top Source</span>
              <span className="p-2 rounded-xl bg-pink-50 text-pink-600 text-sm">🏆</span>
            </div>
            <div className="mt-3 text-lg font-black text-zinc-900 truncate" title={summary.topSource}>
              {summary.topSource}
            </div>
            <div className="mt-1 text-xs text-pink-600 font-semibold">{summary.topSourceShare}% of all traffic</div>
          </div>

          {/* Card 3: Top Medium */}
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs relative overflow-hidden group hover:border-purple-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Top Medium</span>
              <span className="p-2 rounded-xl bg-purple-50 text-purple-600 text-sm">📱</span>
            </div>
            <div className="mt-3 text-lg font-black text-zinc-900 uppercase">{summary.topMedium}</div>
            <div className="mt-1 text-xs text-zinc-400 font-medium">Primary traffic channel</div>
          </div>

          {/* Card 4: Conversions */}
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs relative overflow-hidden group hover:border-emerald-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Subscribers Converted</span>
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 text-sm">🎯</span>
            </div>
            <div className="mt-3 text-2xl font-black text-emerald-600">{summary.totalConverted}</div>
            <div className="mt-1 text-xs text-zinc-500 font-medium">
              <span className="font-bold text-emerald-600">{summary.overallConversionRate}%</span> conv. rate
            </div>
          </div>

          {/* Card 5: Multi-Touch Journeys */}
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs relative overflow-hidden group hover:border-amber-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Multi-Touch Visitors</span>
              <span className="p-2 rounded-xl bg-amber-50 text-amber-600 text-sm">🔄</span>
            </div>
            <div className="mt-3 text-2xl font-black text-zinc-900">{summary.multiTouchCount}</div>
            <div className="mt-1 text-xs text-amber-600 font-semibold">{summary.multiTouchPercentage}% multiple touches</div>
          </div>

          {/* Card 6: Top Landing Page */}
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs relative overflow-hidden group hover:border-indigo-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Top Landing Path</span>
              <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 text-sm">📄</span>
            </div>
            <div className="mt-3 text-sm font-black text-zinc-900 truncate" title={summary.topLandingPage}>
              {summary.topLandingPage}
            </div>
            <div className="mt-1 text-xs text-zinc-400 font-medium">Highest inbound entries</div>
          </div>
        </div>
      )}

      {/* Visual Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Traffic Sources Breakdown (First vs Last Touch) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
            <div>
              <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                <span>📊</span> Traffic Sources: First-Touch vs Last-Touch
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                First-Touch indicates discovery channels; Last-Touch represents closing attribution.
              </p>
            </div>
          </div>

          {sourceChartData.length > 0 ? (
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceChartData} margin={{ top: 10, right: 20, left: -10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                      fontSize: '12px',
                    }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(value: any, name: any) => [
                      `${value ?? 0} visitors`,
                      String(name ?? ''),
                    ]}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    labelFormatter={(label: any, payload: any) => payload?.[0]?.payload?.fullName || String(label)}
                  />
                  <Legend verticalAlign="top" wrapperStyle={{ fontSize: '12px', paddingBottom: '16px' }} />
                  <Bar dataKey="First Touch (Acquisition)" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="Last Touch (Conversion)" fill="#8b5cf6" radius={[6, 6, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-zinc-400">No source data available</div>
          )}
        </div>

        {/* Chart 2: Medium Share Donut Chart */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs flex flex-col">
          <div className="mb-4">
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <span>🍩</span> Traffic by Medium
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">Share across organic, social, direct, and paid channels.</p>
          </div>

          {mediumChartData.length > 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-full h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={mediumChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {mediumChartData.map((entry, index) => (
                        <Cell key={`cell-${entry.name}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        fontSize: '12px',
                      }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(val: any, _name: any, item: any) => [
                        `${val ?? 0} visitors (${item?.payload?.percentage ?? 0}%)`,
                        item?.payload?.name ?? '',
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Custom Legend */}
              <div className="grid grid-cols-2 gap-2 mt-4 w-full text-xs">
                {mediumChartData.map((m, idx) => (
                  <div key={m.name} className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 border border-zinc-100">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                      <span className="font-semibold text-zinc-700 truncate">{m.name}</span>
                    </div>
                    <span className="font-bold text-zinc-900">{m.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-zinc-400">No medium data available</div>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="border-b border-zinc-200 flex items-center gap-3 overflow-x-auto pb-px">
        {[
          { key: 'sources', label: '📊 Sources Breakdown', count: sources.length },
          { key: 'mediums', label: '📱 Mediums & Campaigns', count: campaigns.length },
          { key: 'landingPages', label: '📄 Inbound Pages & Products', count: landingPages.length },
          { key: 'journeys', label: '🔄 Multi-Touch Paths', count: journeys.length },
          { key: 'logs', label: '🔍 Visitor Touchpoint Log', count: visitorLogs.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as 'sources' | 'mediums' | 'landingPages' | 'journeys' | 'logs')}
            className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap outline-none ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 hover:border-zinc-300'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab.key ? 'bg-blue-100 text-blue-800' : 'bg-zinc-100 text-zinc-600'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab 1: Sources Breakdown */}
      {activeTab === 'sources' && (
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-zinc-200/80 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-zinc-900">Traffic Source Performance</h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Acquisition volume, share of traffic, conversion into active subscribers, and dominant entry points.
              </p>
            </div>
            <div className="text-xs font-semibold text-zinc-500">
              Total Sources: <span className="text-zinc-900">{sources.length}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/80 border-b border-zinc-200/80 text-zinc-600 font-semibold">
                <tr>
                  <th className="py-3 px-4">Traffic Source</th>
                  <th className="py-3 px-4 text-center">First Touch (Acquisition)</th>
                  <th className="py-3 px-4 text-center">Last Touch</th>
                  <th className="py-3 px-4">Traffic Share</th>
                  <th className="py-3 px-4 text-center">Conversions</th>
                  <th className="py-3 px-4 text-center">Conversion Rate</th>
                  <th className="py-3 px-4">Top Landing Page</th>
                  <th className="py-3 px-4">Top Campaign</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {sources.map((s) => (
                  <tr key={s.source} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-zinc-900 flex items-center gap-2">
                      <span className="text-base">{getSourceIcon(s.source)}</span>
                      <span>{s.source}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-zinc-900">{s.firstTouchCount}</td>
                    <td className="py-3.5 px-4 text-center text-zinc-600 font-medium">{s.lastTouchCount}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-zinc-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${Math.min(100, Math.max(4, Number(s.percentage)))}%` }}
                          />
                        </div>
                        <span className="font-semibold text-zinc-700">{s.percentage}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full font-bold ${
                        s.conversions > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'text-zinc-400'
                      }`}>
                        {s.conversions}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`font-bold ${
                        s.conversionRate >= 10
                          ? 'text-emerald-600'
                          : s.conversionRate > 0
                          ? 'text-amber-600'
                          : 'text-zinc-400'
                      }`}>
                        {s.conversionRate}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 max-w-[200px] truncate text-zinc-600" title={s.topLandingPage}>
                      <code className="bg-zinc-100 px-1.5 py-0.5 rounded text-[11px] text-zinc-800">{s.topLandingPage}</code>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-600 font-medium">{s.topCampaign}</td>
                  </tr>
                ))}
                {sources.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-zinc-400">
                      No sources found for the selected filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Mediums & Campaigns */}
      {activeTab === 'mediums' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mediums Breakdown Table */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-zinc-200/80">
              <h3 className="text-base font-bold text-zinc-900">Traffic Medium Performance</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Breakdown by marketing medium channel.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50/80 border-b border-zinc-200/80 text-zinc-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Medium</th>
                    <th className="py-3 px-4 text-center">Visitors</th>
                    <th className="py-3 px-4">Share</th>
                    <th className="py-3 px-4 text-center">Conversions</th>
                    <th className="py-3 px-4 text-center">Conversion Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {mediums.map((m) => (
                    <tr key={m.medium} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-zinc-900 capitalize flex items-center gap-2">
                        <span>{m.medium === 'organic' ? '🌱' : m.medium === 'social' ? '📱' : m.medium === 'cpc' ? '💰' : m.medium === 'direct' ? '🎯' : '🔗'}</span>
                        {m.medium}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-zinc-900">{m.count}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: `${m.percentage}%` }} />
                          </div>
                          <span className="font-semibold text-zinc-700">{m.percentage}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-600">{m.conversions}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-zinc-800">{m.conversionRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Campaigns Breakdown Table */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-zinc-200/80">
              <h3 className="text-base font-bold text-zinc-900">Campaign Analytics</h3>
              <p className="text-xs text-zinc-500 mt-0.5">UTM campaigns driving visitor engagement and signups.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50/80 border-b border-zinc-200/80 text-zinc-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Campaign</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4 text-center">Visitors</th>
                    <th className="py-3 px-4 text-center">Conversions</th>
                    <th className="py-3 px-4 text-center">Conversion Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {campaigns.map((c) => (
                    <tr key={`${c.campaign}_${c.source}`} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-zinc-900">{c.campaign}</td>
                      <td className="py-3.5 px-4 text-zinc-600">{c.source}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-zinc-900">{c.visitors}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-600">{c.conversions}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-zinc-800">{c.conversionRate}%</td>
                    </tr>
                  ))}
                  {campaigns.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-zinc-400">
                        No UTM campaigns tracked in this timeframe.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Landing Pages & Products */}
      {activeTab === 'landingPages' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Landing Pages */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-zinc-200/80">
              <h3 className="text-base font-bold text-zinc-900">Inbound Landing Pages</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Top entry points where visitors first landed.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50/80 border-b border-zinc-200/80 text-zinc-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Landing Page URL</th>
                    <th className="py-3 px-4 text-center">Visitors</th>
                    <th className="py-3 px-4 text-center">Conversions</th>
                    <th className="py-3 px-4">Top Inbound Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {landingPages.map((lp) => (
                    <tr key={lp.path} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-blue-600 max-w-[240px] truncate" title={lp.path}>
                        <code className="bg-blue-50 px-2 py-0.5 rounded text-[11px] text-blue-800">{lp.path}</code>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-zinc-900">{lp.visitors}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-600">{lp.conversions}</td>
                      <td className="py-3.5 px-4 text-zinc-600 font-medium">{lp.topSource}</td>
                    </tr>
                  ))}
                  {landingPages.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-zinc-400">No landing pages recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* First Products Viewed */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-zinc-200/80">
              <h3 className="text-base font-bold text-zinc-900">First Products Viewed</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Products that captured visitor attention upon first visit.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50/80 border-b border-zinc-200/80 text-zinc-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Product Slug</th>
                    <th className="py-3 px-4 text-center">Visitors</th>
                    <th className="py-3 px-4 text-center">Conversions</th>
                    <th className="py-3 px-4">Primary Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {products.map((p) => (
                    <tr key={p.product} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-zinc-900 max-w-[240px] truncate" title={p.product}>
                        <span className="font-mono text-[11px] bg-zinc-100 px-2 py-0.5 rounded text-zinc-800">{p.product}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-zinc-900">{p.visitors}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-600">{p.conversions}</td>
                      <td className="py-3.5 px-4 text-zinc-600 font-medium">{p.topSource}</td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-zinc-400">No product views recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Multi-Touch Journeys */}
      {activeTab === 'journeys' && (
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-zinc-200/80">
            <h3 className="text-base font-bold text-zinc-900">Multi-Touch Customer Journey Flows</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Identifies paths from first discovery touch to the last touch before action.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/80 border-b border-zinc-200/80 text-zinc-600 font-semibold">
                <tr>
                  <th className="py-3 px-4">First Touch (Acquisition)</th>
                  <th className="py-3 px-4 text-center">➔</th>
                  <th className="py-3 px-4">Last Touch (Conversion Trigger)</th>
                  <th className="py-3 px-4 text-center">Visitors</th>
                  <th className="py-3 px-4 text-center">Conversions</th>
                  <th className="py-3 px-4">Journey Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {journeys.map((j) => {
                  const isCrossChannel = j.firstSource.toLowerCase() !== j.lastSource.toLowerCase();
                  return (
                    <tr key={j.path} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-zinc-900 flex items-center gap-2">
                        <span>{getSourceIcon(j.firstSource)}</span>
                        {j.firstSource}
                      </td>
                      <td className="py-3.5 px-4 text-center text-zinc-400 font-bold">➔</td>
                      <td className="py-3.5 px-4 font-bold text-zinc-900 flex items-center gap-2">
                        <span>{getSourceIcon(j.lastSource)}</span>
                        {j.lastSource}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-zinc-900">{j.count}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-600">{j.conversions}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            isCrossChannel
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-zinc-100 text-zinc-700'
                          }`}
                        >
                          {isCrossChannel ? 'Multi-Channel Touch' : 'Single Channel'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Live Visitor Touchpoints Explorer */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
          {/* Search & Filter bar for logs */}
          <div className="p-5 border-b border-zinc-200/80 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search by User ID, source, landing page, campaign…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <svg
                className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={logConvFilter}
                onChange={(e) => setLogConvFilter(e.target.value as 'all' | 'converted' | 'non_converted')}
                className="px-3 py-2 rounded-xl bg-white border border-zinc-200 text-xs font-semibold text-zinc-800 shadow-xs outline-none"
              >
                <option value="all">All Visitors</option>
                <option value="converted">Subscribed / Converted Only</option>
                <option value="non_converted">Non-Converted</option>
              </select>

              <span className="text-xs text-zinc-500 font-semibold">
                Showing {filteredLogs.length} of {visitorLogs.length}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/80 border-b border-zinc-200/80 text-zinc-600 font-semibold">
                <tr>
                  <th className="py-3 px-4">User / Anon ID</th>
                  <th className="py-3 px-4">First Touch Source</th>
                  <th className="py-3 px-4">Last Touch Source</th>
                  <th className="py-3 px-4">Landing Page</th>
                  <th className="py-3 px-4">First Product</th>
                  <th className="py-3 px-4">First Visit</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredLogs.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-800">
                      {row.userId ? `${row.userId.slice(0, 8)}…` : row.anonymousId ? `anon_${row.anonymousId.slice(0, 6)}` : '—'}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-zinc-900 flex items-center gap-1.5">
                      <span>{getSourceIcon(row.firstSource)}</span>
                      <span>{row.firstSource}</span>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-700 font-medium">{row.lastSource}</td>
                    <td className="py-3.5 px-4 max-w-[160px] truncate text-zinc-600" title={row.firstLandingPage}>
                      <code className="bg-zinc-100 px-1.5 py-0.5 rounded text-[10px]">{row.firstLandingPage}</code>
                    </td>
                    <td className="py-3.5 px-4 max-w-[140px] truncate text-zinc-600" title={row.firstProductViewed}>
                      {row.firstProductViewed !== '—' ? (
                        <span className="font-mono text-[10px] text-zinc-800">{row.firstProductViewed}</span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-500 whitespace-nowrap">
                      {new Date(row.firstVisitAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {row.hasConverted ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {row.subscriptionPlan ? `Subscribed (${row.subscriptionPlan})` : 'Converted'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 text-zinc-600">
                          Visitor
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setSelectedVisitor(row)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-blue-50 hover:text-blue-600 text-zinc-700 font-semibold transition-colors text-[11px]"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-zinc-400">
                      No matching visitor records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Visitor Detail Modal / Drawer */}
      {selectedVisitor && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-2xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                  <span>🧭</span> Visitor Journey Detail
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  User ID: <span className="font-mono text-zinc-800 font-semibold">{selectedVisitor.userId}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedVisitor(null)}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-600 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Conversion Status Banner */}
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between ${
                selectedVisitor.hasConverted
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedVisitor.hasConverted ? '🎉' : '👤'}</span>
                <div>
                  <div className="font-bold text-sm">
                    {selectedVisitor.hasConverted ? 'Converted Customer' : 'Unconverted Visitor'}
                  </div>
                  <div className="text-xs opacity-80">
                    {selectedVisitor.subscriptionPlan
                      ? `Active Plan: ${selectedVisitor.subscriptionPlan.toUpperCase()} (${selectedVisitor.subscriptionStatus})`
                      : 'No active paid subscription yet'}
                  </div>
                </div>
              </div>
              <div className="text-xs font-mono opacity-70">
                Created: {new Date(selectedVisitor.createdAt).toLocaleString()}
              </div>
            </div>

            {/* First Touch vs Last Touch Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* First Touch */}
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-2">
                <div className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🚀</span> First Touch (Acquisition)
                </div>
                <div className="text-sm font-extrabold text-zinc-900">{selectedVisitor.firstSource}</div>
                <div className="space-y-1 text-xs text-zinc-600">
                  <div><strong>Medium:</strong> {selectedVisitor.firstMedium}</div>
                  <div><strong>Campaign:</strong> {selectedVisitor.firstCampaign}</div>
                  <div><strong>Content:</strong> {selectedVisitor.firstContent}</div>
                  <div><strong>Term:</strong> {selectedVisitor.firstTerm}</div>
                  <div className="truncate"><strong>Referrer:</strong> {selectedVisitor.firstReferrer}</div>
                  <div className="truncate"><strong>Landing Page:</strong> {selectedVisitor.firstLandingPage}</div>
                  <div><strong>First Product:</strong> {selectedVisitor.firstProductViewed}</div>
                  <div><strong>Visited At:</strong> {new Date(selectedVisitor.firstVisitAt).toLocaleString()}</div>
                </div>
              </div>

              {/* Last Touch */}
              <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100 space-y-2">
                <div className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🎯</span> Last Touch (Conversion Trigger)
                </div>
                <div className="text-sm font-extrabold text-zinc-900">{selectedVisitor.lastSource}</div>
                <div className="space-y-1 text-xs text-zinc-600">
                  <div><strong>Medium:</strong> {selectedVisitor.lastMedium}</div>
                  <div><strong>Campaign:</strong> {selectedVisitor.lastCampaign}</div>
                  <div><strong>Content:</strong> {selectedVisitor.lastContent}</div>
                  <div className="truncate"><strong>Referrer:</strong> {selectedVisitor.lastReferrer}</div>
                  <div className="truncate"><strong>Landing Page:</strong> {selectedVisitor.lastLandingPage}</div>
                  <div><strong>Last Product:</strong> {selectedVisitor.lastProductViewed}</div>
                  <div><strong>Last Visited:</strong> {new Date(selectedVisitor.lastVisitAt).toLocaleString()}</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedVisitor(null)}
                className="px-5 py-2.5 bg-zinc-900 text-white text-xs font-bold rounded-xl hover:bg-zinc-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
