---
agent-notes:
  ctx: "ADR for Subscription Attribution and Analytics system"
  deps: ["supabase_migrations/51_add_attribution_tables.sql", "lib/attribution.ts"]
  state: active
  last: "archie@2026-08-14"
---

# 0005. Subscription Attribution & Analytics System

## Context
Evaluating Celite's marketing performance—especially determining whether paid Instagram advertising and external campaigns generate incremental subscriptions and revenue—requires answering: *"Where did this paying customer come from?"*

Relying solely on external client-side analytics (such as GA4) produces discrepancies with actual subscription databases, misses cross-session anonymous-to-authenticated transitions, and lacks immutable financial attribution snapshots directly tied to database subscription records.

## Decision

We implement a First-Touch + Last-Touch Subscription Attribution system with the following architectural choices:

1. **Dual-Table Database Model**:
   - `visitor_attributions`: A user-level record containing first-touch (immutable) and last-touch (updated on new inbound touches) marketing parameters, landing page, and first product viewed.
   - `subscription_attributions`: An immutable snapshot created at the instant a subscription payment completes (via webhook or checkout finalization), linking directly to `checkout_details` and `subscriptions`.
2. **Client-Side Storage via `localStorage`**:
   - Store visitor attribution under `celite_attribution` in `localStorage`.
   - Generate a client UUID `anonymous_id` persisted across browser sessions.
   - Strip sensitive query params (passwords, tokens, keys) and cap string lengths at 256 characters.
3. **Identity Stitching on Auth/Checkout**:
   - When an anonymous visitor signs up, logs in, or enters checkout details, an attribution sync request is dispatched to `/api/attribution/sync` or included in `/api/checkout/details`.
   - On the server, if a `visitor_attributions` row does not exist for the user, one is created with the first-touch data. If it exists, only the last-touch attributes are updated.
4. **Normalized Source Mapping**:
   - 11 normalized channels prioritized:
     1. Explicit UTMs (`utm_source`, `utm_medium`)
     2. Known domain referrers (Instagram, Facebook, Google, YouTube, ChatGPT/AI)
     3. Generic Referral
     4. Direct
     5. Other
5. **Immutable Subscription Snapshot in Razorpay Webhook**:
   - When `subscription.activated` or `invoice.paid` arrives at `/api/razorpay/webhook/route.ts`, a `subscription_attributions` snapshot is inserted, ensuring future visits by the customer never alter historical purchase attribution.
6. **Admin Dashboard & Subscription Log Integration**:
   - Surface attribution in `/app/admin/components/SubscriptionLogPanel.tsx`.
   - Add a dedicated `/app/admin/components/AttributionAnalyticsPanel.tsx` in the admin portal with first-touch/last-touch breakdowns, campaign ROI, product ranking, and assisted conversion path analysis.

## Consequences

### Positive
- Direct, 100% database-backed revenue attribution tied to actual Razorpay payments.
- Transparent distinction between first discovery touch and immediate conversion touch (assisted conversions).
- Zero third-party tracker dependencies or cookie banner requirements for attribution data.

### Negative / Trade-offs
- Historical subscriptions created prior to this system will not have attribution data and will display as "Unknown / Legacy".
- Visitors using strict browser incognito or clearing `localStorage` between visits before logging in may appear as separate touches.
