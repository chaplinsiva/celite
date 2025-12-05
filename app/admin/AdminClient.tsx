"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '../../lib/supabaseClient';
import AdminSidebar from './components/AdminSidebar';
import OverviewPanel from './components/OverviewPanel';
import ProductsPanel from './components/ProductsPanel';
import CategoriesPanel from './components/CategoriesPanel';
import AnalyticsPanel from './components/AnalyticsPanel';
import UsersPanel from './components/UsersPanel';
import SettingsPanel from './components/SettingsPanel';
import MarketingPanel from './components/MarketingPanel';

type TemplateRow = { slug: string; name: string; img: string | null; video?: string | null };

export default function AdminClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [stats, setStats] = useState<{ templates: number; orders: number; revenue: number } | null>(null);
  const [active, setActive] = useState<'overview' | 'products' | 'categories' | 'analytics' | 'users' | 'settings' | 'marketing'>('overview');



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
      const { data } = await supabase.from('templates').select('slug,name,img,video').order('created_at', { ascending: false });
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
    const { data } = await supabase.from('templates').select('slug,name,img,video').order('created_at', { ascending: false });
    setTemplates((data as any) ?? []);
  };
  const deleteTemplate = async (slug: string) => {
    if (!confirm(`Delete ${slug}?`)) return;
    const res = await fetch('/api/admin/templates/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug }) });
    if (res.ok) await refreshTemplates();
  };

  if (loading) return <main className="bg-black min-h-screen pt-20 text-white px-6">Loading…</main>;
  if (!isAdmin) return null;

  return (
    <main className="bg-black min-h-screen pt-20 text-white">
      <div className="grid grid-cols-[220px_1fr] min-h-[calc(100vh-4rem)]">
        <AdminSidebar active={active} onChange={setActive} />
        {/* Content */}
        <section className="p-6 space-y-6">
          {active === 'overview' && (<OverviewPanel stats={stats} onSeed={runSeed} onUpload={runUpload} />)}

          {active === 'products' && (<ProductsPanel templates={templates} onDelete={deleteTemplate} onCreated={refreshTemplates} />)}

          {active === 'categories' && (<CategoriesPanel />)}

          {active === 'analytics' && (<AnalyticsPanel />)}

          {active === 'users' && (<UsersPanel />)}
          {active === 'marketing' && (<MarketingPanel />)}
          {active === 'settings' && (<SettingsPanel />)}
        </section>
      </div>
    </main>
  );
}


