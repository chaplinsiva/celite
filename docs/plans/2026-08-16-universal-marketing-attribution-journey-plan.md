<!-- agent-notes: { ctx: "Universal Marketing Attribution & Customer Journey Tracking Plan", deps: ["lib/attribution.ts", "components/AttributionTracker.tsx", "supabase_migrations/51_add_attribution_tables.sql", "docs/adrs/0005-subscription-attribution-system.md"], state: active, last: "pat@2026-08-16" } -->
# Universal Marketing Attribution & Customer Journey Tracking Plan

## 1. Goal
Build a complete, production-grade **Marketing Attribution + Customer Journey Tracking System** for Celite across all channels:
- Instagram Paid / Organic
- Facebook Paid / Organic
- YouTube Organic / Paid
- Google Organic / Ads
- Search engines (Bing, Yahoo, DuckDuckGo)
- AI Assistants (ChatGPT, Claude, Perplexity)
- Referral websites
- WhatsApp & Email
- Direct (Disambiguated: Genuine Direct vs Previously Attributed vs Referrer Missing)
- Unknown / Unattributed (Strict zero-guessing policy)

## 2. Constraints & Principles
1. **Multi-Touch Model**: Preserve complete customer journey; never overwrite original first-touch discovery source.
2. **Identity Stitching**: Seamlessly connect Anonymous Visitor → Signup/Login → Product Views → Checkout → Payment → Subscription.
3. **Immutable Subscription Snapshot**: Record permanent attribution snapshot at the instant of subscription purchase that will never change historically.
4. **Marketing Content Registry**: Internal catalog to resolve raw campaign/ad/video IDs to human-readable names.
5. **Direct Traffic Disambiguation**: Differentiate Genuine Direct from Returning Attributed Direct and Missing Referrer.
6. **Zero Guessing**: Do not fabricate attribution when data is absent (e.g. show `YouTube / Video: Unknown` or `Unknown`).
7. **Security**: Sanitize all sensitive query parameters (`password`, `token`, `secret`, `access_token`, `auth`, `code`, etc.) before persistence.

## 3. Architecture Gate Items
- **Requires Architecture Gate**: ADR-0006 (Universal Multi-Touch Event Stream, Identity Stitching, and Content Registry).
- **Archie (Lead)** & **Wei (Challenger)**: Review event ingestion overhead, storage pruning strategy, query indexing, and data deduplication.

## 4. Implementation Steps (TDD Pipeline)
1. **Database Schema & Migrations**:
   - Create `supabase_migrations/52_universal_marketing_attribution.sql` with `marketing_sources_registry`, `visitor_touchpoints`, and table enhancements with RLS.
2. **Attribution Normalization & Signal Capture (`lib/attribution.ts`)**:
   - Multi-tier identifiers (`anonymous_id`, `session_id`, `user_id`).
   - Platform tags (`gclid`, `fbclid`, `dclid`, `msclkid`, `ttclid`, `utm_id`).
   - Source normalization rules & confidence scoring.
   - Sensitive query parameter sanitization.
3. **Client-Side Touchpoint Streamer (`components/AttributionTracker.tsx`)**:
   - Milestone tracking (`landing`, `homepage`, `category_view`, `product_view`, `pricing_view`, `checkout_started`).
   - Identity migration on authentication.
4. **API Ingestion & Aggregation Endpoints**:
   - `POST /api/attribution/track-event`
   - `POST /api/attribution/sync`
   - `GET/POST /api/admin/marketing-registry`
   - `GET /api/admin/analytics/attribution` (with assisted conversions, first/last touch, campaign hierarchy, and direct investigation)
   - `GET /api/admin/analytics/journey/[id]`
   - `POST /api/admin/analytics/attribution/correct`
   - `GET /api/admin/analytics/attribution/export`
5. **Subscription Webhook Snapshot Integration**:
   - Stamp immutable snapshots with resolved human-readable registry names in `app/api/razorpay/webhook/route.ts` & `app/api/subscription/activate/route.ts`.
6. **Admin Portal UI**:
   - Enhanced Subscription Log with rich badges, confidence ratings, and **"View Customer Journey"** interactive timeline modal.
   - Enhanced Attribution Analytics Dashboard with charts, assisted conversions matrix, and direct traffic inspector.
   - Marketing Sources Registry management panel.

## 5. Personas Involved
- **Cam**: Requirement clarification and business query alignment.
- **Archie**: Architecture design & ADR-0006.
- **Wei**: Architecture challenge (storage volume & indexing).
- **Tara**: Failing tests first for classification, tracking, and aggregation endpoints.
- **Sato**: Core implementation.
- **Vik**: Code review (security, IDOR, SQL performance).
- **Pierrot**: UX review & Celite visual theme adherence.

## 6. Acceptance Criteria
- [ ] Every subscription has an immutable First-Touch and Last-Touch attribution record with confidence scores.
- [ ] Complete customer journey timeline can be viewed for any subscriber in the Subscription Log.
- [ ] Campaign/Ad/Video IDs are mapped to human-readable names via the Marketing Registry.
- [ ] Direct traffic is clearly separated into Genuine Direct, Returning Attributed Direct, and Unknown.
- [ ] Assisted conversions matrix accurately shows discovery-to-conversion paths.
- [ ] Manual attribution corrections are logged with an audit trail.
- [ ] CSV export produces complete multi-touch attribution data.
- [ ] All unit and integration test suites pass.
