"use client";

import { useEffect, useState, ReactNode } from "react";

type GroupStatus = { total: number; free: number; isFree: boolean };

export default function OverviewPanel({ stats, onSeed, onUpload }: {
  stats: { 
    templates: number; 
    orders: number; 
    revenue: number;
    totalSubscriptionRevenue?: number;
    vendorPoolAmount?: number;
    celiteAmount?: number;
  } | null;
  onSeed: () => Promise<void> | void;
  onUpload: () => Promise<void> | void;
}) {
  const [toggleStates, setToggleStates] = useState<{
    sfx: GroupStatus | null;
    music: GroupStatus | null;
    low_selling: GroupStatus | null;
  }>({ sfx: null, music: null, low_selling: null });
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    fetchToggleStates();
  }, []);

  const fetchToggleStates = async () => {
    try {
      const res = await fetch('/api/admin/bulk-toggle-free');
      const json = await res.json();
      if (json.ok) {
        setToggleStates({
          sfx: json.sfx,
          music: json.music,
          low_selling: json.low_selling,
        });
      }
    } catch (e) {
      console.error('Failed to fetch toggle states:', e);
    }
  };

  const handleToggle = async (group: 'sfx' | 'music' | 'low_selling') => {
    const current = toggleStates[group];
    if (!current || toggling) return;
    const makeFree = !current.isFree;
    setToggling(group);
    try {
      const res = await fetch('/api/admin/bulk-toggle-free', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group, makeFree }),
      });
      const json = await res.json();
      if (json.ok) {
        await fetchToggleStates();
      } else {
        alert(`Failed: ${json.error}`);
      }
    } catch (e) {
      alert('Network error');
    } finally {
      setToggling(null);
    }
  };

  const toggleCards: { key: 'sfx' | 'music' | 'low_selling'; label: string; description: string; icon: ReactNode; color: string }[] = [
    {
      key: 'sfx',
      label: 'All SFX',
      description: 'Sound effects templates',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      ),
      color: 'violet',
    },
    {
      key: 'music',
      label: 'All Music',
      description: 'Music templates',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
        </svg>
      ),
      color: 'amber',
    },
    {
      key: 'low_selling',
      label: 'Low Selling (AE)',
      description: 'After Effects templates with zero downloads',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
      color: 'rose',
    },
  ];

  const colorMap: Record<string, { border: string; bg: string; iconBg: string; iconText: string; badge: string; badgeText: string; trackOn: string; trackOff: string }> = {
    violet: { border: 'border-violet-200', bg: 'bg-violet-50/50', iconBg: 'bg-violet-100', iconText: 'text-violet-600', badge: 'bg-violet-100', badgeText: 'text-violet-700', trackOn: 'bg-violet-500', trackOff: 'bg-zinc-300' },
    amber: { border: 'border-amber-200', bg: 'bg-amber-50/50', iconBg: 'bg-amber-100', iconText: 'text-amber-600', badge: 'bg-amber-100', badgeText: 'text-amber-700', trackOn: 'bg-amber-500', trackOff: 'bg-zinc-300' },
    rose: { border: 'border-rose-200', bg: 'bg-rose-50/50', iconBg: 'bg-rose-100', iconText: 'text-rose-600', badge: 'bg-rose-100', badgeText: 'text-rose-700', trackOn: 'bg-rose-500', trackOff: 'bg-zinc-300' },
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-zinc-900">Overview</h1>
        <p className="text-zinc-500 mt-1">Manage templates, users, and orders.</p>
      </header>
      {stats && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-4xl font-bold text-zinc-900 mb-1">{stats.templates}</div>
              <div className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Templates</div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-4xl font-bold text-zinc-900 mb-1">{stats.orders}</div>
              <div className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Orders</div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-4xl font-bold text-zinc-900 mb-1">₹{stats.revenue.toFixed(2)}</div>
              <div className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Order Revenue</div>
            </div>
          </div>
          
          {/* Revenue Distribution Section */}
          {(stats.totalSubscriptionRevenue !== undefined || stats.vendorPoolAmount !== undefined || stats.celiteAmount !== undefined) && (
            <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
              <h2 className="text-xl font-bold text-zinc-900 mb-6">Revenue Distribution</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-6">
                  <div className="text-3xl font-bold text-zinc-900 mb-2">
                    ₹{(stats.totalSubscriptionRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Total Revenue Pool</div>
                  <div className="text-xs text-zinc-400 mt-2">From active subscriptions</div>
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    ₹{(stats.vendorPoolAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-sm font-medium text-blue-600 uppercase tracking-wider">Vendor Pool</div>
                  <div className="text-xs text-blue-500 mt-2">40% distributed to creators</div>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
                  <div className="text-3xl font-bold text-emerald-600 mb-2">
                    ₹{(stats.celiteAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-sm font-medium text-emerald-600 uppercase tracking-wider">Celite Amount</div>
                  <div className="text-xs text-emerald-500 mt-2">60% retained by Celite</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Bulk Free/Normal Toggle Section */}
      <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h2 className="text-xl font-bold text-zinc-900 mb-2">Bulk Free / Normal Toggle</h2>
        <p className="text-sm text-zinc-500 mb-6">Quickly switch entire groups of templates between free and normal (paid).</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {toggleCards.map((card) => {
            const state = toggleStates[card.key];
            const colors = colorMap[card.color];
            const isOn = state?.isFree ?? false;
            const isLoading = toggling === card.key;

            return (
              <div
                key={card.key}
                className={`rounded-xl border ${colors.border} ${colors.bg} p-5 transition-all duration-200 hover:shadow-md`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`rounded-lg ${colors.iconBg} p-2.5 ${colors.iconText}`}>
                    {card.icon}
                  </div>
                  {/* Toggle Switch */}
                  <button
                    onClick={() => handleToggle(card.key)}
                    disabled={isLoading || !state}
                    className="relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: isOn ? undefined : undefined }}
                    aria-label={`Toggle ${card.label} free`}
                  >
                    <span className={`absolute inset-0 rounded-full transition-colors duration-300 ${isOn ? colors.trackOn : colors.trackOff}`} />
                    <span
                      className={`relative inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-300 ${isOn ? 'translate-x-6' : 'translate-x-1'}`}
                    >
                      {isLoading && (
                        <svg className="animate-spin h-4 w-4 text-zinc-400 absolute top-0.5 left-0.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      )}
                    </span>
                  </button>
                </div>
                <div className="mb-3">
                  <h3 className="text-base font-semibold text-zinc-900">{card.label}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">{card.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${isOn ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-600'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isOn ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                    {isOn ? 'Free' : 'Normal'}
                  </span>
                  {state && (
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${colors.badge} ${colors.badgeText}`}>
                      {state.free}/{state.total} free
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-4">
        <button onClick={onSeed} className="rounded-lg bg-blue-600 text-white px-6 py-2.5 text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm">
          Seed Templates
        </button>
        <button onClick={onUpload} className="rounded-lg border border-zinc-200 bg-white px-6 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm">
          Upload Previews
        </button>
      </div>
    </div>
  );
}
