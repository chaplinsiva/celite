"use client";

export default function OverviewPanel({ stats, onSeed, onUpload }: {
  stats: { templates: number; orders: number; revenue: number } | null;
  onSeed: () => Promise<void> | void;
  onUpload: () => Promise<void> | void;
}) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-zinc-400">Manage templates, users, and orders.</p>
      </header>
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4"><div className="text-2xl font-bold">{stats.templates}</div><div className="text-xs text-zinc-400">Templates</div></div>
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4"><div className="text-2xl font-bold">{stats.orders}</div><div className="text-xs text-zinc-400">Orders</div></div>
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4"><div className="text-2xl font-bold">${stats.revenue.toFixed(2)}</div><div className="text-xs text-zinc-400">Revenue</div></div>
        </div>
      )}
      <div className="flex gap-3">
        <button onClick={onSeed} className="rounded-full bg-white text-black px-4 py-2 text-sm font-semibold hover:bg-zinc-200">Seed Templates</button>
        <button onClick={onUpload} className="rounded-full border border-white/30 px-4 py-2 text-sm hover:bg-white/10">Upload Previews</button>
      </div>
    </div>
  );
}


