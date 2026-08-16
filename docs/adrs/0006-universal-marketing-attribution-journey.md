---
agent-notes:
  ctx: "ADR for Universal Marketing Attribution & Customer Journey Tracking System"
  deps: ["supabase_migrations/52_universal_marketing_attribution.sql", "lib/attribution.ts", "components/AttributionTracker.tsx"]
  state: active
  last: "archie@2026-08-16"
---

# 0006. Universal Marketing Attribution & Customer Journey Tracking System

## Context
Celite previously tracked high-level first-touch and last-touch parameters on users and subscriptions. However, as marketing channels expanded across Instagram Paid/Organic, Facebook Paid/Organic, YouTube Organic/Paid, Google Ads/Organic, search engines, AI assistants (ChatGPT, Claude, Perplexity), referral websites, WhatsApp, and email, several critical capabilities were needed:

1. **Full Chronological Customer Journey**: Maintaining an append-only sequence of touches and page/product interactions so multi-touch assisted conversions (e.g. `Instagram Paid → Google Organic → Direct → Subscription`) can be understood without overwriting historical discovery data.
2. **Marketing Content Registry**: Resolving opaque platform IDs (Meta Ad IDs, YouTube Video IDs, Google Campaign IDs) into human-readable names across all logs, analytics, and journeys.
3. **Direct Traffic Disambiguation**: Differentiating Genuine Direct, Returning Attributed Direct (previously introduced by a known campaign), and Unknown/Missing Referrer traffic under a strict zero-guessing policy.
4. **Identity Stitching**: Reliably joining pre-login anonymous visitor sessions with post-login authenticated user profiles without losing past events.
5. **Audited Manual Corrections**: Allowing administrators to correct attribution records when verified offline context exists, while preserving raw tracking data and recording an audit trail.

## Decision

1. **Append-Only Touchpoint Event Stream (`visitor_touchpoints`)**:
   - Ingest every distinct visit, marketing touchpoint, page milestone (`landing`, `homepage`, `category_view`, `product_view`, `pricing_view`), and conversion step (`checkout_started`, `payment_success`, `subscription_created`).
   - Store device type, browser, OS, platform click IDs (`gclid`, `fbclid`, `dclid`, `msclkid`, `ttclid`, `utm_id`), referrer URL, and domain.
   - Enforce automatic sanitization to strip passwords, tokens, auth codes, and secret keys.

2. **Marketing Content Registry (`marketing_sources_registry`)**:
   - Maintain an internal registry table mapping platform identifiers (`campaign_id`, `adset_id`, `ad_or_video_id`, `content_id`) to friendly display names (`campaign_name`, `ad_or_video_name`, etc.), destination URLs, and product associations.
   - Dynamically resolve readable names in analytics, subscription logs, and journey timelines.

3. **Multi-Tier Identity Stitching**:
   - Maintain `anonymous_id` (persisted client UUID), `session_id` (rolling 30-minute inactivity boundary), and `user_id` (authenticated Supabase UID).
   - On signup, login, or checkout initialization, trigger an attribution sync that retroactively associates anonymous touchpoints with the authenticated `user_id`.

4. **Zero-Guessing Direct Disambiguation & Confidence Scoring**:
   - **High Confidence**: Verified UTM parameters or platform click IDs matching registered campaigns.
   - **Medium Confidence**: Known external domain referrers without campaign tags.
   - **Low Confidence**: Missing referrers, pure direct, or untagged webviews.
   - Traffic categorized as:
     - `Genuine Direct`: Direct navigation with no previous known touches.
     - `Direct (Previously Attributed)`: Direct session where earlier touchpoints exist in the journey.
     - `Unknown / Referrer Missing`: Opaque webviews or privacy-restricted browsers with no referrer.

5. **Permanent Financial Snapshot with Audit Trail**:
   - On successful subscription creation (via Razorpay webhook or activation endpoint), stamp an immutable `subscription_attributions` snapshot containing first/last touch metadata, platform-specific IDs, touch counts, and confidence scores.
   - Support admin manual corrections with `is_manually_corrected`, `corrected_by`, `corrected_at`, `correction_reason`, and `original_attribution` JSON snapshots.

## Consequences

### Positive
- 100% database-backed revenue attribution tied directly to payment transactions.
- Transparent visualization of complete multi-touch paths in admin subscription logs.
- High clarity on campaign and creative performance through human-readable name mapping.
- Accurate distinction between new direct visitors and returning multi-touch customers.

### Trade-offs & Mitigations
- Increased event stream row volume: mitigated by indexing on `anonymous_id`, `user_id`, `session_id`, and `created_at`, plus client-side debouncing of internal navigation events.
- Client ad-blockers / storage clearance: mitigated by graceful fallback to server headers, referrer extraction, and explicit "Low Confidence / Unknown" classification rather than false attribution.
