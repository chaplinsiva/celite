"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { getSupabaseBrowserClient } from '../../../lib/supabaseClient';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type Order = { id: string; user_id: string; created_at: string; total: number; status: string };
type OrderItem = { order_id: string; name: string; quantity: number; price: number };
type SubRow = {
  user_id: string;
  user_email: string | null;
  is_active: boolean;
  plan: string | null;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
  razorpay_subscription_id: string | null;
  autopay_enabled: boolean;
  is_actually_active: boolean;
  days_remaining: number | null;
};

type DownloadRow = {
  id: string;
  user_id: string;
  user_email: string | null;
  template_slug: string;
  template_name: string | null;
  subscription_id: string | null;
  subscription_plan: string | null;
  downloaded_at: string;
};

const COLORS = ['#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444'];

export default function AnalyticsPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [downloads, setDownloads] = useState<DownloadRow[]>([]);
  const [totals, setTotals] = useState<any>(null);
  const [pagination, setPagination] = useState<any>(null);
  const subscriptionChannelRef = useRef<any>(null);
  const [detailTab, setDetailTab] = useState<'subscriptions' | 'products'>('subscriptions');
  const [productRange, setProductRange] = useState<'7d' | '30d' | '90d' | '365d' | 'all'>('30d');
  const [subscriptionRange, setSubscriptionRange] = useState<'30d' | '90d' | '365d' | 'all'>('30d');

  // Filters
  const [planFilter, setPlanFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [autopayFilter, setAutopayFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Not signed in'); setLoading(false); return; }

      const params = new URLSearchParams();
      if (planFilter) params.set('plan', planFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (autopayFilter) params.set('autopay', autopayFilter);
      params.set('limit', itemsPerPage.toString());
      params.set('offset', ((currentPage - 1) * itemsPerPage).toString());

      const res = await fetch(`/api/admin/analytics?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || 'Failed to load analytics');
        setLoading(false);
        return;
      }
      setOrders(json.orders || []);
      setItems(json.order_items || []);
      setSubs(json.subscriptions || []);
      setDownloads(json.downloads || []);
      setTotals(json.totals);
      setPagination(json.pagination);
    } catch (e: any) {
      setError(e?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [planFilter, statusFilter, autopayFilter, currentPage, itemsPerPage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Set up real-time subscription updates (separate effect)
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel('subscriptions-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'subscriptions',
        },
        (payload) => {
          console.log('Subscription updated:', payload);
          // Reload data when subscription changes
          loadData();
        }
      )
      .subscribe();

    subscriptionChannelRef.current = channel;

    return () => {
      if (subscriptionChannelRef.current) {
        supabase.removeChannel(subscriptionChannelRef.current);
      }
    };
  }, [loadData]); // Include loadData in dependencies

  const handleFilterChange = (filterType: string, value: string) => {
    if (filterType === 'plan') setPlanFilter(value);
    else if (filterType === 'status') setStatusFilter(value);
    else if (filterType === 'autopay') setAutopayFilter(value);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const clearFilters = () => {
    setPlanFilter('');
    setStatusFilter('');
    setAutopayFilter('');
    setCurrentPage(1);
  };

  const hasActiveFilters = planFilter || statusFilter || autopayFilter;

  // Prepare chart data
  const planDistribution = [
    { name: 'Monthly', value: totals?.activeMonthly || 0, revenue: (totals?.activeMonthly || 0) * (totals?.monthlyPrice || 799) },
    { name: 'Yearly', value: totals?.activeYearly || 0, revenue: (totals?.activeYearly || 0) * (totals?.yearlyPrice || 5499) },
  ].filter(item => item.value > 0);

  const statusDistribution = [
    { name: 'Active', value: totals?.activeSubscribers || 0, color: '#10b981' },
    { name: 'Expired', value: totals?.expiredSubscribers || 0, color: '#f59e0b' },
    { name: 'Cancelled', value: totals?.cancelledSubscribers || 0, color: '#ef4444' },
  ].filter(item => item.value > 0);

  const autopayDistribution = [
    { name: 'Autopay Enabled', value: totals?.autopayEnabled || 0, color: '#10b981' },
    { name: 'Manual Renewal', value: totals?.autopayDisabled || 0, color: '#6b7280' },
  ].filter(item => item.value > 0);

  // Group subscriptions by creation date for trend chart
  const subscriptionTrends = subs.reduce((acc: any, sub: SubRow) => {
    const date = new Date(sub.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    if (!acc[date]) {
      acc[date] = { date, count: 0, active: 0 };
    }
    acc[date].count++;
    if (sub.is_actually_active) acc[date].active++;
    return acc;
  }, {});
  const trendData = Object.values(subscriptionTrends).sort((a: any, b: any) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const nowTs = Date.now();

  // Subscription analytics (time-filtered new subscribers and estimated revenue)
  const subscriptionRangeMs: Record<string, number> = {
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000,
    '365d': 365 * 24 * 60 * 60 * 1000,
    all: Number.POSITIVE_INFINITY,
  };

  const subscriptionStats = useMemo(() => {
    const maxMs = subscriptionRangeMs[subscriptionRange];
    const filtered = subs.filter((s) => {
      if (!s.created_at) return false;
      const created = new Date(s.created_at).getTime();
      return nowTs - created <= maxMs;
    });

    const monthlyPrice = totals?.monthlyPrice ?? 0;
    const yearlyPrice = totals?.yearlyPrice ?? 0;

    let estRevenue = 0;
    let monthly = 0;
    let yearly = 0;

    filtered.forEach((s) => {
      // Weekly subscriptions are treated as monthly (legacy support)
      if (s.plan === 'weekly' || s.plan === 'monthly') {
        monthly += 1;
        estRevenue += monthlyPrice;
      } else if (s.plan === 'yearly') {
        yearly += 1;
        estRevenue += yearlyPrice;
      }
    });

    return {
      count: filtered.length,
      weekly: 0, // No new weekly subscriptions
      monthly,
      yearly,
      estRevenue,
    };
  }, [subs, totals, subscriptionRange, subscriptionRangeMs, nowTs]);

  // Product download analytics by time range
  const productRangeMs: Record<string, number> = {
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000,
    '365d': 365 * 24 * 60 * 60 * 1000,
    all: Number.POSITIVE_INFINITY,
  };

  const topProducts = useMemo(() => {
    const maxMs = productRangeMs[productRange];
    const filtered = downloads.filter((d) => {
      if (!d.downloaded_at) return false;
      const ts = new Date(d.downloaded_at).getTime();
      return nowTs - ts <= maxMs;
    });

    const map: Record<
      string,
      { slug: string; name: string | null; downloads: number; userIds: Set<string> }
    > = {};

    filtered.forEach((d) => {
      if (!map[d.template_slug]) {
        map[d.template_slug] = {
          slug: d.template_slug,
          name: d.template_name,
          downloads: 0,
          userIds: new Set<string>(),
        };
      }
      const entry = map[d.template_slug];
      entry.downloads += 1;
      if (d.user_id) {
        entry.userIds.add(d.user_id);
      }
    });

    const arr = Object.values(map).map((p) => ({
      slug: p.slug,
      name: p.name || p.slug,
      downloads: p.downloads,
      uniqueUsers: p.userIds.size,
    }));

    arr.sort((a, b) => b.downloads - a.downloads);
    return arr.slice(0, 10);
  }, [downloads, productRange, productRangeMs, nowTs]);

  if (loading && !totals) return <div className="text-center py-8">Loading analytics…</div>;
  if (error && !totals) return <div className="text-sm text-red-300">{error}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-900">Analytics Dashboard</h2>
        <p className="text-sm text-zinc-500 mt-1">Comprehensive subscription and revenue analytics</p>
      </div>

      {/* Revenue Distribution Section */}
      {(totals?.totalSubscriptionRevenue !== undefined || totals?.vendorPoolAmount !== undefined || totals?.celiteAmount !== undefined) && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm mb-6">
          <h3 className="text-lg font-bold text-zinc-900 mb-4">Revenue Distribution</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-5">
              <div className="text-2xl font-bold text-zinc-900 mb-1">
                ₹{(totals?.totalSubscriptionRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Total Revenue Pool</div>
              <div className="text-[10px] text-zinc-400 mt-2">From active subscriptions</div>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-5">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                ₹{(totals?.vendorPoolAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs font-medium text-blue-600 uppercase tracking-wider">Vendor Pool</div>
              <div className="text-[10px] text-blue-500 mt-2">40% distributed to creators</div>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
              <div className="text-2xl font-bold text-emerald-600 mb-1">
                ₹{(totals?.celiteAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Celite Amount</div>
              <div className="text-[10px] text-emerald-500 mt-2">60% retained by Celite</div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="text-2xl font-bold text-zinc-900">₹{totals?.subscriptionRevenue?.toFixed(2) ?? '0.00'}</div>
          <div className="text-xs font-medium text-zinc-500 mt-1">Monthly Recurring Revenue (MRR)</div>
          <div className="text-xs text-zinc-400 mt-3">
            Monthly: {totals?.activeMonthly || 0} • Yearly: {totals?.activeYearly || 0}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="text-2xl font-bold text-green-600">{totals?.activeSubscribers ?? 0}</div>
          <div className="text-xs font-medium text-zinc-500 mt-1">Active Subscribers</div>
          <div className="text-xs text-zinc-400 mt-3">
            Expired: {totals?.expiredSubscribers || 0} • Cancelled: {totals?.cancelledSubscribers || 0}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="text-2xl font-bold text-zinc-900">{totals?.totalSubscriptions ?? 0}</div>
          <div className="text-xs font-medium text-zinc-500 mt-1">Total Subscriptions</div>
          <div className="text-xs text-zinc-400 mt-3">
            Autopay: {totals?.autopayEnabled || 0} • Manual: {totals?.autopayDisabled || 0}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="text-2xl font-bold text-zinc-900">₹{totals?.orderRevenue?.toFixed(2) ?? '0.00'}</div>
          <div className="text-xs font-medium text-zinc-500 mt-1">One-time Orders</div>
          <div className="text-xs text-zinc-400 mt-3">{totals?.orders || 0} orders</div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="text-2xl font-bold text-zinc-900">{totals?.totalDownloads ?? 0}</div>
          <div className="text-xs font-medium text-zinc-500 mt-1">Tracked Downloads</div>
          <div className="text-xs text-zinc-400 mt-3">
            Users: {totals?.uniqueDownloadUsers ?? 0} • Templates: {totals?.uniqueDownloadedTemplates ?? 0}
          </div>
        </div>
      </div>

      {/* Detailed Analytics Tabs */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100 p-1">
            <button
              onClick={() => setDetailTab('subscriptions')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all shadow-sm ${detailTab === 'subscriptions'
                ? 'bg-white text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/50 shadow-none'
                }`}
            >
              Subscription Analytics
            </button>
            <button
              onClick={() => setDetailTab('products')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all shadow-sm ${detailTab === 'products'
                ? 'bg-white text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/50 shadow-none'
                }`}
            >
              Product Downloads
            </button>
          </div>

          {detailTab === 'subscriptions' ? (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="font-medium">Range:</span>
              <select
                value={subscriptionRange}
                onChange={(e) => setSubscriptionRange(e.target.value as any)}
                className="px-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="365d">Last 365 days</option>
                <option value="all">All time</option>
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="font-medium">Range:</span>
              <select
                value={productRange}
                onChange={(e) => setProductRange(e.target.value as any)}
                className="px-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="365d">Last 365 days</option>
                <option value="all">All time</option>
              </select>
            </div>
          )}
        </div>

        {detailTab === 'subscriptions' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-xl font-bold text-zinc-900">{subscriptionStats.count}</div>
              <div className="text-[11px] font-medium text-zinc-500 mt-1">New Subscribers in Range</div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-xl font-bold text-zinc-900">
                {subscriptionStats.monthly} / {subscriptionStats.yearly}
              </div>
              <div className="text-[11px] font-medium text-zinc-500 mt-1">Monthly / Yearly (new)</div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-xl font-bold text-zinc-900">
                ₹{subscriptionStats.estRevenue.toFixed(2)}
              </div>
              <div className="text-[11px] font-medium text-zinc-500 mt-1">Estimated New Revenue in Range</div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-xl font-bold text-green-600">
                {totals?.activeSubscribers ?? 0}
              </div>
              <div className="text-[11px] font-medium text-zinc-500 mt-1">Current Active Subscribers</div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {topProducts.length === 0 ? (
              <p className="text-xs text-zinc-400 italic">No downloads in this range.</p>
            ) : (
              <>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <h4 className="text-xs font-semibold text-zinc-700 mb-4 uppercase tracking-wider">
                    Top Downloaded Templates (Bar Chart)
                  </h4>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={topProducts}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke="#71717a"
                        tick={{ fontSize: 10, fill: '#71717a' }}
                        interval={0}
                        angle={-35}
                        textAnchor="end"
                        height={70}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis stroke="#71717a" tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} axisLine={false} />
                      <Tooltip
                        cursor={{ fill: '#f4f4f5' }}
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e4e4e7',
                          borderRadius: 8,
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          color: '#18181b'
                        }}
                        labelStyle={{ color: '#18181b', fontWeight: 600, fontSize: 11, marginBottom: 4 }}
                      />
                      <Bar dataKey="downloads" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-zinc-700 mb-3 uppercase tracking-wider">Detailed List</h4>
                  <div className="overflow-x-auto rounded-xl border border-zinc-200 shadow-sm">
                    <table className="min-w-full text-xs">
                      <thead className="bg-zinc-50 text-left text-[11px] uppercase text-zinc-500 font-medium">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Template</th>
                          <th className="px-4 py-3 font-semibold">Downloads</th>
                          <th className="px-4 py-3 font-semibold">Unique Users</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 bg-white">
                        {topProducts.map((p) => (
                          <tr key={p.slug} className="hover:bg-zinc-50/50 transition-colors">
                            <td className="px-4 py-3 text-zinc-900 font-medium">
                              {p.name}
                            </td>
                            <td className="px-4 py-3 text-blue-600 font-semibold">
                              {p.downloads}
                            </td>
                            <td className="px-4 py-3 text-zinc-600">
                              {p.uniqueUsers}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan Distribution Pie Chart */}
        {planDistribution.length > 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-zinc-900 mb-6">Subscription Plans Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={planDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  stroke="#fff"
                  strokeWidth={2}
                >
                  {planDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e4e4e7', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', color: '#18181b' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-6 space-y-2 text-xs text-zinc-500 border-t border-zinc-100 pt-4">
              {planDistribution.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                    <span>{item.name}</span>
                  </div>
                  <span className="font-medium text-zinc-900">{item.value} subscribers (₹{item.revenue.toFixed(2)})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Distribution Bar Chart */}
        {statusDistribution.length > 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-zinc-900 mb-6">Subscription Status</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#71717a' }} />
                <YAxis stroke="#71717a" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#71717a' }} />
                <Tooltip
                  cursor={{ fill: '#f4f4f5' }}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e4e4e7', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', color: '#18181b' }}
                  labelStyle={{ color: '#18181b', fontWeight: 600, fontSize: 11 }}
                />
                <Bar dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={48}>
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Autopay Distribution */}
        {autopayDistribution.length > 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-zinc-900 mb-6">Autopay vs Manual Renewal</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={autopayDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  stroke="#fff"
                  strokeWidth={2}
                >
                  {autopayDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e4e4e7', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', color: '#18181b' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Subscription Trends */}
        {trendData.length > 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-zinc-900 mb-6">Subscription Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                <XAxis dataKey="date" stroke="#71717a" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#71717a' }} />
                <YAxis stroke="#71717a" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#71717a' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e4e4e7', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', color: '#18181b' }}
                  labelStyle={{ color: '#18181b', fontWeight: 600, fontSize: 11 }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: 10 }} />
                <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, strokeWidth: 0, fill: '#8b5cf6' }} activeDot={{ r: 6 }} name="Total Created" />
                <Line type="monotone" dataKey="active" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 0, fill: '#10b981' }} activeDot={{ r: 6 }} name="Active" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-zinc-600">Plan:</label>
            <select
              value={planFilter}
              onChange={(e) => handleFilterChange('plan', e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">All Plans</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-zinc-600">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-zinc-600">Autopay:</label>
            <select
              value={autopayFilter}
              onChange={(e) => handleFilterChange('autopay', e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">All</option>
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
            >
              Clear Filters
            </button>
          )}

          <div className="ml-auto text-xs text-zinc-500">
            Showing {subs.length} of {pagination?.total || 0} subscriptions
            {totals && <span className="ml-2 text-green-600 font-medium">• Real-time updates enabled</span>}
          </div>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div>
        <h3 className="text-lg font-bold text-zinc-900 mb-4">Subscriptions</h3>
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50/80 border-b border-zinc-100 text-left text-xs uppercase tracking-wider text-zinc-500 font-semibold">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Autopay</th>
                <th className="px-4 py-3">Valid Until</th>
                <th className="px-4 py-3">Days Left</th>
                <th className="px-4 py-3">Razorpay ID</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {subs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-zinc-500">
                    {loading ? 'Loading...' : 'No subscriptions found'}
                  </td>
                </tr>
              ) : (
                subs.map((s) => {
                  const isActive = s.is_actually_active;
                  const isExpired = s.is_active && s.valid_until && new Date(s.valid_until).getTime() <= Date.now();
                  const isCancelled = !s.is_active;

                  return (
                    <tr key={s.user_id + (s.updated_at || '')} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-zinc-500 text-xs">{s.user_id.slice(0, 8)}...</span>
                      </td>
                      <td className="px-4 py-3 text-zinc-900 text-xs font-medium">
                        {s.user_email || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-md text-xs font-semibold ${s.plan === 'yearly' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                            s.plan === 'monthly' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                              (s.plan === 'weekly' || s.plan === 'monthly') ? 'bg-green-50 text-green-700 border border-green-100' :
                                'bg-zinc-100 text-zinc-700 border border-zinc-200'
                          }`}>
                          {s.plan ? s.plan.charAt(0).toUpperCase() + s.plan.slice(1) : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isActive ? (
                          <span className="px-2 py-1 rounded-md text-xs font-semibold bg-green-50 text-green-700 border border-green-200">Active</span>
                        ) : isExpired ? (
                          <span className="px-2 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Expired</span>
                        ) : isCancelled ? (
                          <span className="px-2 py-1 rounded-md text-xs font-semibold bg-red-50 text-red-700 border border-red-200">Cancelled</span>
                        ) : (
                          <span className="px-2 py-1 rounded-md text-xs font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200">Inactive</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {s.autopay_enabled ? (
                          <span className="px-2 py-1 rounded-md text-xs font-semibold bg-green-50 text-green-700 border border-green-200">Yes</span>
                        ) : (
                          <span className="px-2 py-1 rounded-md text-xs font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 text-xs">
                        {s.valid_until ? new Date(s.valid_until).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {s.days_remaining !== null ? (
                          <span className={`text-xs font-semibold ${s.days_remaining > 7 ? 'text-green-600' :
                              s.days_remaining > 0 ? 'text-amber-600' :
                                'text-red-600'
                            }`}>
                            {s.days_remaining > 0 ? `${s.days_remaining}d` : 'Expired'}
                          </span>
                        ) : (
                          <span className="text-zinc-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {s.razorpay_subscription_id ? (
                          <span className="font-mono text-zinc-500 text-xs">{s.razorpay_subscription_id.slice(0, 12)}...</span>
                        ) : (
                          <span className="text-zinc-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">
                        {new Date(s.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">
                        {new Date(s.updated_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.total > itemsPerPage && (
          <div className="mt-4 flex items-center justify-between border-t border-zinc-200 pt-4">
            <div className="text-xs text-zinc-500 font-medium">
              Page {currentPage} of {Math.ceil(pagination.total / itemsPerPage)}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white shadow-sm"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={!pagination.hasMore || loading}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Recent Downloads (if tracked) */}
      {downloads.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-zinc-900 mb-4">Recent Downloads</h3>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50/80 border-b border-zinc-100 text-left text-xs uppercase tracking-wider text-zinc-500 font-semibold">
                <tr>
                  <th className="px-4 py-3">Template</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Downloaded At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {downloads.map((d) => (
                  <tr key={d.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-4 py-3 text-zinc-900 text-xs font-medium">
                      {d.template_name || d.template_slug}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 text-xs">
                      {d.user_email || d.user_id.slice(0, 8) + '...'}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 text-xs">
                      {d.subscription_plan
                        ? d.subscription_plan.charAt(0).toUpperCase() + d.subscription_plan.slice(1)
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
                      {new Date(d.downloaded_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Order History (if orders exist) */}
      {orders.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-bold text-zinc-900 mb-4">Order History</h3>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50/80 border-b border-zinc-100 text-left text-xs uppercase tracking-wider text-zinc-500 font-semibold">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {orders.map((o) => {
                  const list = items.filter((it) => it.order_id === o.id);
                  const label = list.map((l) => l.name).join(', ');
                  return (
                    <tr key={o.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-4 py-3 text-zinc-900 font-mono text-xs font-medium">{o.id.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-zinc-500 font-mono text-xs">{o.user_id.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-zinc-600 text-xs">{label || '-'}</td>
                      <td className="px-4 py-3 text-zinc-900 font-semibold">₹{Number(o.total).toFixed(2)}</td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">{new Date(o.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-md text-xs font-semibold ${o.status === 'paid' ? 'bg-green-50 text-green-700 border border-green-200' :
                            o.status === 'failed' ? 'bg-red-50 text-red-700 border border-red-200' :
                              'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                          {o.status}
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
    </div>
  );
}
