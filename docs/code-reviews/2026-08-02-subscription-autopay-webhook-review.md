<!-- agent-notes: { ctx: "Multi-lens code review for subscription payment flow and autopay webhooks", deps: [docs/methodology/personas.md, app/api/razorpay/webhook/route.ts, __tests__/subscription-webhook.test.ts], state: active, last: "vik@2026-08-02" } -->

# Code Review: Subscription Payment Flow & Autopay Webhooks

**Date:** 2026-08-02  
**Reviewers:** Vik (Simplicity/Maintainability), Tara (Test Quality), Pierrot (Security)  
**Topic:** Razorpay Subscription Checkout, HMAC Webhook Verification, Next-Month Autopay Renewal, and Unit Test Coverage

---

## Executive Summary

This review covers the implementation and test suite for the Razorpay subscription payment pipeline, next-month recurring autopay renewals, HMAC signature verification, and automated unit testing via Vitest.

---

## Findings by Lens

### Lens 1: Vik (Simplicity, Maintainability & Performance)
- **State Preservation (Clean)**: `resolveSubscriptionIdentifiers` cleanly extracts `user_id` and `razorpay_subscription_id` from multi-nested webhook payloads (`subscription`, `invoice`, `payment`), keeping helper functions simple.
- **Idempotency (Clean)**: Existing active subscriptions preserve their original plan type (`monthly` or `yearly`) during recurring billing events, avoiding accidental plan downgrades or regressions.
- **Performance (Clean)**: Database queries utilize `maybeSingle()` and index lookups on `user_id` and `razorpay_subscription_id`, preventing full-table scans.

### Lens 2: Tara (Test Quality & Coverage)
- **Signature Security Tests (Clean)**: Tests verify that missing or forged `x-razorpay-signature` headers return HTTP 400 immediately.
- **Activation Flow Tests (Clean)**: Unit tests verify `subscription.activated` correctly inserts new subscription records with `is_active: true` and `autopay_enabled: true`.
- **Autopay Renewal Tests (Clean)**: Tests verify `invoice.payment_succeeded` on existing subscriptions extends `valid_until` to the next cycle end timestamp without changing the plan.

### Lens 3: Pierrot (Security Surface)
- **HMAC Verification (Clean)**: HMAC-SHA256 signature verification guarantees payload authenticity before any database queries execute.
- **Service Role Isolation (Clean)**: Administrative database modifications use `getSupabaseAdminClient()`, keeping secrets strictly on the server.
- **IDOR Protection (Clean)**: User IDs in webhook notes are cross-referenced with existing subscription records in the database.

---

## Lessons & Key Takeaways

1. **Explicit Signature Guards**: Webhook endpoints must check signature headers before parsing bodies or executing database lookups to prevent DoS vector exploitation.
2. **Deterministic Cycle Extension**: Relying on Razorpay's `current_end` or `period_end` timestamps provides reliable expiration calculations across leap years and variable month lengths.
