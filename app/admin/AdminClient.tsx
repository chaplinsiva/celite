"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '../../lib/supabaseClient';
import AdminSidebar from './components/AdminSidebar';
import OverviewPanel from './components/OverviewPanel';
import ProductsPanel from './components/ProductsPanel';
import CategoriesPanel from './components/CategoriesPanel';
import AnalyticsPanel from './components/AnalyticsPanel';
import UsersPanel from './components/UsersPanel';
import SettingsPanel from './components/SettingsPanel';
import MarketingPanel from './components/MarketingPanel';
import VendorApprovalPanel from './components/VendorApprovalPanel';
import BulkSfxPanel from './components/BulkSfxPanel';
import FreeGiftsPanel from './components/FreeGiftsPanel';
import ProductAlertsPanel from './components/ProductAlertsPanel';

type TemplateRow = { slug: string; name: string; img: string | null; video?: string | null; vendor_name?: string | null; creator_shop_id?: string | null; status?: string | null };

export default function AdminClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [stats, setStats] = useState<{
    templates: number;
    orders: number;
    revenue: number;
    totalSubscriptionRevenue?: number;
    vendorPoolAmount?: number;
    celiteAmount?: number;
  } | null>(null);
  const [active, setActive] = useState<
    'overview' | 'products' | 'vendorApproval' | 'categories' | 'analytics' | 'freeGifts' | 'users' | 'settings' | 'marketing' | 'productAlerts' | 'bulkSfx'
  >('overview');



  useEffect(() => {
    const check = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/'); return; }
      // check admins table
      const { data } = await supabase.from('admins').select('user_id').eq('user_id', (session.user as any).id).maybeSingle();
      if (!data) { router.replace('/'); return; }
      setIsAdmin(true);
      await reload();
    };
    const reload = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.from('templates').select('slug,name,img,video,vendor_name,creator_shop_id,status').order('created_at', { ascending: false });
      setTemplates((data as any) ?? []);
      // stats via admin endpoint
      const res = await fetch('/api/admin/stats');
      const json = await res.json();
      if (res.ok && json.ok) setStats(json.data);
      setLoading(false);
    };
    check();
  }, [router]);

  const runSeed = async () => { await fetch('/api/admin/seed-templates', { method: 'POST' }); await refreshTemplates(); };
  const runUpload = async () => { await fetch('/api/admin/upload-assets', { method: 'POST' }); };
  const refreshTemplates = async () => {
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase.from('templates').select('slug,name,img,video,vendor_name,creator_shop_id,status').order('created_at', { ascending: false });
    setTemplates((data as any) ?? []);
  };
  const deleteTemplate = async (slug: string) => {
    if (!confirm(`Delete ${slug}?`)) return;
    const res = await fetch('/api/admin/templates/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug }) });
    if (res.ok) await refreshTemplates();
  };

  if (loading) return <main className="bg-zinc-50 min-h-screen pt-20 text-zinc-900 px-6">Loading…</main>;
  if (!isAdmin) return null;

  return (
    <main className="bg-zinc-50 min-h-screen text-zinc-900 flex flex-col font-sans">
      {/* Admin Navbar */}
      <header className="h-16 border-b border-zinc-200 flex items-center justify-between px-6 bg-white sticky top-0 z-50">
        <div className="flex items-center gap-2">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 focus:outline-none hover:opacity-80 transition-opacity">
            <img src="/logo/logo.png" alt="Celite Logo" className="h-8 w-auto object-contain" />
            <span className="font-bold text-xl tracking-tight text-zinc-900">Celite <span className="text-zinc-500 font-normal text-sm ml-1">Admin</span></span>
          </Link>
        </div>
        <Link
          href="/"
          className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-zinc-100"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
          Back to Home
        </Link>
      </header>

      <div className="flex-1 grid grid-cols-[240px_1fr]">
        <AdminSidebar active={active} onChange={setActive} />
        {/* Content */}
        <div className="flex flex-col h-full overflow-hidden">
          <section className="flex-1 p-8 space-y-8 overflow-y-auto">
            {active === 'overview' && (<OverviewPanel stats={stats} onSeed={runSeed} onUpload={runUpload} />)}

            {active === 'products' && (
              <ProductsPanel templates={templates} onDelete={deleteTemplate} onCreated={refreshTemplates} />
            )}

            {active === 'vendorApproval' && (
              <VendorApprovalPanel templates={templates} onReviewed={refreshTemplates} />
            )}

            {active === 'categories' && (<CategoriesPanel />)}

            {active === 'analytics' && (<AnalyticsPanel />)}
            {active === 'freeGifts' && (<FreeGiftsPanel />)}

            {active === 'users' && (<UsersPanel />)}
            {active === 'marketing' && (<MarketingPanel />)}
            {active === 'productAlerts' && (<ProductAlertsPanel />)}
            {active === 'bulkSfx' && (<BulkSfxPanel />)}
            {active === 'settings' && (<SettingsPanel />)}
          </section>

          {/* Admin Footer */}
          <footer className="border-t border-zinc-200 py-6 px-8 text-center text-zinc-400 text-sm bg-white">
            &copy; {new Date().getFullYear()} Celite Inc. All rights reserved. Admin Panel.
          </footer>
        </div>
      </div>
    </main>
  );
}


