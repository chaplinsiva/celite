"use client";

type TabKey = 'overview' | 'products' | 'categories' | 'analytics' | 'users' | 'settings' | 'marketing';

export default function AdminSidebar({ active, onChange }: { active: TabKey; onChange: (key: TabKey) => void }) {
  return (
    <aside className="border-r border-zinc-200 bg-white p-4 h-full">
      <h2 className="px-3 text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-4 mt-2">Navigation</h2>
      <nav className="flex flex-col gap-1 text-sm font-medium">
        {['overview', 'products', 'categories', 'analytics', 'users', 'marketing', 'settings'].map((tab) => (
          <button
            key={tab}
            onClick={() => onChange(tab as TabKey)}
            className={`text-left rounded-lg px-3 py-2.5 transition-all outline-none ${active === tab
                ? 'bg-blue-50 text-blue-600'
                : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1).replace(/([A-Z])/g, ' $1').trim()}
          </button>
        ))}
      </nav>
    </aside>
  );
}


