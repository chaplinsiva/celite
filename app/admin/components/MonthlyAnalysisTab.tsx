// agent-notes: { ctx: "Monthly Analysis UI component with twin received vs expected metrics and subscription activity", deps: ["app/api/admin/analytics/monthly/route.ts", "lib/supabaseClient.ts"], state: active, last: "sato@2026-08-13" }
"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import { getSupabaseBrowserClient } from '../../../lib/supabaseClient';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';

type MonthSummary = {
  monthKey: string;
  monthLabel: string;
  // Received Actual Cash
  totalRevenue: number;
  autopayRevenue: number;
  manualRevenue: number;
  monthlySubRevenue: number;
  yearlySubRevenue: number;
  ordersRevenue: number;
  vendorPool: number;
  celiteShare: number;
  monthlySubCount: number;
  yearlySubCount: number;
  autopaySubscribers: number;
  manualSubscribers: number;
  completedCheckouts: number;
  // Expected Potential
  expectedTotalRevenue: number;
  expectedAutopayRevenue: number;
  expectedManualRevenue: number;
  expectedMonthlyRevenue: number;
  expectedYearlyRevenue: number;
  expectedVendorPool: number;
  expectedCeliteShare: number;
  expectedMonthlySubCount: number;
  expectedYearlySubCount: number;
  expectedAutopaySubscribers: number;
  expectedManualSubscribers: number;
  activeSubscribers: number;
  pendingCollection: number;
  collectionPct: number;
  // Created & Updated Activity
  createdSubscribers: number;
  updatedSubscribers: number;
  createdMonthlyCount: number;
  createdYearlyCount: number;
  updatedMonthlyCount: number;
  updatedYearlyCount: number;
  // Upcoming Auto-Pay Prediction
  upcomingAutopayCount: number;
  upcomingAutopayRevenue: number;
  upcomingManualCount: number;
  upcomingManualRevenue: number;
  momGrowthPct: number;
  momAutopayGrowthPct: number;
};

type AutopayLogItem = {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_phone: string;
  plan: string;
  amount: number;
  razorpay_subscription_id: string | null;
  razorpay_payment_id: string | null;
  status: string;
  date: string;
  is_checkout: boolean;
};

type MonthOption = {
  key: string;
  label: string;
};

