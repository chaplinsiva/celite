---
agent-notes:
  ctx: "Tracking document for Subscription Attribution & Analytics implementation plan"
  deps: ["docs/plans/2026-08-14-subscription-attribution-plan.md", "docs/adrs/0005-subscription-attribution-system.md"]
  state: active
  last: "sato@2026-08-14"
---

# Tracking: Subscription Attribution & Analytics Plan

**Date:** 2026-08-14  
**Topic:** Subscription Attribution & Analytics System  
**Prior Phase:** None (New Feature Planning & Implementation)  
**Status:** In Progress  

## Goals & Summary
Build a comprehensive First-Touch & Last-Touch Subscription Attribution system for Celite:
1. Capture UTM parameters (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`), referrer, landing page, first/last visit times, and first product viewed.
2. Normalize traffic into 11 readable attribution sources (Instagram Paid/Organic, Facebook Paid/Organic, Google Ads/Organic, YouTube, Direct, Referral, ChatGPT / AI, Other).
3. Associate anonymous visitors seamlessly to authenticated users upon login, signup, or checkout.
4. Stamp an immutable attribution snapshot onto every successful subscription (`subscription_attributions`).
5. Enhance **Subscription Log** with attribution columns, badges, and detailed view modals.
6. Provide an interactive **Attribution Analytics** dashboard with revenue by first/last touch, campaign performance, product attribution, and assisted conversion journeys.

## Key Constraints
- DB is single source of truth for subscriptions and revenue.
- Client storage uses secure, scoped `localStorage` (`celite_attribution`) without capturing sensitive query params.
- First-touch is strictly immutable; last-touch updates on new source touches.
- All code follows Next.js App Router, Supabase RLS, and TypeScript conventions.

## Architecture Decisions
- **ADR 0005**: `docs/adrs/0005-subscription-attribution-system.md`
- Multi-table attribution strategy: `visitor_attributions` (mutable user journey) + `subscription_attributions` (immutable subscription snapshot).

## Acceptance Criteria
- [ ] Migration applied to Supabase with RLS policies enabled.
- [ ] Unit tests pass for UTM capture and source normalization logic (`__tests__/attribution.test.ts`).
- [ ] Client component tracks landing page & UTMs across page changes.
- [ ] Sync API securely connects visitor attribution to authenticated user.
- [ ] Razorpay webhook captures immutable snapshot on subscription activation/payment.
- [ ] Subscription Log UI displays attribution source badges and details.
- [ ] Attribution Analytics dashboard displays summary cards, source breakdown, campaign performance, product ranking, and assisted conversions.
