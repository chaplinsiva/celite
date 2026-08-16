// agent-notes: { ctx: "Admin sidebar component containing navigation tabs", deps: [], state: active, last: "sato@2026-08-14" }
"use client";

type TabKey =
  | 'overview'
  | 'blogs'
  | 'payouts'
  | 'products'
  | 'subscriptionApproval'
  | 'vendorApproval'
  | 'categories'
  | 'analytics'
  | 'trafficAnalytics'
  | 'attributionAnalytics'
  | 'liveTrafficLogs'
  | 'marketingRegistry'
  | 'vendorAnalytics'
  | 'subscriptionLog'
  | 'freeGifts'
  | 'specialOffer'
  | 'users'
  | 'settings'
  | 'marketing'
  | 'productAlerts'
  | 'bulkSfx';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'blogs', label: '📰 Blogs & SEO' },
  { key: 'payouts', label: '💰 Creator Payouts' },
  { key: 'subscriptionApproval', label: '⭐ Subscription Approvals' },
  { key: 'products', label: 'Products' },
  { key: 'vendorApproval', label: 'Vendor Approval' },
  { key: 'categories', label: 'Categories' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'liveTrafficLogs', label: '📡 Live Traffic Logs' },
  { key: 'trafficAnalytics', label: '🌐 Traffic Sources' },
  { key: 'attributionAnalytics', label: '🎯 Attribution Analytics' },
  { key: 'marketingRegistry', label: '📋 Marketing Registry' },
  { key: 'vendorAnalytics', label: '📊 Vendor Analytics' },
  { key: 'subscriptionLog', label: 'Subscription Log' },
  { key: 'freeGifts', label: 'Free Gift Analytics' },
  { key: 'specialOffer', label: '3rd Anniversary Offer' },
  { key: 'users', label: 'Users' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'productAlerts', label: 'Product Alerts' },
  { key: 'bulkSfx', label: 'Bulk SFX Generator' },
  { key: 'settings', label: 'Settings' },
];

export default function AdminSidebar({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (key: TabKey) => void;
}) {
  return (
    <aside className="border-r border-zinc-200 bg-white p-4 h-full">
      <h2 className="px-3 text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-4 mt-2">
        Navigation
      </h2>
      <nav className="flex flex-col gap-1 text-sm font-medium">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`text-left rounded-lg px-3 py-2.5 transition-all outline-none ${active === tab.key
              ? 'bg-blue-50 text-blue-600'
              : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}


