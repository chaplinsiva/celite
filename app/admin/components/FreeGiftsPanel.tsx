"use client";

import { useEffect, useState, useCallback } from 'react';
import { Gift, Download, TrendingUp, Users, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const PAGE_SIZE = 20;

export default function FreeGiftsPanel() {
    const [loading, setLoading] = useState(true);
    const [tableLoading, setTableLoading] = useState(false);
    const [stats, setStats] = useState({
        totalDownloads: 0,
        uniqueUsers: 0,
        convertedUsers: 0,
        conversionRate: 0,
    });
    const [topGifts, setTopGifts] = useState<any[]>([]);
    const [userDownloads, setUserDownloads] = useState<any[]>([]);
    const [campaignStartDate, setCampaignStartDate] = useState<string | null>(null);
    const [pagination, setPagination] = useState({
        page: 1,
        pageSize: PAGE_SIZE,
        totalRecords: 0,
        totalPages: 1,
    });

    const fetchPage = useCallback(async (page: number, isInitial = false) => {
        try {
            if (isInitial) setLoading(true);
            else setTableLoading(true);

            const res = await fetch(`/api/admin/free-gifts-stats?page=${page}&pageSize=${PAGE_SIZE}`);
            const json = await res.json();
            if (json.ok) {
                setStats(json.stats);
                setTopGifts(json.topGifts || []);
                setUserDownloads(json.userDownloads || []);
                setCampaignStartDate(json.campaignStartDate || null);
                setPagination(json.pagination || { page, pageSize: PAGE_SIZE, totalRecords: 0, totalPages: 1 });
            }
        } catch (error) {
            console.error('[FreeGifts] Failed to load:', error);
        } finally {
            setLoading(false);
            setTableLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPage(1, true);
    }, [fetchPage]);

    const goToPage = (p: number) => {
        if (p < 1 || p > pagination.totalPages) return;
        fetchPage(p);
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-zinc-500 font-medium">Crunching gift data...</p>
        </div>
    );

    const { page, totalRecords, totalPages } = pagination;
    const startRecord = totalRecords === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const endRecord = Math.min(page * PAGE_SIZE, totalRecords);

    // Build page number list (show up to 5 pages around current)
    const pageNumbers: (number | '...')[] = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
    } else {
        pageNumbers.push(1);
        if (page > 3) pageNumbers.push('...');
        const lo = Math.max(2, page - 1);
        const hi = Math.min(totalPages - 1, page + 1);
        for (let i = lo; i <= hi; i++) pageNumbers.push(i);
        if (page < totalPages - 2) pageNumbers.push('...');
        pageNumbers.push(totalPages);
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Free Templates Analytics</h2>
                    <p className="text-zinc-500 mt-1">Track free template downloads and general engagement.</p>
                </div>
                <div className="flex items-center gap-3">
                    {campaignStartDate ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            <span className="text-xs font-semibold text-blue-700">
                                Since {new Date(campaignStartDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200">
                            <span className="text-xs font-semibold text-amber-700">⚠ No campaign date — showing today only</span>
                        </div>
                    )}
                    <div className="p-3 bg-blue-50 rounded-xl">
                        <Gift className="w-6 h-6 text-blue-600" />
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    label="Total Downloads"
                    value={stats.totalDownloads}
                    icon={<Download className="w-5 h-5" />}
                    color="blue"
                />
                <StatCard
                    label="Unique Takers"
                    value={stats.uniqueUsers}
                    icon={<Users className="w-5 h-5" />}
                    color="purple"
                />
                <StatCard
                    label="Converted to Sub"
                    value={stats.convertedUsers}
                    icon={<TrendingUp className="w-5 h-5" />}
                    color="emerald"
                />
                <StatCard
                    label="Conversion Rate"
                    value={`${stats.conversionRate.toFixed(1)}%`}
                    icon={<TrendingUp className="w-5 h-5" />}
                    color="amber"
                    description="Users who subscribed after taking gift"
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Per Template Breakdown */}
                <div className="xl:col-span-1 bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden h-fit">
                    <div className="px-6 py-4 border-b border-zinc-100">
                        <h3 className="font-semibold text-zinc-900">Top 10 Downloaded</h3>
                    </div>
                    <div className="divide-y divide-zinc-100">
                        {topGifts.map((gift) => (
                            <div key={gift.slug} className="px-6 py-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                                <div className="flex flex-col min-w-0">
                                    <span className="font-medium text-zinc-900 truncate">{gift.name}</span>
                                    <span className="text-xs text-zinc-400 font-mono uppercase tracking-wider truncate">{gift.slug}</span>
                                </div>
                                <div className="text-right ml-4">
                                    <span className="block text-sm font-bold text-zinc-900">{gift.count}</span>
                                    <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-tight">Downloads</span>
                                </div>
                            </div>
                        ))}
                        {topGifts.length === 0 && (
                            <div className="px-6 py-8 text-center text-zinc-400 text-sm italic">No downloads yet.</div>
                        )}
                    </div>
                </div>

                {/* Recent Gift Downloaders Table with Pagination */}
                <div className="xl:col-span-2 bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
                    {/* Table Header */}
                    <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
                        <h3 className="font-semibold text-zinc-900">Gift Downloaders</h3>
                        <div className="flex items-center gap-2">
                            {tableLoading && (
                                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            )}
                            <span className="text-xs font-medium text-zinc-400 bg-zinc-100 px-2.5 py-1 rounded-full">
                                {totalRecords} Records
                            </span>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-zinc-50 border-b border-zinc-100 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                                <tr>
                                    <th className="px-6 py-3">User</th>
                                    <th className="px-6 py-3">Template</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Date</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y divide-zinc-100 transition-opacity duration-200 ${tableLoading ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                                {userDownloads.map((dl, idx) => (
                                    <tr key={`${dl.userId}-${dl.date}-${idx}`} className="hover:bg-zinc-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-medium text-zinc-900 truncate">{dl.name}</span>
                                                <span className="text-xs text-zinc-500 truncate">{dl.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-zinc-700 font-medium truncate">{dl.templateName}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {dl.isActiveNow ? (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                    Active Subscriber
                                                </span>
                                            ) : dl.isConverted ? (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                                    Subscribed
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 text-[10px] font-bold border border-zinc-200">
                                                    Not Subscribed
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-zinc-400 tabular-nums whitespace-nowrap">
                                            {new Date(dl.date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                    </tr>
                                ))}
                                {userDownloads.length === 0 && !tableLoading && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-zinc-500 italic">
                                            No gift downloads recorded yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                            {/* Record info */}
                            <p className="text-xs text-zinc-500 tabular-nums">
                                Showing <span className="font-semibold text-zinc-700">{startRecord}–{endRecord}</span> of{' '}
                                <span className="font-semibold text-zinc-700">{totalRecords}</span> downloads
                            </p>

                            {/* Page buttons */}
                            <div className="flex items-center gap-1">
                                {/* First */}
                                <button
                                    onClick={() => goToPage(1)}
                                    disabled={page === 1 || tableLoading}
                                    className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    title="First page"
                                >
                                    <ChevronsLeft className="w-3.5 h-3.5" />
                                </button>
                                {/* Prev */}
                                <button
                                    onClick={() => goToPage(page - 1)}
                                    disabled={page === 1 || tableLoading}
                                    className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    title="Previous page"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                </button>

                                {/* Page numbers */}
                                {pageNumbers.map((n, i) =>
                                    n === '...' ? (
                                        <span key={`ellipsis-${i}`} className="px-1.5 text-xs text-zinc-400 select-none">…</span>
                                    ) : (
                                        <button
                                            key={n}
                                            onClick={() => goToPage(n as number)}
                                            disabled={tableLoading}
                                            className={`min-w-[28px] h-7 px-1.5 rounded-md text-xs font-semibold transition-all disabled:cursor-not-allowed ${
                                                n === page
                                                    ? 'bg-blue-600 text-white shadow-sm'
                                                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                                            }`}
                                        >
                                            {n}
                                        </button>
                                    )
                                )}

                                {/* Next */}
                                <button
                                    onClick={() => goToPage(page + 1)}
                                    disabled={page === totalPages || tableLoading}
                                    className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    title="Next page"
                                >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                                {/* Last */}
                                <button
                                    onClick={() => goToPage(totalPages)}
                                    disabled={page === totalPages || tableLoading}
                                    className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    title="Last page"
                                >
                                    <ChevronsRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    )}
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
