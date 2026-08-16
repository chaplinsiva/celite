<!-- agent-notes: { ctx: "Tracking artifact for Universal Marketing Attribution & Customer Journey Tracking Plan", deps: ["docs/plans/2026-08-16-universal-marketing-attribution-journey-plan.md"], state: active, last: "pat@2026-08-16" } -->
# Universal Marketing Attribution & Customer Journey Tracking — Plan Phase Tracking

**Phase:** Phase 1: Planning / Discovery  
**Lead:** Pat (with Cam & Archie)  
**Prior Phase:** [`docs/tracking/2026-08-14-subscription-attribution-plan.md`](file:///d:/celite-main/celite-main/docs/tracking/2026-08-14-subscription-attribution-plan.md)  
**Date:** 2026-08-16  

---

## 1. Goal Summary
Establish a production-grade **Marketing Attribution + Customer Journey Tracking System** for Celite across all channels (Instagram Paid/Organic, Facebook Paid/Organic, YouTube Organic/Paid, Google Ads/Organic, Search Engines, AI Assistants, Referrals, WhatsApp, Email, Direct, and Unknown) with an internal Marketing Content Registry, direct traffic disambiguation, identity stitching, interactive timeline visualization, and multi-lens revenue analytics.

---

## 2. Key Constraints & Design Principles
- **Multi-Touch Model**: Preserve entire customer journey; never overwrite original first-touch discovery source.
- **Identity Stitching**: Merge anonymous visitor interactions with authenticated accounts upon login/checkout.
- **Immutable Subscription Snapshot**: Stamp permanent attribution snapshot at purchase time.
- **Marketing Content Registry**: Human-readable name resolution for Meta Ad IDs, YouTube Video IDs, Google Campaign IDs, and Products.
- **Zero-Guessing Direct Disambiguation**: Differentiate Genuine Direct, Returning Attributed Direct, and Unknown/Missing Referrer without fabricating attribution.
- **Data Security**: Sanitize sensitive query parameters and enforce Supabase RLS.

---

## 3. Architecture Gate Items
- **Gated Item**: Universal Multi-Touch Event Streaming, Marketing Content Registry, Anonymous Identity Stitching, and Direct Traffic Disambiguation.
- **ADR Target**: `docs/adrs/0006-universal-marketing-attribution-journey.md`
- **Challengers**: Archie (Architecture Lead) & Wei (Pragmatic Challenger).

---

## 4. Work Breakdown & Status
| Work Item | Owner | Status |
|-----------|-------|--------|
| Planning & Architecture Gate | Pat, Archie, Wei | In Progress |
| Database Migration (`52_universal_marketing_attribution.sql`) | Sato | Backlog |
| Attribution Normalization & Signals Engine (`lib/attribution.ts`) | Sato, Tara | Backlog |
| Client Touchpoint Streamer (`components/AttributionTracker.tsx`) | Sato, Tara | Backlog |
| Ingestion & Analytics API Endpoints | Sato, Tara | Backlog |
| Razorpay Webhook Immutable Snapshots | Sato | Backlog |
| Subscription Log with Journey Timeline Modal | Sato, Pierrot | Backlog |
| Attribution Analytics & Assisted Conversions Dashboard | Sato, Pierrot | Backlog |
| Marketing Sources Registry Admin Panel | Sato, Pierrot | Backlog |
| Vitest Test Suites & E2E Validation | Tara, Sato, Vik | Backlog |

---

## 5. Acceptance Criteria
- [ ] Every subscription has immutable First-Touch and Last-Touch attribution snapshot.
- [ ] Customer Journey timeline modal visualizes full chronological touchpoints for any subscriber.
- [ ] Raw platform IDs are mapped to readable names via Marketing Content Registry.
- [ ] Direct traffic is separated into Genuine Direct, Returning Attributed Direct, and Unknown.
- [ ] Assisted conversions matrix accurately visualizes discovery-to-conversion paths.
- [ ] Manual attribution corrections are logged with audit trails.
- [ ] Complete attribution data can be exported to CSV.
- [ ] All automated tests pass with 100% green status.
