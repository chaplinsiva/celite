"use client";

export default function OverviewPanel({ stats, onSeed, onUpload }: {
  stats: { templates: number; orders: number; revenue: number } | null;
  onSeed: () => Promise<void> | void;
  onUpload: () => Promise<void> | void;
}) {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-zinc-900">Overview</h1>
        <p className="text-zinc-500 mt-1">Manage templates, users, and orders.</p>
      </header>
      {stats && (
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
            <div className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Revenue</div>
          </div>
        </div>
      )}
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