export default function MonthlyAnalysisTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [monthData, setMonthData] = useState<MonthSummary | null>(null);
  const [autopayPct, setAutopayPct] = useState<number>(0);
  const [monthlySeries, setMonthlySeries] = useState<MonthSummary[]>([]);
  const [autopayLog, setAutopayLog] = useState<AutopayLogItem[]>([]);
  const [availableMonths, setAvailableMonths] = useState<MonthOption[]>([]);
  const [viewMode, setViewMode] = useState<'received' | 'expected' | 'combined'>('received');

  // Filters for Auto-Pay Log
  const [logSearch, setLogSearch] = useState('');
  const [logStatusFilter, setLogStatusFilter] = useState<string>('all');
  const [logPage, setLogPage] = useState(1);
  const logsPerPage = 15;

  const loadData = useCallback(async (targetMonth?: string) => {
    try {
      setLoading(true);
      setError(null);
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Not signed in'); setLoading(false); return; }

      const params = new URLSearchParams();
      if (targetMonth) params.set('month', targetMonth);

      const res = await fetch(`/api/admin/analytics/monthly?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || 'Failed to load monthly analysis');
        setLoading(false);
        return;
      }

      setMonthData(json.selectedMonth);
      setAutopayPct(json.autopayPercentage);
      setMonthlySeries(json.monthlySeries || []);
      setAutopayLog(json.autopayLog || []);
      setAvailableMonths(json.availableMonths || []);
      if (!targetMonth && json.selectedMonth) {
        setSelectedMonth(json.selectedMonth.monthKey);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load monthly analysis');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleMonthChange = (monthKey: string) => {
    setSelectedMonth(monthKey);
    loadData(monthKey);
  };

  // Filtered Auto-Pay Log entries
  const filteredLog = useMemo(() => {
    let list = [...autopayLog];

    if (logStatusFilter !== 'all') {
      list = list.filter(item => item.status.toLowerCase() === logStatusFilter.toLowerCase());
    }

    if (logSearch.trim()) {
      const q = logSearch.toLowerCase();
      list = list.filter(item =>
        item.user_name.toLowerCase().includes(q) ||
        item.user_email.toLowerCase().includes(q) ||
        item.user_phone.includes(q) ||
        (item.razorpay_subscription_id || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [autopayLog, logStatusFilter, logSearch]);

  const totalLogPages = Math.ceil(filteredLog.length / logsPerPage);
  const paginatedLog = filteredLog.slice((logPage - 1) * logsPerPage, logPage * logsPerPage);

  if (loading && !monthData) {
    return <div className="text-center py-12 text-zinc-500 font-medium animate-pulse">Loading Monthly Analysis…</div>;
  }

  if (error && !monthData) {
    return <div className="text-center py-12 text-red-500 font-medium">{error}</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header & Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-zinc-900 via-zinc-800 to-blue-950 p-6 rounded-2xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 backdrop-blur-sm uppercase tracking-wider">
              Supabase Verified
            </span>
            <span className="text-xs text-zinc-400 font-mono">LIVE FINANCIAL METRICS</span>
          </div>
          <h2 className="text-2xl font-bold mt-2 tracking-tight">Monthly Financial & Subscription Analysis</h2>
          <p className="text-xs text-zinc-300 mt-1 max-w-xl">
            Compare actual <strong>Received Cash</strong> vs <strong>Expected Revenue (MRR)</strong>, created & updated subscriptions, auto-pay transactions, and 40/60 pool splits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">Select Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400 backdrop-blur-md transition-all cursor-pointer shadow-lg"
            >
              {availableMonths.map((m) => (
                <option key={m.key} value={m.key} className="bg-zinc-900 text-white">
                  {m.label} {m.key === availableMonths[0]?.key ? '(Current Month)' : ''}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => loadData(selectedMonth)}
            className="mt-5 p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center active:scale-95"
            title="Refresh Data"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* View Mode Switcher Toggle */}
      <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-zinc-200 shadow-sm flex-wrap gap-2">
        <div className="text-xs font-bold text-zinc-700 uppercase tracking-wider px-3">
          Analysis View Mode:
        </div>
        <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100 p-1">
          <button
            onClick={() => setViewMode('received')}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
              viewMode === 'received' ? 'bg-emerald-600 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            💵 Received Cash (Completed)
          </button>
          <button
            onClick={() => setViewMode('expected')}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
              viewMode === 'expected' ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            📈 Expected Potential (MRR)
          </button>
          <button
            onClick={() => setViewMode('combined')}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
              viewMode === 'combined' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            ⚖️ Side-by-Side Comparison
          </button>
        </div>
      </div>

      {/* Selected Month Key Metrics Cards */}
      {monthData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Revenue (Received / Expected) */}
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              <span>{viewMode === 'expected' ? 'Expected Revenue (MRR)' : 'This Month Received'}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {monthData.collectionPct}% Collected
              </span>
            </div>
            <div className="text-3xl font-extrabold text-zinc-900 mt-2 tracking-tight">
              ₹{viewMode === 'expected'
                ? monthData.expectedTotalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })
                : monthData.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-zinc-500 font-medium mt-2 flex items-center gap-1.5 flex-wrap">
              {viewMode === 'received' ? (
                <>
                  <span>Monthly: {monthData.monthlySubCount} (₹{monthData.monthlySubRevenue.toLocaleString('en-IN')})</span>
                  <span>•</span>
                  <span>Yearly: {monthData.yearlySubCount} (₹{monthData.yearlySubRevenue.toLocaleString('en-IN')})</span>
                </>
              ) : (
                <>
                  <span>Expected: ₹{monthData.expectedTotalRevenue.toLocaleString('en-IN')}</span>
                  <span>•</span>
                  <span>Received: ₹{monthData.totalRevenue.toLocaleString('en-IN')}</span>
                </>
              )}
            </div>
          </div>

          {/* Card 2: Auto-Pay Revenue */}
          <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 p-6 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between text-xs font-semibold text-blue-600 uppercase tracking-wider">
              <span>Auto-Pay Revenue</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                {autopayPct}% Adoption
              </span>
            </div>
            <div className="text-3xl font-extrabold text-blue-600 mt-2 tracking-tight">
              ₹{viewMode === 'expected'
                ? monthData.expectedAutopayRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })
                : monthData.autopayRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-blue-500/80 mt-2 flex items-center justify-between">
              <span>
                {viewMode === 'expected'
                  ? `${monthData.expectedAutopaySubscribers} Active Auto-Pay Subs`
                  : `${monthData.autopaySubscribers} Payments Received`}
              </span>
              <span className="font-semibold">{monthData.momAutopayGrowthPct >= 0 ? `+${monthData.momAutopayGrowthPct}%` : `${monthData.momAutopayGrowthPct}%`}</span>
            </div>
          </div>

          {/* Card 3: Subscription Activity & Upcoming Auto-Pay */}
          <div className="rounded-2xl border border-purple-200/80 bg-purple-50/30 p-6 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between text-xs font-semibold text-purple-600 uppercase tracking-wider">
              <span>Subscription Activity</span>
              <span className="text-[10px] font-medium text-purple-400">{monthData.monthLabel}</span>
            </div>
            <div className="text-2xl font-extrabold text-purple-700 mt-2 tracking-tight">
              {monthData.createdSubscribers} New + {monthData.updatedSubscribers} Renewed
            </div>
            <div className="text-xs text-purple-600 font-medium mt-2 space-y-1">
              <div className="flex items-center gap-1.5">
                <span>Created: {monthData.createdMonthlyCount} Monthly, {monthData.createdYearlyCount} Yearly</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>Renewed: {monthData.updatedMonthlyCount} Monthly, {monthData.updatedYearlyCount} Yearly</span>
              </div>
              {(monthData.upcomingAutopayCount > 0 || monthData.upcomingManualCount > 0) && (
                <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
                  <div className="text-[10px] font-bold text-amber-800 uppercase">⏳ Upcoming This Month</div>
                  <div className="text-xs text-amber-700 font-semibold">
                    {monthData.upcomingAutopayCount} Auto-Pay (₹{(monthData.upcomingAutopayRevenue || 0).toLocaleString('en-IN')}) • {monthData.upcomingManualCount} Manual (₹{(monthData.upcomingManualRevenue || 0).toLocaleString('en-IN')})
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 4: 40/60 Split */}
          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/30 p-6 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-600 uppercase tracking-wider">
              <span>40/60 Revenue Split</span>
              <span className="text-[10px] font-medium text-emerald-500">{viewMode.toUpperCase()}</span>
            </div>
            <div className="text-lg font-bold text-zinc-900 mt-2">
              Vendor (40%): <span className="text-purple-700">₹{(viewMode === 'expected' ? monthData.expectedVendorPool : monthData.vendorPool).toLocaleString('en-IN')}</span>
            </div>
            <div className="text-lg font-bold text-zinc-900 mt-1">
              Celite (60%): <span className="text-emerald-700">₹{(viewMode === 'expected' ? monthData.expectedCeliteShare : monthData.celiteShare).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Breakdown comparison section */}
      {monthData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Detailed Breakdown */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-4">
              {viewMode === 'expected' ? 'Expected Revenue Potential' : 'Received Revenue Breakdown'} ({monthData.monthLabel})
            </h3>
            <div className="space-y-3">
              {/* Monthly Subscriptions */}
              <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-blue-900 uppercase">Monthly Subscriptions</div>
                  <div className="text-base font-bold text-blue-700">
                    ₹{(viewMode === 'expected' ? monthData.expectedMonthlyRevenue : monthData.monthlySubRevenue).toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-blue-600">
                    {viewMode === 'expected' ? `${monthData.expectedMonthlySubCount} Active` : `${monthData.monthlySubCount} Received`}
                  </div>
                  <div className="text-[10px] text-blue-500">Plan: ₹799/mo</div>
                </div>
              </div>

              {/* Yearly Subscriptions */}
              <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-purple-900 uppercase">Yearly Subscriptions</div>
                  <div className="text-base font-bold text-purple-700">
                    ₹{(viewMode === 'expected' ? monthData.expectedYearlyRevenue : monthData.yearlySubRevenue).toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-purple-600">
                    {viewMode === 'expected' ? `${monthData.expectedYearlySubCount} Active` : `${monthData.yearlySubCount} Received`}
                  </div>
                  <div className="text-[10px] text-purple-500">Plan: ₹5,499/yr</div>
                </div>
              </div>

              {/* Auto-Pay */}
              <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-emerald-900 uppercase">Auto-Pay Total</div>
                  <div className="text-base font-bold text-emerald-700">
                    ₹{(viewMode === 'expected' ? monthData.expectedAutopayRevenue : monthData.autopayRevenue).toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-emerald-600">
                    {viewMode === 'expected' ? `${monthData.expectedAutopaySubscribers} Active Auto-Pay` : `${monthData.autopaySubscribers} Auto Payments`}
                  </div>
                  <div className="text-[10px] text-emerald-500">{autopayPct}% Platform Adoption</div>
                </div>
              </div>

              {/* Manual */}
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-zinc-800 uppercase">Manual Total</div>
                  <div className="text-base font-bold text-zinc-900">
                    ₹{(viewMode === 'expected' ? monthData.expectedManualRevenue : monthData.manualRevenue).toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-zinc-600">
                    {viewMode === 'expected' ? `${monthData.expectedManualSubscribers} Active Manual` : `${monthData.manualSubscribers} Manual Payments`}
                  </div>
                  <div className="text-[10px] text-zinc-400">Direct Renewals</div>
                </div>
              </div>
            </div>
          </div>

          {/* 12-Month Revenue & Auto-Pay Trend Chart */}
          <div className="lg:col-span-2 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
                  12-Month Revenue & Auto-Pay Trend
                </h3>
                <p className="text-xs text-zinc-400">Comparing total received revenue vs auto-pay revenue</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-blue-600 inline-block"></span>
                  <span className="text-zinc-600 font-medium">Received Rev</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                  <span className="text-zinc-600 font-medium">Auto-Pay Rev</span>
                </div>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlySeries}>
                  <defs>
                    <linearGradient id="totalRevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="autopayRevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                  <XAxis dataKey="monthLabel" stroke="#9ca3af" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e4e4e7', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                  />
                  <Area type="monotone" dataKey="totalRevenue" name="Received Revenue" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#totalRevGrad)" />
                  <Area type="monotone" dataKey="autopayRevenue" name="Auto-Pay Revenue" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#autopayRevGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Pay Activity Section ("Auto-Pay Did") */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-zinc-900">
              Auto-Pay Activity Log ({monthData?.monthLabel || 'Selected Month'})
            </h3>
            <p className="text-xs text-zinc-500">
              Detailed record of automated renewals and active auto-pay subscriptions processed in this month
            </p>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={logStatusFilter}
              onChange={(e) => { setLogStatusFilter(e.target.value); setLogPage(1); }}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="active">Active</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <div className="relative">
              <input
                type="text"
                placeholder="Search name, email, phone..."
                value={logSearch}
                onChange={(e) => { setLogSearch(e.target.value); setLogPage(1); }}
                className="pl-8 pr-3 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-48 sm:w-64"
              />
              <svg className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Auto-Pay Log Table */}
        <div className="overflow-x-auto rounded-xl border border-zinc-200">
          <table className="w-full text-xs text-left">
            <thead className="bg-zinc-50 text-[10px] uppercase font-bold text-zinc-500 border-b border-zinc-200">
              <tr>
                <th className="px-4 py-3">Subscriber</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Razorpay Sub ID</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white font-medium">
              {paginatedLog.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-400 italic">
                    No auto-pay transactions recorded for this month.
                  </td>
                </tr>
              ) : (
                paginatedLog.map((item) => {
                  const phoneClean = (item.user_phone || '').replace(/[^0-9]/g, '');
                  const waMsg = encodeURIComponent(`Hi ${item.user_name}, thank you for keeping your auto-pay subscription active on Celite! If you have any questions, let us know.`);
                  const waUrl = phoneClean ? `https://wa.me/${phoneClean}?text=${waMsg}` : `https://wa.me/?text=${waMsg}`;
                  const emUrl = item.user_email ? `mailto:${item.user_email}?subject=Celite%20Subscription&body=Hi%20${encodeURIComponent(item.user_name)}` : '';

                  return (
                    <tr key={item.id} className="hover:bg-zinc-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-zinc-900">{item.user_name}</div>
                        <div className="text-[10px] text-zinc-400 truncate max-w-[180px]">{item.user_email}</div>
                        {item.user_phone && <div className="text-[10px] text-zinc-400">{item.user_phone}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.plan === 'yearly' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {item.plan.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-zinc-900">
                        ₹{item.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-zinc-500">
                        {item.razorpay_subscription_id ? item.razorpay_subscription_id.slice(0, 18) : 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'completed' || item.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {item.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-[10px]">
                        {new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-md hover:bg-emerald-50 text-zinc-400 hover:text-emerald-600 transition-colors"
                            title="Contact via WhatsApp"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                            </svg>
                          </a>
                          {emUrl && (
                            <a
                              href={emUrl}
                              className="p-1 rounded-md hover:bg-blue-50 text-zinc-400 hover:text-blue-600 transition-colors"
                              title="Send Email"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Auto-Pay Log Pagination */}
        {totalLogPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-zinc-400">
              Showing {(logPage - 1) * logsPerPage + 1}–{Math.min(logPage * logsPerPage, filteredLog.length)} of {filteredLog.length} items
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLogPage(p => Math.max(1, p - 1))}
                disabled={logPage === 1}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-50"
              >
                Previous
              </button>
              <span className="text-xs font-semibold text-zinc-600">Page {logPage} of {totalLogPages}</span>
              <button
                onClick={() => setLogPage(p => Math.min(totalLogPages, p + 1))}
                disabled={logPage === totalLogPages}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 12-Month Historical Data Table */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold text-zinc-900">Historical Monthly Performance (Past 12 Months)</h3>
          <p className="text-xs text-zinc-500">Comprehensive month-by-month financial summary (Received Cash vs Expected Potential)</p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-zinc-200">
          <table className="w-full text-xs text-left">
            <thead className="bg-zinc-50 text-[10px] uppercase font-bold text-zinc-500 border-b border-zinc-200">
              <tr>
                <th className="px-4 py-3">Month</th>
                <th className="px-4 py-3">Received Cash</th>
                <th className="px-4 py-3">Expected (MRR)</th>
                <th className="px-4 py-3">Auto-Pay Received</th>
                <th className="px-4 py-3">Vendor Pool (40%)</th>
                <th className="px-4 py-3">Celite Share (60%)</th>
                <th className="px-4 py-3">Active Subs</th>
                <th className="px-4 py-3 text-right">MoM Growth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white font-medium">
              {[...monthlySeries].reverse().map((row) => (
                <tr
                  key={row.monthKey}
                  onClick={() => handleMonthChange(row.monthKey)}
                  className={`cursor-pointer transition-colors ${
                    row.monthKey === selectedMonth ? 'bg-blue-50/80 hover:bg-blue-50' : 'hover:bg-zinc-50/70'
                  }`}
                >
                  <td className="px-4 py-3 font-bold text-zinc-900 flex items-center gap-2">
                    <span>{row.monthLabel}</span>
                    {row.monthKey === selectedMonth && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-blue-600 text-white rounded">SELECTED</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-bold text-zinc-900">
                    ₹{row.totalRevenue.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 font-semibold text-blue-600">
                    ₹{row.expectedTotalRevenue.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 font-semibold text-emerald-600">
                    ₹{row.autopayRevenue.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 font-medium text-purple-700">
                    ₹{row.vendorPool.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 font-medium text-emerald-700">
                    ₹{row.celiteShare.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-zinc-700 font-semibold">
                    {row.activeSubscribers} active ({row.autopaySubscribers} auto)
                  </td>
                  <td className="px-4 py-3 text-right font-bold">
                    <span className={`px-2 py-0.5 rounded text-[10px] ${
                      row.momGrowthPct >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {row.momGrowthPct >= 0 ? `+${row.momGrowthPct}%` : `${row.momGrowthPct}%`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
