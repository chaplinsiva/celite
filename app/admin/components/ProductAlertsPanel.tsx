"use client";

import { useState, useEffect } from 'react';
import { getSupabaseBrowserClient } from '../../../lib/supabaseClient';
import VideoThumbnailPlayer from '../../../components/VideoThumbnailPlayer';

type TemplateRow = {
    slug: string;
    name: string;
    subtitle?: string | null;
    description?: string | null;
    thumbnail_path?: string | null;
    video_path?: string | null;
    img?: string | null;
    category?: { name: string; slug: string } | null;
};

export default function ProductAlertsPanel() {
    const [templates, setTemplates] = useState<TemplateRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sendingFor, setSendingFor] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [stats, setStats] = useState<{ sent: number; failed: number; total: number } | null>(null);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            setLoading(true);
            const supabase = getSupabaseBrowserClient();
            const { data, error } = await supabase
                .from('templates')
                .select('slug, name, subtitle, description, thumbnail_path, video_path, img, category:categories(name, slug)')
                .eq('status', 'approved')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTemplates((data as any) ?? []);
        } catch (e: any) {
            console.error('Failed to load templates:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleSendAlert = async (template: TemplateRow) => {
        if (sendingFor) return; // Prevent multiple simultaneous sends

        setSendingFor(template.slug);
        setMessage(null);
        setStats(null);

        try {
            const supabase = getSupabaseBrowserClient();
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                setMessage({ type: 'error', text: 'Session expired. Please log in again.' });
                setSendingFor(null);
                return;
            }

            const res = await fetch('/api/admin/marketing/send-product-alert', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    templateSlug: template.slug,
                }),
            });

            const json = await res.json();

            if (res.ok && json.ok) {
                setMessage({
                    type: 'success',
                    text: `✅ Successfully sent product alert for "${template.name}"`,
                });
                setStats({
                    sent: json.sent || 0,
                    failed: json.failed || 0,
                    total: json.total || 0,
                });
            } else {
                setMessage({ type: 'error', text: json.error || 'Failed to send product alert' });
            }
        } catch (e: any) {
            setMessage({ type: 'error', text: e?.message || 'Failed to send product alert' });
        } finally {
            setSendingFor(null);
        }
    };

    const filteredTemplates = templates.filter((t) => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return true;
        return (
            (t.name || '').toLowerCase().includes(q) ||
            (t.slug || '').toLowerCase().includes(q) ||
            ((t.category as any)?.name || '').toLowerCase().includes(q)
        );
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-2xl font-bold text-zinc-900">Product Alerts</h1>
                <p className="mt-1 text-sm text-zinc-500">
                    Send email alerts about new products to all active subscribers
                </p>
            </header>

            {/* Status Messages */}
            {message && (
                <div
                    className={`rounded-xl border p-4 text-sm font-medium ${message.type === 'success'
                            ? 'border-green-200 bg-green-50 text-green-700'
                            : 'border-red-200 bg-red-50 text-red-700'
                        }`}
                >
                    <p>{message.text}</p>
                    {stats && (
                        <p className="mt-2 text-xs opacity-80">
                            Sent: {stats.sent} | Failed: {stats.failed} | Total subscribers: {stats.total}
                        </p>
                    )}
                </div>
            )}

            {/* Search */}
            <div className="relative">
                <svg
                    className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                </svg>
                <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search products by name, slug, or category..."
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-white border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                />
            </div>

            {/* Info Box */}
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 flex items-start gap-3">
                <svg className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                    <strong className="font-semibold text-blue-900">How it works</strong>
                    <p className="mt-1">
                        Click "Send Alert" on any product to notify all active subscribers via email. The email includes the product thumbnail, title, description, and a download button linking to the product page.
                    </p>
                </div>
            </div>

            {/* Products Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredTemplates.map((template) => {
                    const thumbnail = template.thumbnail_path || template.img || null;
                    const isSending = sendingFor === template.slug;
                    const categoryName = (template.category as any)?.name || 'Uncategorized';

                    return (
                        <div
                            key={template.slug}
                            className="rounded-2xl border border-zinc-200 bg-white p-4 flex flex-col shadow-sm hover:shadow-md transition-shadow"
                        >
                            {/* Thumbnail */}
                            {template.video_path ? (
                                <div className="aspect-video w-full overflow-hidden rounded-xl mb-4 bg-zinc-100 border border-zinc-100">
                                    <VideoThumbnailPlayer
                                        videoUrl={template.video_path}
                                        thumbnailUrl={thumbnail || undefined}
                                        title={template.name}
                                        className="w-full h-full"
                                    />
                                </div>
                            ) : thumbnail ? (
                                <div className="aspect-video w-full overflow-hidden rounded-xl mb-4 bg-zinc-100 border border-zinc-100">
                                    <img
                                        src={thumbnail}
                                        alt={template.name}
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="aspect-video w-full overflow-hidden rounded-xl mb-4 bg-gradient-to-br from-zinc-100 to-zinc-200 flex items-center justify-center border border-zinc-200">
                                    <svg className="h-12 w-12 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                            )}

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mb-2">
                                    {categoryName}
                                </span>
                                <h3 className="text-sm font-semibold text-zinc-900 truncate" title={template.name}>
                                    {template.name}
                                </h3>
                                {template.subtitle && (
                                    <p className="text-xs text-zinc-500 truncate mt-0.5">{template.subtitle}</p>
                                )}
                                <p className="text-xs text-zinc-400 truncate mt-0.5">{template.slug}</p>
                            </div>

                            {/* Send Alert Button */}
                            <button
                                onClick={() => handleSendAlert(template)}
                                disabled={isSending || !!sendingFor}
                                className={`mt-4 w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${isSending
                                        ? 'bg-blue-100 text-blue-600 cursor-wait'
                                        : sendingFor
                                            ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-sm hover:shadow-md'
                                    }`}
                            >
                                {isSending ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                        </svg>
                                        Send Alert to Subscribers
                                    </>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>

            {filteredTemplates.length === 0 && (
                <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="mt-4 text-zinc-500">No products found</p>
                </div>
            )}
        </div>
    );
}
