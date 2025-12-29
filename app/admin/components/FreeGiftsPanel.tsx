"use client";

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '../../../lib/supabaseClient';
import { Gift, Download, TrendingUp, Users } from 'lucide-react';

export default function FreeGiftsPanel() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalDownloads: 0,
        uniqueUsers: 0,
        convertedUsers: 0,
        conversionRate: 0,
    });
    const [topGifts, setTopGifts] = useState<any[]>([]);
    const [userDownloads, setUserDownloads] = useState<any[]>([]);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                const supabase = getSupabaseBrowserClient();

                console.log('[FreeGifts] Starting to fetch analytics...');

                // 1. Get all free templates
                const { data: freeTemplates, error: templatesError } = await supabase
                    .from('templates')
                    .select('slug, name')
                    .eq('is_free', true);

                if (templatesError) {
                    console.error('[FreeGifts] Error fetching free templates:', templatesError);
                    setLoading(false);
                    return;
                }

                console.log('[FreeGifts] Found free templates:', freeTemplates);

                const freeSlugs = freeTemplates?.map(t => t.slug) || [];

                if (freeSlugs.length === 0) {
                    console.log('[FreeGifts] No free templates found');
                    setLoading(false);
                    return;
                }

                // 2. Fetch ALL downloads for these slugs (no filtering)
                const { data: downloads, error: dlError } = await supabase
                    .from('free_downloads')
                    .select('user_id, template_slug, downloaded_at')
                    .in('template_slug', freeSlugs)
                    .order('downloaded_at', { ascending: false });

                if (dlError) {
                    console.error('[FreeGifts] Error fetching downloads:', dlError);
                    setLoading(false);
                    return;
                }

                console.log('[FreeGifts] Total downloads found:', downloads?.length || 0);

                const totalDownloads = downloads?.length || 0;

                // 3. Get unique user IDs
                const uniqueUserIds = Array.from(new Set((downloads || []).map(d => d.user_id).filter(Boolean)));
                const uniqueUsersCount = uniqueUserIds.length;

                console.log('[FreeGifts] Unique users:', uniqueUsersCount);

                // 4. Check subscriptions
                let uniqueSubscribedIds = new Set<string>();
                if (uniqueUsersCount > 0) {
                    const { data: subscriptions } = await supabase
                        .from('subscriptions')
                        .select('user_id')
                        .eq('is_active', true)
                        .in('user_id', uniqueUserIds);

                    uniqueSubscribedIds = new Set((subscriptions || []).map(s => s.user_id));
                    console.log('[FreeGifts] Converted users:', uniqueSubscribedIds.size);
                }

                const conversionRate = uniqueUsersCount > 0 ? (uniqueSubscribedIds.size / uniqueUsersCount) * 100 : 0;

                // 5. Get user details for display
                const { data: { session } } = await supabase.auth.getSession();
                let userMap: Record<string, any> = {};

                if (session) {
                    try {
                        const res = await fetch('/api/admin/users', {
                            headers: { Authorization: `Bearer ${session.access_token}` }
                        });
                        const json = await res.json();
                        if (json.ok && json.users) {
                            json.users.forEach((u: any) => {
                                userMap[u.id] = u;
                            });
                            console.log('[FreeGifts] Loaded user details for', Object.keys(userMap).length, 'users');
                        }
                    } catch (e) {
                        console.error('[FreeGifts] Failed to load user details:', e);
                    }
                }

                // 6. Process user downloads
                const processedUserDownloads = (downloads || []).map(dl => {
                    const userData = userMap[dl.user_id];
                    const template = freeTemplates?.find(t => t.slug === dl.template_slug);
                    return {
                        id: dl.user_id,
                        email: userData?.email || 'Unknown User',
                        name: [userData?.first_name, userData?.last_name].filter(Boolean).join(' ') || 'Anonymous',
                        templateName: template?.name || dl.template_slug,
                        date: dl.downloaded_at,
                        isConverted: uniqueSubscribedIds.has(dl.user_id)
                    };
                });

                // 7. Group by template
                const giftStatsMap: Record<string, { name: string, count: number }> = {};
                freeTemplates?.forEach(t => {
                    giftStatsMap[t.slug] = { name: t.name, count: 0 };
                });
                (downloads || []).forEach(d => {
                    if (giftStatsMap[d.template_slug]) {
                        giftStatsMap[d.template_slug].count++;
                    }
                });

                const sortedGifts = Object.entries(giftStatsMap)
                    .map(([slug, data]) => ({ slug, ...data }))
                    .sort((a, b) => b.count - a.count);

                console.log('[FreeGifts] Setting stats:', {
                    totalDownloads,
                    uniqueUsers: uniqueUsersCount,
                    convertedUsers: uniqueSubscribedIds.size,
                    conversionRate
                });

                setStats({
                    totalDownloads,
                    uniqueUsers: uniqueUsersCount,
                    convertedUsers: uniqueSubscribedIds.size,
                    conversionRate,
                });
                setTopGifts(sortedGifts);
                setUserDownloads(processedUserDownloads);
            } catch (error) {
                console.error('[FreeGifts] Unexpected error:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-zinc-500 font-medium">Crunching gift data...</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Free Template Analytics</h2>
                    <p className="text-zinc-500 mt-1">Track New Year Gift downloads and subscription conversion rates.</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl">
                    <Gift className="w-6 h-6 text-blue-600" />
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
                        <h3 className="font-semibold text-zinc-900">Per Template</h3>
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
                    </div>
                </div>

                {/* Recent Gift Downloaders Table */}
                <div className="xl:col-span-2 bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
                        <h3 className="font-semibold text-zinc-900">Recent Gift Downloaders</h3>
                        <span className="text-xs font-medium text-zinc-400 bg-zinc-100 px-2.5 py-1 rounded-full">{userDownloads.length} Records</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-zinc-50 border-b border-zinc-100 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                                <tr>
                                    <th className="px-6 py-3">User</th>
                                    <th className="px-6 py-3">Template</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {userDownloads.map((dl, idx) => (
                                    <tr key={`${dl.id}-${idx}`} className="hover:bg-zinc-50 transition-colors">
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
                                            {dl.isConverted ? (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                    Active Subscriber
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 text-[10px] font-bold border border-zinc-200">
                                                    Not Subscribed
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-zinc-400 tabular-nums">
                                            {new Date(dl.date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                    </tr>
                                ))}
                                {userDownloads.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-zinc-500 italic">
                                            No gift downloads recorded yet.
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
