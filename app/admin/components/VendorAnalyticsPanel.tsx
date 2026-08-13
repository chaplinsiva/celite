// agent-notes: { ctx: "Admin panel showing detailed creator analytics for pay-per and pool money", deps: ["lib/supabaseClient.ts", "lib/utils.ts"], state: active, last: "sato@2026-08-13" }

"use client";

import { useEffect, useState, useMemo } from 'react';
import { getSupabaseBrowserClient } from '../../../lib/supabaseClient';
import { cn } from '../../../lib/utils';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CreatorEarningRow {
  id: string;
  name: string;
  slug: string;
  user_id: string;
  official: {
    payPer: number;
    pool: number;
    gross: number;
    withdrawable: number;
  };
  dynamic: {
    payPer: number;
    pool: number;
    gross: number;
    withdrawable: number;
    downloadsCount: number;
    downloadsProportion: number;
  };
  payouts: {
    paid: number;
    pending: number;
    totalDeductions: number;
  };
}

interface PlatformSummary {
  totalSubscriptionRevenue: number;
  totalVendorPool: number;
  totalSubscriptionDownloads: number;
}

export default function VendorAnalyticsPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creators, setCreators] = useState<CreatorEarningRow[]>([]);
  const [platformSummary, setPlatformSummary] = useState<PlatformSummary | null>(null);
  const [ledgerMode, setLedgerMode] = useState<'dynamic' | 'official'>('dynamic');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCreatorAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError('Unauthorized session. Please log in.');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/admin/analytics/creators', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const json = await res.json();
      if (res.ok && json.ok) {
        setCreators(json.data.creators || []);
        setPlatformSummary(json.data.platformSummary || null);
      } else {
        setError(json.error || 'Failed to load creator analytics.');
      }
    } catch (e: any) {
      console.error('Error fetching creator analytics:', e);
      setError(e.message || 'Network error loading creator analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreatorAnalytics();
  }, []);

  // Filtered creators list
  const filteredCreators = useMemo(() => {
    return creators.filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [creators, searchTerm]);

  // Aggregated totals based on selected mode
  const totals = useMemo(() => {
    let payPer = 0;
    let pool = 0;
    let gross = 0;
    let paid = 0;
    let pending = 0;
    let withdrawable = 0;

    for (const c of creators) {
      const modeData = ledgerMode === 'official' ? c.official : c.dynamic;
      payPer += modeData.payPer;
      pool += modeData.pool;
      gross += modeData.gross;
      paid += c.payouts.paid;
      pending += c.payouts.pending;
      withdrawable += modeData.withdrawable;
    }

    return { payPer, pool, gross, paid, pending, withdrawable };
  }, [creators, ledgerMode]);

  // Recharts Chart Data: Top Creators by Gross Earnings
  const topCreatorsChartData = useMemo(() => {
    return [...creators]
      .map(c => {
        const modeData = ledgerMode === 'official' ? c.official : c.dynamic;
        return {
          name: c.name,
          'Pay-Per': modeData.payPer,
          'Subscription Pool': modeData.pool,
          Total: modeData.gross
        };
      })
      .sort((a, b) => b.Total - a.Total)
      .slice(0, 7);
  }, [creators, ledgerMode]);

  // Recharts Chart Data: Pay-Per vs Pool Split
  const pieChartData = useMemo(() => {
    return [
      { name: 'Pay-Per Money', value: totals.payPer, color: '#6366f1' }, // Indigo
      { name: 'Subscription Pool', value: totals.pool, color: '#a855f7' }  // Purple
    ];
  }, [totals]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-zinc-500 flex items-center gap-2">
          <svg className="animate-spin h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading Vendor Analytics...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
        <h3 className="font-semibold mb-1">Error</h3>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header with Search and Ledger Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">📊 Creator Earning & Revenue Analytics</h1>
          <p className="text-sm text-zinc-500">Holdings and payouts analytics broken down by Pay-Per-Asset and Subscription Pool splits.</p>
        </div>

        {/* Ledger Selector Toggle */}
        <div className="bg-zinc-100 p-1 rounded-xl flex items-center gap-1 self-start md:self-auto border border-zinc-200">
          <button
            onClick={() => setLedgerMode('dynamic')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all outline-none",
              ledgerMode === 'dynamic'
                ? "bg-white text-zinc-900 shadow-sm border border-zinc-200/50"
                : "text-zinc-600 hover:text-zinc-900"
            )}
          >
            🔄 Transaction Simulation
          </button>
          <button
            onClick={() => setLedgerMode('official')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all outline-none",
              ledgerMode === 'official'
                ? "bg-white text-zinc-900 shadow-sm border border-zinc-200/50"
                : "text-zinc-600 hover:text-zinc-900"
            )}
          >
            📋 Official Ledger
          </button>
        </div>
      </div>

      {/* Warning/Info Box for Modes */}
      {ledgerMode === 'dynamic' ? (
        <div className="bg-indigo-50 border border-indigo-100 text-indigo-900 px-4 py-3 rounded-xl text-sm flex gap-2.5 items-start">
          <span className="text-lg">💡</span>
          <div>
            <span className="font-semibold">Simulated Transaction Mode:</span> Calculating live earnings from paid marketplace order items (80% creator share) and subscription pool split (40% of subscription revenue, distributed proportionally to vendors based on active subscriber downloads). Use this mode for real-time tracking if the official ledger table hasn't been updated.
          </div>
        </div>
      ) : (
        <div className="bg-zinc-50 border border-zinc-200 text-zinc-700 px-4 py-3 rounded-xl text-sm flex gap-2.5 items-start">
          <span className="text-lg">📋</span>
          <div>
            <span className="font-semibold">Official Ledger Mode:</span> Displaying final, settled payouts from the database ledger table (<code className="bg-zinc-200 px-1 rounded">creator_earnings</code>). These figures reflect finalized platform settlements.
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Marketplace Earnings Card */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Pay-Per (Marketplace)</div>
            <div className="text-3xl font-extrabold text-indigo-600 mt-2">₹{totals.payPer.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-zinc-400 mt-1">Total accumulated creator share (80% of sales)</p>
          </div>
          <div className="border-t border-zinc-100 pt-3 mt-4 flex justify-between items-center text-xs text-zinc-500">
            <span>Celite Share (20%):</span>
            <span className="font-semibold">₹{(totals.payPer / 4).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Subscription Pool Card */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Subscription Pool Money</div>
            <div className="text-3xl font-extrabold text-purple-600 mt-2">₹{totals.pool.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-zinc-400 mt-1">Vendor Pool Allocation (40% of subscription revenue)</p>
          </div>
          <div className="border-t border-zinc-100 pt-3 mt-4 flex justify-between items-center text-xs text-zinc-500">
            <span>Total Sub Revenue:</span>
            <span className="font-semibold">₹{(platformSummary?.totalSubscriptionRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Holdings / Balances Card */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Withdrawable Balance</div>
            <div className="text-3xl font-extrabold text-emerald-600 mt-2">₹{totals.withdrawable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-zinc-400 mt-1">Gross earnings minus all deductions</p>
          </div>
          <div className="border-t border-zinc-100 pt-3 mt-4 grid grid-cols-2 gap-2 text-xs text-zinc-500">
            <div>Paid: <span className="font-semibold text-zinc-700">₹{totals.paid.toLocaleString('en-IN')}</span></div>
            <div>Pending: <span className="font-semibold text-amber-600">₹{totals.pending.toLocaleString('en-IN')}</span></div>
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Performing Creators (Bar Chart) */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm lg:col-span-2">
          <h3 className="font-bold text-zinc-800 mb-4">🏆 Top Performing Creators (Gross Earnings)</h3>
          <div className="h-[280px]">
            {topCreatorsChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCreatorsChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(val) => `₹${val}`} />
                  <Tooltip formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`} />
                  <Legend />
                  <Bar dataKey="Pay-Per" stackId="a" fill="#6366f1" />
                  <Bar dataKey="Subscription Pool" stackId="a" fill="#a855f7" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-400 text-sm">No data available</div>
            )}
          </div>
        </div>

        {/* Earning Split (Pie Chart) */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between">
          <h3 className="font-bold text-zinc-800 mb-4">💰 Earnings Allocation Split</h3>
          <div className="h-[200px] flex items-center justify-center">
            {totals.gross > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-zinc-400 text-sm">No earnings registered</div>
            )}
          </div>
          <div className="space-y-2 mt-4">
            {pieChartData.map((item, idx) => {
              const percentage = totals.gross > 0 ? (item.value / totals.gross) * 100 : 0;
              return (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 height-3 w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-zinc-600 font-medium">{item.name}</span>
                  </div>
                  <span className="font-semibold text-zinc-900">
                    ₹{item.value.toLocaleString('en-IN')} ({percentage.toFixed(1)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Vendor Ledger Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="font-bold text-zinc-800">📋 Vendor Ledger Details</h3>
          <div className="relative">
            <input
              type="text"
              placeholder="Search vendor shop..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 pl-9 pr-4 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-zinc-50"
            />
            <svg
              className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-600 border-collapse">
            <thead>
              <tr className="bg-zinc-50/75 border-b border-zinc-100 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                <th className="px-6 py-4">Shop Name</th>
                <th className="px-6 py-4">Pay-Per Earnings</th>
                <th className="px-6 py-4">Subscription Pool Earnings</th>
                <th className="px-6 py-4">Gross Earnings</th>
                <th className="px-6 py-4">Paid Payouts</th>
                <th className="px-6 py-4">Pending Payouts</th>
                <th className="px-6 py-4 text-right">Withdrawable Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredCreators.length > 0 ? (
                filteredCreators.map((c) => {
                  const modeData = ledgerMode === 'official' ? c.official : c.dynamic;
                  return (
                    <tr key={c.id} className="hover:bg-zinc-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-zinc-900">{c.name}</div>
                        <div className="text-xs text-zinc-400">slug: {c.slug}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-zinc-800">₹{modeData.payPer.toLocaleString('en-IN')}</div>
                        {ledgerMode === 'dynamic' && (
                          <div className="text-xs text-zinc-400">from paid marketplace items</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-zinc-800">₹{modeData.pool.toLocaleString('en-IN')}</div>
                        {ledgerMode === 'dynamic' && (
                          <div className="text-xs text-zinc-400">
                            {c.dynamic.downloadsCount} downloads ({c.dynamic.downloadsProportion}%)
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-indigo-600">₹{modeData.gross.toLocaleString('en-IN')}</div>
                      </td>
                      <td className="px-6 py-4 text-emerald-600 font-semibold">
                        ₹{c.payouts.paid.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4 text-amber-600 font-semibold">
                        ₹{c.payouts.pending.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={cn(
                          "inline-block px-3 py-1 rounded-full text-xs font-bold shadow-sm",
                          modeData.withdrawable > 0
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50"
                            : "bg-zinc-100 text-zinc-400 border border-zinc-200/50"
                        )}>
                          ₹{modeData.withdrawable.toLocaleString('en-IN')}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-zinc-400">
                    No vendor shops found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
