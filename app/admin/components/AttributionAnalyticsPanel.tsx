// agent-notes: { ctx: "Universal Admin Attribution Analytics Panel with multi-touch breakdown, assisted conversions, registry drilldown, and CSV export", deps: ["lib/supabaseClient.ts", "recharts"], state: active, last: "sato@2026-08-16" }
"use client";

import { useEffect, useState, useMemo } from 'react';
import { getSupabaseBrowserClient } from '../../../lib/supabaseClient';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

type SourceMetric = {
  source: string;
  customers: number;
  revenue: number;
  monthly: number;
  yearly: number;
  avgOrderValue: number;
};

type AssistedMetric = {
  firstSource: string;
  lastSource: string;
  path: string;
  count: number;
  revenue: number;
};

type CampaignMetric = {
  campaign: string;
  campaignId?: string | null;
  source: string;
  medium: string;
  customers: number;
  revenue: number;
  monthly: number;
  yearly: number;
  avgOrderValue: number;
};

type CreativeMetric = {
  name: string;
  id: string;
  campaignName: string;
  source: string;
  subscriptions: number;
  revenue: number;
};

type ReferralMetric = {
  domain: string;
  url: string;
  visitors: number;
  revenue: number;
};

type ProductMetric = {
  product: string;
  firstTouchCount: number;
  lastTouchCount: number;
  subscriptions: number;
  revenue: number;
};

type DirectInvestigation = {
  genuineDirect: { count: number; revenue: number };
  previouslyAttributed: { count: number; revenue: number; origins: Record<string, number> };
  unknownMissingReferrer: { count: number; revenue: number };
};

type AnalyticsData = {
  summary: {
    totalSubscriptions: number;
    totalRevenue: number;
    monthlyRevenue: number;
    yearlyRevenue: number;
    monthlyCount: number;
    yearlyCount: number;
    avgOrderValue: number;
  };
  firstTouchBreakdown: SourceMetric[];
  lastTouchBreakdown: SourceMetric[];
  assistedConversions: AssistedMetric[];
  campaignBreakdown: CampaignMetric[];
  creativeBreakdown: CreativeMetric[];
  referralBreakdown: ReferralMetric[];
  productBreakdown: ProductMetric[];
  directInvestigation: DirectInvestigation;
  confidenceBreakdown: { high: number; medium: number; low: number };
};

type ActiveSubTab =
  | 'overview'
  | 'assisted'
  | 'campaigns'
  | 'referrals'
  | 'direct'
  | 'products'
  | 'dataQuality';

