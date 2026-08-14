---
agent-notes: { ctx: "Architecture Decision Record for Razorpay subscription payment and next-month autopay webhook handling", deps: [docs/adrs/template.md, app/api/razorpay/webhook/route.ts, lib/razorpay.ts], state: canonical, last: "archie@2026-08-02" }
---

# ADR-0003: Razorpay Subscription Payment & Next-Month Autopay Webhook Architecture

## Status

Accepted

## Context

Celite operates on a recurring digital asset subscription model (Monthly / Yearly plans). When users subscribe, Razorpay manages automated recurring billing cycles ("autopay"). To ensure uninterrupted access while preserving data integrity:
1. Webhooks from Razorpay (`subscription.activated`, `invoice.payment_succeeded`, `invoice.paid`, `subscription.charged`, `subscription.halted`, `subscription.cancelled`) arrive asynchronously.
2. Webhooks must verify cryptographic authenticity using HMAC-SHA256 signatures to prevent forgery and unauthorized subscription escalation.
3. Recurring monthly/yearly charges must seamlessly extend subscription expiration dates (`valid_until`) without overwriting user plan types or reactivating explicitly cancelled accounts.

## Decision

We establish the following architectural conventions for Razorpay subscription payment and webhook handling:

1. **HMAC-SHA256 Cryptographic Verification**:
   - Every incoming webhook at `/api/razorpay/webhook` MUST verify `x-razorpay-signature` against the raw payload string using `RAZORPAY_WEBHOOK_SECRET`. Unsigned or invalid signature payloads are immediately rejected with HTTP 400.

2. **Idempotency & State Preservation**:
   - Webhook processing prioritizes existing subscription records in Supabase (`subscriptions` table).
   - For recurring autopay payments (`invoice.payment_succeeded`), the system preserves the existing `plan` (e.g. `monthly` or `yearly`) and extends `valid_until` based on Razorpay's `current_end` cycle timestamp or explicit calendar duration addition (+1 month / +1 year).
   - `autopay_enabled` is set to `true` on active billing cycles, and updated timestamps (`updated_at`) track billing execution.

3. **Protection Against Unintended Reactivations**:
   - Cancelled subscriptions (`is_active: false`) are guarded against auto-reactivation from retried webhook events unless accompanied by a newly generated `razorpay_subscription_id`.

4. **Service Role Security**:
   - Webhook operations access Supabase strictly through `getSupabaseAdminClient()` on the server side, ensuring database updates bypass RLS safely while keeping credentials hidden from client bundles.

## Consequences

### Positive

- **Reliable Autopay Renewals**: Next-month recurring charges automatically extend subscription duration without manual intervention.
- **Robust Security Surface**: HMAC signature checks and timing-safe payload comparisons protect against web requests spoofing payment completion.
- **Plan Consistency**: Existing plan choices (monthly vs yearly) are preserved across recurring billing cycles.

### Negative

- **Webhook Dependency**: If Razorpay webhooks experience network delays, user subscription extensions rely on asynchronous event processing.

### Neutral

- **Event Filtering**: Duplicate events (`invoice.payment_succeeded` vs `invoice.paid`) skip duplicate email notifications to prevent inbox spamming.
