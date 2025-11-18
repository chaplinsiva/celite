"use client";

import { useEffect, useState, useRef } from 'react';
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

const COLORS = ['#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444'];

export default function AnalyticsPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [totals, setTotals] = useState<any>(null);
  const [pagination, setPagination] = useState<any>(null);
  const subscriptionChannelRef = useRef<any>(null);
  
  // Filters
  const [planFilter, setPlanFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [autopayFilter, setAutopayFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const loadData = async () => {
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
      setTotals(json.totals);
      setPagination(json.pagination);
    } catch (e: any) {
      setError(e?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [planFilter, statusFilter, autopayFilter, currentPage]);

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
  }, []); // Only run once on mount

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

  if (loading && !totals) return <div className="text-center py-8">Loading analytics…</div>;
  if (error && !totals) return <div className="text-sm text-red-300">{error}</div>;

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
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
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
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
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
