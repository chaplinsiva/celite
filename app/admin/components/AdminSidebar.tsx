"use client";

type TabKey = 'overview' | 'products' | 'analytics' | 'users' | 'settings';

export default function AdminSidebar({ active, onChange }: { active: TabKey; onChange: (key: TabKey) => void }) {
  return (
    <aside className="border-r border-white/10 bg-white/5 p-4">
      <h2 className="px-2 text-sm uppercase tracking-[0.25em] text-white/60">Admin</h2>
      <nav className="mt-4 flex flex-col gap-1 text-sm">
        <button onClick={() => onChange('overview')} className={`text-left rounded-lg px-3 py-2 hover:bg-white/10 ${active==='overview'?'bg-white/10':''}`}>Overview</button>
        <button onClick={() => onChange('products')} className={`text-left rounded-lg px-3 py-2 hover:bg-white/10 ${active==='products'?'bg-white/10':''}`}>Products</button>
        <button onClick={() => onChange('analytics')} className={`text-left rounded-lg px-3 py-2 hover:bg-white/10 ${active==='analytics'?'bg-white/10':''}`}>Analytics</button>
        <button onClick={() => onChange('users')} className={`text-left rounded-lg px-3 py-2 hover:bg-white/10 ${active==='users'?'bg-white/10':''}`}>User Management</button>
        <button onClick={() => onChange('settings')} className={`text-left rounded-lg px-3 py-2 hover:bg-white/10 ${active==='settings'?'bg-white/10':''}`}>Settings</button>
      </nav>
    </aside>
  );
}


