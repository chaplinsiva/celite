"use client";
// agent-notes: { ctx: "Admin panel tracking subscription offer statistics", deps: ["lucide-react"], state: active, last: "tara@2026-08-24" }

import { useEffect, useState } from 'react';
import { Gift, TrendingUp, Users, CreditCard } from 'lucide-react';

export default function SpecialOfferPanel() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalActive: 0,
        monthlyCount: 0,
        yearlyCount: 0,
        totalRevenue: 0,
    });
    const [recentSubscribers, setRecentSubscribers] = useState<any[]>([]);
    const [offerStartDate, setOfferStartDate] = useState<string | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                const res = await fetch('/api/admin/special-offer-stats');
                const json = await res.json();
                if (json.ok) {
                    setStats(json.stats);
                    setRecentSubscribers(json.recentSubscribers || []);
                    setOfferStartDate(json.offerStartDate || null);
                }
            } catch (error) {
                console.error('[SpecialOffer] Failed to load:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-zinc-500 font-medium">Crunching offer data...</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">3rd Anniversary Special Offer</h2>
                    <p className="text-zinc-500 mt-1">Track active subscriptions and revenue from the special offer.</p>
                </div>
                <div className="flex items-center gap-3">
                    {offerStartDate ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            <span className="text-xs font-semibold text-indigo-700">
                                Campaign from {new Date(offerStartDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200">
                            <span className="text-xs font-semibold text-amber-700">⚠ No start date — showing all active subs</span>
                        </div>
                    )}
                    <div className="p-3 bg-indigo-50 rounded-xl">
                        <Gift className="w-6 h-6 text-indigo-600" />
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    label="Total Active Subs"
                    value={stats.totalActive}
                    icon={<Users className="w-5 h-5" />}
                    color="indigo"
                />
                <StatCard
                    label="Monthly Plan"
                    value={stats.monthlyCount}
                    icon={<TrendingUp className="w-5 h-5" />}
                    color="blue"
                />
                <StatCard
                    label="Yearly Plan"
                    value={stats.yearlyCount}
                    icon={<TrendingUp className="w-5 h-5" />}
                    color="purple"
                />
                <StatCard
                    label="Estimated Revenue"
                    value={`₹${stats.totalRevenue.toLocaleString()}`}
                    icon={<CreditCard className="w-5 h-5" />}
                    color="emerald"
                    description="Monthly revenue run rate"
                />
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* Recent Subscribers Table */}
                <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
                        <h3 className="font-semibold text-zinc-900">Recent Subscribers</h3>
                        <span className="text-xs font-medium text-zinc-400 bg-zinc-100 px-2.5 py-1 rounded-full">{recentSubscribers.length} Records</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-zinc-50 border-b border-zinc-100 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                                <tr>
                                    <th className="px-6 py-3">User</th>
                                    <th className="px-6 py-3">Plan</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Date Subscribed</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {recentSubscribers.map((sub, idx) => (
                                    <tr key={`${sub.id}-${idx}`} className="hover:bg-zinc-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-medium text-zinc-900 truncate">{sub.name}</span>
                                                <span className="text-xs text-zinc-500 truncate">{sub.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-zinc-700 font-medium capitalize">{sub.plan}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                Active
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-zinc-400 tabular-nums">
                                            {new Date(sub.date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                    </tr>
                                ))}
                                {recentSubscribers.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-zinc-500 italic">
                                            No recent subscriptions found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon, color, description }: any) {
    const colors: any = {
        blue: 'bg-blue-50 text-blue-600 border-blue-100',
        purple: 'bg-purple-50 text-purple-600 border-purple-100',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        amber: 'bg-amber-50 text-amber-600 border-amber-100',
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    };

    return (
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
                <div className={`p-2 rounded-lg border ${colors[color]}`}>
                    {icon}
                </div>
                <span className="text-sm font-semibold text-zinc-500">{label}</span>
            </div>
            <div>
                <span className="text-3xl font-bold text-zinc-900">{value}</span>
                {description && <p className="text-[10px] text-zinc-400 mt-1 font-medium italic">{description}</p>}
            </div>
        </div>
    );
}