export default function AttributionAnalyticsPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveSubTab>('overview');

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Not signed in'); setLoading(false); return; }

      const params = new URLSearchParams();
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (planFilter !== 'all') params.set('plan', planFilter);
      if (sourceFilter !== 'all') params.set('source', sourceFilter);

      const res = await fetch(`/api/admin/analytics/attribution?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || 'Failed to load attribution analytics');
        setLoading(false);
        return;
      }
      setData(json);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load attribution analytics';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [dateFrom, dateTo, planFilter, sourceFilter]);

  const handleExportCsv = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/admin/analytics/attribution/export', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        alert('Failed to export CSV');
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `celite-attribution-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error exporting CSV';
      alert(msg);
    }
  };

  // Compare first-touch vs last-touch chart dataset
  const comparisonChartData = useMemo(() => {
    if (!data) return [];
    const sourceSet = new Set<string>();
    data.firstTouchBreakdown.forEach((s) => sourceSet.add(s.source));
    data.lastTouchBreakdown.forEach((s) => sourceSet.add(s.source));

    const firstMap = new Map(data.firstTouchBreakdown.map((s) => [s.source, s.revenue]));
    const lastMap = new Map(data.lastTouchBreakdown.map((s) => [s.source, s.revenue]));

    return Array.from(sourceSet).map((source) => ({
      source,
      'First Touch (Discovery)': firstMap.get(source) || 0,
      'Last Touch (Conversion)': lastMap.get(source) || 0,
    }));
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
            Universal Attribution Analytics
            <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
              Financial Grade
            </span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            100% database-backed revenue attribution across paid ads, organic channels, referrals, and AI search
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-semibold shadow-xs flex items-center gap-1.5"
          >
            <span>📥</span> Export CSV
          </button>
          <button
            onClick={loadAnalytics}
            className="px-3.5 py-1.5 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-xs"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white p-3.5 rounded-2xl border border-zinc-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 text-xs text-zinc-500 font-medium">
          <span>From:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-2 py-1 rounded-lg border border-zinc-200 bg-zinc-50 text-xs"
          />
        </div>
        <div className="flex items-center gap-1 text-xs text-zinc-500 font-medium">
          <span>To:</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-2 py-1 rounded-lg border border-zinc-200 bg-zinc-50 text-xs"
          />
        </div>
        <div className="flex items-center gap-1 text-xs text-zinc-500 font-medium">
          <span>Plan:</span>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-2.5 py-1 rounded-lg border border-zinc-200 bg-zinc-50 text-xs"
          >
            <option value="all">All Plans</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
        <div className="flex items-center gap-1 text-xs text-zinc-500 font-medium">
          <span>Source:</span>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-2.5 py-1 rounded-lg border border-zinc-200 bg-zinc-50 text-xs"
          >
            <option value="all">All Channels</option>
            <option value="Instagram Paid">Instagram Paid</option>
            <option value="Instagram Organic">Instagram Organic</option>
            <option value="Facebook Paid">Facebook Paid</option>
            <option value="Google Ads">Google Ads</option>
            <option value="Google Organic">Google Organic</option>
            <option value="YouTube">YouTube</option>
            <option value="ChatGPT / AI">ChatGPT / AI</option>
            <option value="Referral">Referral</option>
            <option value="Direct">Direct</option>
          </select>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {data?.summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Attributed Revenue</div>
            <div className="text-2xl font-bold text-zinc-900 mt-1">
              ₹{data.summary.totalRevenue.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">
              Monthly: ₹{data.summary.monthlyRevenue.toLocaleString('en-IN')} • Yearly: ₹{data.summary.yearlyRevenue.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Subscriptions</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">
              {data.summary.totalSubscriptions}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">
              {data.summary.monthlyCount} Monthly • {data.summary.yearlyCount} Yearly
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Average Order Value</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">
              ₹{data.summary.avgOrderValue.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Across all converted customers</div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Data Quality Score</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold text-purple-600">
                {data.summary.totalSubscriptions > 0
                  ? Math.round((data.confidenceBreakdown.high / data.summary.totalSubscriptions) * 100)
                  : 100}%
              </span>
              <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-semibold border border-purple-200">
                High Confidence
              </span>
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">
              {data.confidenceBreakdown.high} High • {data.confidenceBreakdown.medium} Med • {data.confidenceBreakdown.low} Low
            </div>
          </div>
        </div>
      )}

      {/* Navigation Subtabs */}
      <div className="border-b border-zinc-200 flex items-center gap-2 overflow-x-auto pb-px">
        {[
          { key: 'overview', label: '📊 First vs Last Touch' },
          { key: 'assisted', label: '🔄 Assisted Conversions' },
          { key: 'campaigns', label: '📣 Campaigns & Creatives' },
          { key: 'referrals', label: '🔗 Referral Websites' },
          { key: 'direct', label: '🕵️ Direct / Unknown' },
          { key: 'products', label: '🎬 Product Attribution' },
          { key: 'dataQuality', label: '🛡️ Data Quality' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as ActiveSubTab)}
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

      {loading ? (
        <div className="py-16 text-center text-zinc-400 text-xs font-medium">
          Loading universal attribution metrics…
        </div>
      ) : error ? (
        <div className="py-12 text-center text-red-500 text-xs">{error}</div>
      ) : !data ? null : (
        <div className="space-y-6">
          {/* TAB 1: Overview (First-Touch vs Last-Touch) */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Chart */}
              <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                  Discovery Revenue vs Converting Revenue by Channel
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonChartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                      <XAxis dataKey="source" angle={-15} textAnchor="end" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v}`} />
                      <Tooltip formatter={(value: unknown) => [`₹${Number(value || 0).toLocaleString('en-IN')}`, '']} />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Bar dataKey="First Touch (Discovery)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Last Touch (Conversion)" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Side by side tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* First Touch */}
                <div className="bg-white rounded-2xl border border-zinc-200 p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
                      <span>🌱</span> First-Touch Discovery Source
                    </h4>
                    <span className="text-[10px] text-zinc-400 font-medium">Original Acquisition</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="text-[10px] uppercase text-zinc-400 font-semibold border-b border-zinc-100">
                        <tr>
                          <th className="py-2">Source</th>
                          <th className="py-2 text-right">Subs</th>
                          <th className="py-2 text-right">Revenue</th>
                          <th className="py-2 text-right">AOV</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-50 font-medium">
                        {data.firstTouchBreakdown.map((s) => (
                          <tr key={s.source} className="hover:bg-zinc-50">
                            <td className="py-2.5 font-semibold text-zinc-900">{s.source}</td>
                            <td className="py-2.5 text-right text-zinc-600">{s.customers}</td>
                            <td className="py-2.5 text-right font-bold text-emerald-600">
                              ₹{s.revenue.toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 text-right text-zinc-500">₹{s.avgOrderValue}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Last Touch */}
                <div className="bg-white rounded-2xl border border-zinc-200 p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
                      <span>🎯</span> Last-Touch Conversion Source
                    </h4>
                    <span className="text-[10px] text-zinc-400 font-medium">Direct Converting Channel</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="text-[10px] uppercase text-zinc-400 font-semibold border-b border-zinc-100">
                        <tr>
                          <th className="py-2">Source</th>
                          <th className="py-2 text-right">Subs</th>
                          <th className="py-2 text-right">Revenue</th>
                          <th className="py-2 text-right">AOV</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-50 font-medium">
                        {data.lastTouchBreakdown.map((s) => (
                          <tr key={s.source} className="hover:bg-zinc-50">
                            <td className="py-2.5 font-semibold text-zinc-900">{s.source}</td>
                            <td className="py-2.5 text-right text-zinc-600">{s.customers}</td>
                            <td className="py-2.5 text-right font-bold text-blue-600">
                              ₹{s.revenue.toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 text-right text-zinc-500">₹{s.avgOrderValue}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Assisted Conversions */}
          {activeTab === 'assisted' && (
            <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4 shadow-xs">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <span>🔄</span> Assisted Conversion Pathways
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Multi-touch journeys where initial discovery occurred on one channel, but final conversion was completed on another.
                </p>
              </div>

              {data.assistedConversions.length === 0 ? (
                <div className="py-12 text-center text-zinc-400 text-xs">
                  No multi-channel assisted conversions recorded in this time range.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 text-zinc-600 text-[10px] uppercase font-semibold border-b border-zinc-200">
                      <tr>
                        <th className="py-3 px-4">Discovery Source (First Touch)</th>
                        <th className="py-3 px-4"></th>
                        <th className="py-3 px-4">Converting Source (Last Touch)</th>
                        <th className="py-3 px-4 text-right">Assisted Conversions</th>
                        <th className="py-3 px-4 text-right">Revenue Generated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 font-medium">
                      {data.assistedConversions.map((a) => (
                        <tr key={a.path} className="hover:bg-zinc-50/70">
                          <td className="py-3 px-4 font-semibold text-zinc-900">{a.firstSource}</td>
                          <td className="py-3 px-4 text-zinc-300 font-bold text-center">➔</td>
                          <td className="py-3 px-4 font-semibold text-blue-600">{a.lastSource}</td>
                          <td className="py-3 px-4 text-right font-bold text-zinc-800">{a.count}</td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-600">
                            ₹{a.revenue.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Campaigns & Creatives */}
          {activeTab === 'campaigns' && (
            <div className="space-y-6">
              {/* Campaign Table */}
              <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4 shadow-xs">
                <h3 className="text-sm font-bold text-zinc-900">📣 Campaign Performance Hierarchy</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 text-zinc-600 text-[10px] uppercase font-semibold border-b border-zinc-200">
                      <tr>
                        <th className="py-3 px-4">Campaign Name</th>
                        <th className="py-3 px-4">Source & Medium</th>
                        <th className="py-3 px-4 text-right">Subscribers</th>
                        <th className="py-3 px-4 text-right">Total Revenue</th>
                        <th className="py-3 px-4 text-right">Monthly / Yearly</th>
                        <th className="py-3 px-4 text-right">AOV</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 font-medium">
                      {data.campaignBreakdown.map((c) => (
                        <tr key={c.campaign} className="hover:bg-zinc-50/70">
                          <td className="py-3 px-4 font-semibold text-zinc-900">{c.campaign}</td>
                          <td className="py-3 px-4 text-zinc-500">{c.source} ({c.medium})</td>
                          <td className="py-3 px-4 text-right text-zinc-800">{c.customers}</td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-600">
                            ₹{c.revenue.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-right text-zinc-500">
                            {c.monthly}M / {c.yearly}Y
                          </td>
                          <td className="py-3 px-4 text-right text-zinc-500">₹{c.avgOrderValue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Creatives Table */}
              <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4 shadow-xs">
                <h3 className="text-sm font-bold text-zinc-900">🎬 Ad / Video / Creative Attribution</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 text-zinc-600 text-[10px] uppercase font-semibold border-b border-zinc-200">
                      <tr>
                        <th className="py-3 px-4">Ad / Video Name</th>
                        <th className="py-3 px-4">Campaign</th>
                        <th className="py-3 px-4">Channel</th>
                        <th className="py-3 px-4 text-right">Subscriptions</th>
                        <th className="py-3 px-4 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 font-medium">
                      {data.creativeBreakdown.map((cr) => (
                        <tr key={cr.name} className="hover:bg-zinc-50/70">
                          <td className="py-3 px-4 font-semibold text-zinc-900">{cr.name}</td>
                          <td className="py-3 px-4 text-zinc-600">{cr.campaignName}</td>
                          <td className="py-3 px-4 text-zinc-500">{cr.source}</td>
                          <td className="py-3 px-4 text-right text-zinc-800">{cr.subscriptions}</td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-600">
                            ₹{cr.revenue.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Referral Websites */}
          {activeTab === 'referrals' && (
            <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-zinc-900">🔗 Referral Website Traffic & Revenue</h3>
              {data.referralBreakdown.length === 0 ? (
                <div className="py-12 text-center text-zinc-400 text-xs">No referral traffic recorded.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 text-zinc-600 text-[10px] uppercase font-semibold border-b border-zinc-200">
                      <tr>
                        <th className="py-3 px-4">Referring Domain</th>
                        <th className="py-3 px-4">Full Referrer URL</th>
                        <th className="py-3 px-4 text-right">Subscribers</th>
                        <th className="py-3 px-4 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 font-medium">
                      {data.referralBreakdown.map((r) => (
                        <tr key={r.domain} className="hover:bg-zinc-50/70">
                          <td className="py-3 px-4 font-semibold text-zinc-900">{r.domain}</td>
                          <td className="py-3 px-4 text-zinc-500 font-mono text-[11px] truncate max-w-xs">{r.url}</td>
                          <td className="py-3 px-4 text-right text-zinc-800">{r.visitors}</td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-600">
                            ₹{r.revenue.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Direct / Unknown Investigation */}
          {activeTab === 'direct' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-2 shadow-xs">
                  <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">⚡ Genuine Direct</div>
                  <div className="text-2xl font-bold text-zinc-900">{data.directInvestigation.genuineDirect.count}</div>
                  <div className="text-xs text-emerald-600 font-semibold">
                    ₹{data.directInvestigation.genuineDirect.revenue.toLocaleString('en-IN')}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-2">
                    Visitors who entered celite.in directly or via bookmarks with zero known prior marketing touch.
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-blue-200 bg-blue-50/20 p-5 space-y-2 shadow-xs">
                  <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                    ⚡ Direct (Previously Attributed)
                  </div>
                  <div className="text-2xl font-bold text-blue-900">
                    {data.directInvestigation.previouslyAttributed.count}
                  </div>
                  <div className="text-xs text-emerald-600 font-semibold">
                    ₹{data.directInvestigation.previouslyAttributed.revenue.toLocaleString('en-IN')}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-2">
                    Direct conversions where the customer originally discovered Celite through a known campaign.
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-2 shadow-xs">
                  <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    ❓ Unknown / Referrer Missing
                  </div>
                  <div className="text-2xl font-bold text-zinc-900">
                    {data.directInvestigation.unknownMissingReferrer.count}
                  </div>
                  <div className="text-xs text-emerald-600 font-semibold">
                    ₹{data.directInvestigation.unknownMissingReferrer.revenue.toLocaleString('en-IN')}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-2">
                    Privacy-restricted browsers or untagged webviews without identifiable origin parameters.
                  </p>
                </div>
              </div>

              {/* Previously Attributed Origins Breakdown */}
              {Object.keys(data.directInvestigation.previouslyAttributed.origins).length > 0 && (
                <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-3 shadow-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                    Original Acquisition Sources of &quot;Direct&quot; Subscribers
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.entries(data.directInvestigation.previouslyAttributed.origins).map(([orig, count]) => (
                      <div key={orig} className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-center">
                        <div className="text-base font-bold text-zinc-900">{count}</div>
                        <div className="text-[11px] text-zinc-500 font-medium mt-0.5">{orig}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: Product Attribution */}
          {activeTab === 'products' && (
            <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4 shadow-xs">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">🎬 Product Discovery & Conversion Attribution</h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Comparison between the first product a customer viewed vs the product viewed immediately before subscribing.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 text-zinc-600 text-[10px] uppercase font-semibold border-b border-zinc-200">
                    <tr>
                      <th className="py-3 px-4">Product Slug</th>
                      <th className="py-3 px-4 text-right">First Seen Count</th>
                      <th className="py-3 px-4 text-right">Converting Touch Count</th>
                      <th className="py-3 px-4 text-right">Subscribers</th>
                      <th className="py-3 px-4 text-right">Revenue Generated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-medium">
                    {data.productBreakdown.map((p) => (
                      <tr key={p.product} className="hover:bg-zinc-50/70">
                        <td className="py-3 px-4 font-mono font-semibold text-blue-600">{p.product}</td>
                        <td className="py-3 px-4 text-right text-zinc-700">{p.firstTouchCount}</td>
                        <td className="py-3 px-4 text-right text-zinc-700">{p.lastTouchCount}</td>
                        <td className="py-3 px-4 text-right text-zinc-900 font-bold">{p.subscriptions}</td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600">
                          ₹{p.revenue.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: Data Quality */}
          {activeTab === 'dataQuality' && (
            <div className="bg-white rounded-2xl border border-zinc-200 p-6 space-y-5 shadow-xs">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">🛡️ Attribution Confidence & Data Quality</h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Zero-guessing policy ensures data accuracy without fabricating attribution.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-emerald-200 bg-emerald-50/40 rounded-2xl p-4 space-y-1">
                  <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">High Confidence</div>
                  <div className="text-2xl font-bold text-emerald-700">{data.confidenceBreakdown.high}</div>
                  <p className="text-[11px] text-emerald-900/70">
                    Verified UTM parameters, registered campaign IDs, or verified platform click IDs (gclid, fbclid).
                  </p>
                </div>

                <div className="border border-blue-200 bg-blue-50/40 rounded-2xl p-4 space-y-1">
                  <div className="text-xs font-bold text-blue-800 uppercase tracking-wider">Medium Confidence</div>
                  <div className="text-2xl font-bold text-blue-700">{data.confidenceBreakdown.medium}</div>
                  <p className="text-[11px] text-blue-900/70">
                    Identified via verified referring domain (e.g. YouTube, Instagram app referrer) without explicit campaign tags.
                  </p>
                </div>

                <div className="border border-amber-200 bg-amber-50/40 rounded-2xl p-4 space-y-1">
                  <div className="text-xs font-bold text-amber-800 uppercase tracking-wider">Low Confidence / Direct</div>
                  <div className="text-2xl font-bold text-amber-700">{data.confidenceBreakdown.low}</div>
                  <p className="text-[11px] text-amber-900/70">
                    Direct navigation, bookmarks, or missing referrer without campaign data.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
