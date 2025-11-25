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
    { name: 'Weekly', value: totals?.activeWeekly || 0, revenue: (totals?.activeWeekly || 0) * (totals?.weeklyPrice || 199) },
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

    const weeklyPrice = totals?.weeklyPrice ?? 0;
    const monthlyPrice = totals?.monthlyPrice ?? 0;
    const yearlyPrice = totals?.yearlyPrice ?? 0;

    let estRevenue = 0;
    let weekly = 0;
    let monthly = 0;
    let yearly = 0;

    filtered.forEach((s) => {
      if (s.plan === 'weekly') {
        weekly += 1;
        estRevenue += weeklyPrice;
      } else if (s.plan === 'monthly') {
        monthly += 1;
        estRevenue += monthlyPrice;
      } else if (s.plan === 'yearly') {
        yearly += 1;
        estRevenue += yearlyPrice;
      }
    });

    return {
      count: filtered.length,
      weekly,
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
        <h2 className="text-xl font-semibold">Analytics Dashboard</h2>
        <p className="text-sm text-zinc-400 mt-1">Comprehensive subscription and revenue analytics</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <div className="text-2xl font-bold">₹{totals?.subscriptionRevenue?.toFixed(2) ?? '0.00'}</div>
          <div className="text-xs text-zinc-400 mt-1">Monthly Recurring Revenue (MRR)</div>
          <div className="text-xs text-zinc-500 mt-2">
            Weekly: {totals?.activeWeekly || 0} • Monthly: {totals?.activeMonthly || 0} • Yearly: {totals?.activeYearly || 0}
          </div>
        </div>
        
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <div className="text-2xl font-bold text-green-300">{totals?.activeSubscribers ?? 0}</div>
          <div className="text-xs text-zinc-400 mt-1">Active Subscribers</div>
          <div className="text-xs text-zinc-500 mt-2">
            Expired: {totals?.expiredSubscribers || 0} • Cancelled: {totals?.cancelledSubscribers || 0}
          </div>
        </div>
        
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <div className="text-2xl font-bold">{totals?.totalSubscriptions ?? 0}</div>
          <div className="text-xs text-zinc-400 mt-1">Total Subscriptions</div>
          <div className="text-xs text-zinc-500 mt-2">
            Autopay: {totals?.autopayEnabled || 0} • Manual: {totals?.autopayDisabled || 0}
          </div>
        </div>
        
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <div className="text-2xl font-bold">₹{totals?.orderRevenue?.toFixed(2) ?? '0.00'}</div>
          <div className="text-xs text-zinc-400 mt-1">One-time Orders</div>
          <div className="text-xs text-zinc-500 mt-2">{totals?.orders || 0} orders</div>
        </div>
        
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <div className="text-2xl font-bold">{totals?.totalDownloads ?? 0}</div>
          <div className="text-xs text-zinc-400 mt-1">Tracked Downloads</div>
          <div className="text-xs text-zinc-500 mt-2">
            Users: {totals?.uniqueDownloadUsers ?? 0} • Templates: {totals?.uniqueDownloadedTemplates ?? 0}
          </div>
        </div>
      </div>

      {/* Detailed Analytics Tabs */}
      <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="inline-flex rounded-full border border-white/10 bg-black/40 p-1">
            <button
              onClick={() => setDetailTab('subscriptions')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition ${
                detailTab === 'subscriptions'
                  ? 'bg-white text-black'
                  : 'text-zinc-300 hover:bg-white/10'
              }`}
            >
              Subscription Analytics
            </button>
            <button
              onClick={() => setDetailTab('products')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition ${
                detailTab === 'products'
                  ? 'bg-white text-black'
                  : 'text-zinc-300 hover:bg-white/10'
              }`}
            >
              Product Downloads
            </button>
          </div>

          {detailTab === 'subscriptions' ? (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span>Range:</span>
              <select
                value={subscriptionRange}
                onChange={(e) => setSubscriptionRange(e.target.value as any)}
                className="px-2 py-1 rounded-lg bg-black/60 border border-white/10 text-xs text-white"
              >
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="365d">Last 365 days</option>
                <option value="all">All time</option>
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span>Range:</span>
              <select
                value={productRange}
                onChange={(e) => setProductRange(e.target.value as any)}
                className="px-2 py-1 rounded-lg bg-black/60 border border-white/10 text-xs text-white"
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
            <div className="rounded-xl border border-white/10 bg-black/60 p-3">
              <div className="text-lg font-bold text-white">{subscriptionStats.count}</div>
              <div className="text-[11px] text-zinc-400 mt-1">New Subscribers in Range</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/60 p-3">
              <div className="text-lg font-bold text-white">
                {subscriptionStats.weekly} / {subscriptionStats.monthly} / {subscriptionStats.yearly}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">Weekly / Monthly / Yearly (new)</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/60 p-3">
              <div className="text-lg font-bold text-white">
                ₹{subscriptionStats.estRevenue.toFixed(2)}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">Estimated New Revenue in Range</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/60 p-3">
              <div className="text-lg font-bold text-green-300">
                {totals?.activeSubscribers ?? 0}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">Current Active Subscribers</div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {topProducts.length === 0 ? (
              <p className="text-xs text-zinc-400">No downloads in this range.</p>
            ) : (
              <>
                <p className="text-xs text-zinc-400">
                  Top downloaded templates in the selected range.
                </p>
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="min-w-full text-xs">
                    <thead className="bg-white/5 text-left text-[11px] uppercase text-zinc-400">
                      <tr>
                        <th className="px-3 py-2">Template</th>
                        <th className="px-3 py-2">Downloads</th>
                        <th className="px-3 py-2">Unique Users</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProducts.map((p) => (
                        <tr key={p.slug} className="border-t border-white/10">
                          <td className="px-3 py-2 text-zinc-200">
                            {p.name}
                          </td>
                          <td className="px-3 py-2 text-white font-semibold">
                            {p.downloads}
                          </td>
                          <td className="px-3 py-2 text-zinc-200">
                            {p.uniqueUsers}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-semibold text-white mb-4">Subscription Plans Distribution</h3>
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
                >
                  {planDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-1 text-xs text-zinc-400">
              {planDistribution.map((item, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{item.name}:</span>
                  <span className="text-white">{item.value} subscribers (₹{item.revenue.toFixed(2)})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Distribution Bar Chart */}
        {statusDistribution.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-semibold text-white mb-4">Subscription Status</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]}>
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
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-semibold text-white mb-4">Autopay vs Manual Renewal</h3>
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
                >
                  {autopayDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Subscription Trends */}
        {trendData.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-semibold text-white mb-4">Subscription Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="date" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} name="Total Created" />
                <Line type="monotone" dataKey="active" stroke="#10b981" strokeWidth={2} name="Active" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-400">Plan:</label>
            <select
              value={planFilter}
              onChange={(e) => handleFilterChange('plan', e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-sm text-white"
            >
              <option value="">All Plans</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-400">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-sm text-white"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-400">Autopay:</label>
            <select
              value={autopayFilter}
              onChange={(e) => handleFilterChange('autopay', e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-sm text-white"
            >
              <option value="">All</option>
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </div>
          
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 rounded-lg border border-white/20 text-sm text-white hover:bg-white/10"
            >
              Clear Filters
            </button>
          )}
          
          <div className="ml-auto text-xs text-zinc-400">
            Showing {subs.length} of {pagination?.total || 0} subscriptions
            {totals && <span className="ml-2 text-green-300">• Real-time updates enabled</span>}
          </div>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Subscriptions</h3>
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase text-zinc-400">
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
            <tbody>
              {subs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-zinc-400">
                    {loading ? 'Loading...' : 'No subscriptions found'}
                  </td>
                </tr>
              ) : (
                subs.map((s) => {
                  const isActive = s.is_actually_active;
                  const isExpired = s.is_active && s.valid_until && new Date(s.valid_until).getTime() <= Date.now();
                  const isCancelled = !s.is_active;
                  
                  return (
                    <tr key={s.user_id + (s.updated_at || '')} className="border-t border-white/10 hover:bg-white/5">
                      <td className="px-4 py-3">
                        <span className="font-mono text-white text-xs">{s.user_id.slice(0, 8)}...</span>
                      </td>
                      <td className="px-4 py-3 text-zinc-300 text-xs">
                        {s.user_email || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          s.plan === 'yearly' ? 'bg-purple-500/20 text-purple-300' :
                          s.plan === 'monthly' ? 'bg-blue-500/20 text-blue-300' :
                          s.plan === 'weekly' ? 'bg-green-500/20 text-green-300' :
                          'bg-zinc-500/20 text-zinc-300'
                        }`}>
                          {s.plan ? s.plan.charAt(0).toUpperCase() + s.plan.slice(1) : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isActive ? (
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-green-500/20 text-green-300">Active</span>
                        ) : isExpired ? (
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-yellow-500/20 text-yellow-300">Expired</span>
                        ) : isCancelled ? (
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-red-500/20 text-red-300">Cancelled</span>
                        ) : (
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-zinc-500/20 text-zinc-300">Inactive</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {s.autopay_enabled ? (
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-green-500/20 text-green-300">Yes</span>
                        ) : (
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-zinc-500/20 text-zinc-300">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-300 text-xs">
                        {s.valid_until ? new Date(s.valid_until).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {s.days_remaining !== null ? (
                          <span className={`text-xs font-semibold ${
                            s.days_remaining > 7 ? 'text-green-300' :
                            s.days_remaining > 0 ? 'text-yellow-300' :
                            'text-red-300'
                          }`}>
                            {s.days_remaining > 0 ? `${s.days_remaining}d` : 'Expired'}
                          </span>
                        ) : (
                          <span className="text-zinc-500 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {s.razorpay_subscription_id ? (
                          <span className="font-mono text-zinc-400 text-xs">{s.razorpay_subscription_id.slice(0, 12)}...</span>
                        ) : (
                          <span className="text-zinc-500 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">
                        {new Date(s.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">
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
          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-zinc-400">
              Page {currentPage} of {Math.ceil(pagination.total / itemsPerPage)}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
                className="px-3 py-1.5 rounded-lg border border-white/20 text-sm text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={!pagination.hasMore || loading}
                className="px-3 py-1.5 rounded-lg border border-white/20 text-sm text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
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
          <h3 className="text-lg font-semibold mb-3">Recent Downloads</h3>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Template</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Downloaded At</th>
                </tr>
              </thead>
              <tbody>
                {downloads.map((d) => (
                  <tr key={d.id} className="border-t border-white/10">
                    <td className="px-4 py-3 text-zinc-200 text-xs">
                      {d.template_name || d.template_slug}
                    </td>
                    <td className="px-4 py-3 text-zinc-300 text-xs">
                      {d.user_email || d.user_id.slice(0, 8) + '...'}
                    </td>
                    <td className="px-4 py-3 text-zinc-300 text-xs">
                      {d.subscription_plan
                        ? d.subscription_plan.charAt(0).toUpperCase() + d.subscription_plan.slice(1)
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">
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
        <div>
          <h3 className="text-lg font-semibold mb-3">Order History</h3>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
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
                const label = list.map((l) => l.name).join(', ');
                return (
                  <tr key={o.id} className="border-t border-white/10">
                      <td className="px-4 py-3 text-white font-mono text-xs">{o.id.slice(0,8)}</td>
                      <td className="px-4 py-3 text-zinc-300 font-mono text-xs">{o.user_id.slice(0,8)}</td>
                      <td className="px-4 py-3 text-zinc-300 text-xs">{label || '-'}</td>
                      <td className="px-4 py-3 text-zinc-300">₹{Number(o.total).toFixed(2)}</td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">{new Date(o.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          o.status === 'paid' ? 'bg-green-500/20 text-green-300' :
                          o.status === 'failed' ? 'bg-red-500/20 text-red-300' :
                          'bg-yellow-500/20 text-yellow-300'
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
