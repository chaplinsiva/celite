---
agent-notes:
  ctx: "codebase structural overview for humans and agents"
  deps: ["docs/features/subscription-attribution-analytics.md", "docs/adrs/0005-subscription-attribution-system.md"]
  state: active
  last: "sato@2026-08-14"
  key: ["UPDATE when adding packages, modules, or changing public APIs"]
---
# Code Map

Structural overview of the codebase. Use this to orient yourself before diving into code.

## Architecture at a Glance

```
Visitor (with UTMs / Referrer)
  │
  ├──► lib/attribution.ts (Captures touchpoints & normalizes source)
  │      │
  │      └──► localStorage (celite_attribution)
  │
  ├──► components/AttributionTracker.tsx (Tracks pages, products, auth changes)
  │      │
  │      └──► POST /api/attribution/sync ──► DB: visitor_attributions (User journey)
  │
  ├──► Checkout & Payment (Razorpay)
  │      │
  │      └──► POST /api/razorpay/webhook ──► DB: subscription_attributions (Immutable snapshot)
  │
  └──► Admin Portal
         ├──► Subscription Log Panel (/app/admin/components/SubscriptionLogPanel.tsx)
         └──► Attribution Analytics (/app/admin/components/AttributionAnalyticsPanel.tsx)
```

## Core Modules & Services

| Module | Key Exports / Purpose | Notes |
|--------|----------------------|-------|
| `lib/attribution.ts` | `normalizeSource`, `captureAttribution`, `getStoredAttribution`, `recordProductView` | Source normalization, sanitization & local storage |
| `components/AttributionTracker.tsx` | Client tracking component | Mounted in `app/layout.tsx` |
| `app/api/attribution/sync/route.ts` | Sync anonymous touchpoints with authenticated user | Writes to `visitor_attributions` |
| `app/api/admin/analytics/attribution/route.ts` | Attribution aggregation endpoint | Aggregates revenue by source, campaigns, products, assisted conversions |
| `app/api/razorpay/webhook/route.ts` | Razorpay webhook listener | Stamps immutable `subscription_attributions` snapshots |
| `app/admin/components/AttributionAnalyticsPanel.tsx` | Full attribution dashboard | KPI cards, Recharts, ROI tables, CSV export |
| `app/admin/components/SubscriptionLogPanel.tsx` | Subscription checkout activity log | Enriched with first/last touch badges & journey modals |

## Database Schema (Attribution)

| Table | Purpose | RLS |
|-------|---------|-----|
| `visitor_attributions` | Mutable user marketing journey (first-touch immutable, last-touch updated) | User self-read, Admin full |
| `subscription_attributions` | Immutable snapshot of attribution at time of subscription purchase | Admin full |

## Feature Docs & ADRs

- Architecture Decision Record: [`docs/adrs/0005-subscription-attribution-system.md`](file:///d:/celite-main/celite-main/docs/adrs/0005-subscription-attribution-system.md)
- Complete Feature Spec & Guide: [`docs/features/subscription-attribution-analytics.md`](file:///d:/celite-main/celite-main/docs/features/subscription-attribution-analytics.md)
- Implementation Tracking: [`docs/tracking/2026-08-14-subscription-attribution-plan.md`](file:///d:/celite-main/celite-main/docs/tracking/2026-08-14-subscription-attribution-plan.md)
