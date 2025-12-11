"use client";

export default function OverviewPanel({ stats, onSeed, onUpload }: {
  stats: { 
    templates: number; 
    orders: number; 
    revenue: number;
    totalSubscriptionRevenue?: number;
    vendorPoolAmount?: number;
    celiteAmount?: number;
  } | null;
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
        <>
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
              <div className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Order Revenue</div>
            </div>
          </div>
          
          {/* Revenue Distribution Section */}
          {(stats.totalSubscriptionRevenue !== undefined || stats.vendorPoolAmount !== undefined || stats.celiteAmount !== undefined) && (
            <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
              <h2 className="text-xl font-bold text-zinc-900 mb-6">Revenue Distribution</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-6">
                  <div className="text-3xl font-bold text-zinc-900 mb-2">
                    ₹{(stats.totalSubscriptionRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Total Revenue Pool</div>
                  <div className="text-xs text-zinc-400 mt-2">From active subscriptions</div>
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    ₹{(stats.vendorPoolAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-sm font-medium text-blue-600 uppercase tracking-wider">Vendor Pool</div>
                  <div className="text-xs text-blue-500 mt-2">40% distributed to creators</div>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
                  <div className="text-3xl font-bold text-emerald-600 mb-2">
                    ₹{(stats.celiteAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-sm font-medium text-emerald-600 uppercase tracking-wider">Celite Amount</div>
                  <div className="text-xs text-emerald-500 mt-2">60% retained by Celite</div>
                </div>
              </div>
            </div>
          )}
        </>
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


