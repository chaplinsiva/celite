# Code Review: Subscription Pipeline & Autopay Renewal Reliability

> **Date:** July 23, 2026  
> **Reviewers:** Vik (Maintainability/Performance), Tara (Testing), Pierrot (Security), Archie (Architecture)  
> **Target Components:**  
> - [`app/api/payments/razorpay/subscription/route.ts`](file:///d:/cp/NC/celite-main/celite-main/app/api/payments/razorpay/subscription/route.ts)  
> - [`app/api/razorpay/webhook/route.ts`](file:///d:/cp/NC/celite-main/celite-main/app/api/razorpay/webhook/route.ts)  
> - [`app/api/subscription/check-expiry/route.ts`](file:///d:/cp/NC/celite-main/celite-main/app/api/subscription/check-expiry/route.ts)  
> - [`app/api/subscription/renew/route.ts`](file:///d:/cp/NC/celite-main/celite-main/app/api/subscription/renew/route.ts)  
> - [`app/api/payments/razorpay/verify/route.ts`](file:///d:/cp/NC/celite-main/celite-main/app/api/payments/razorpay/verify/route.ts)

---

## Executive Summary

A comprehensive multi-lens code review was performed across the subscription checkout, Razorpay autopay webhook handlers, and renewal pipelines. Overall, the subscription pipeline handles the primary happy path well and correctly preserves plan types during renewals. However, several critical and important issues were identified regarding **autopay customer mapping failures**, **webhook HMAC timing-attack risks**, **Razorpay retry handling**, and **duplicate JWT parsing**.

---

## Findings by Lens

### 🔴 Critical Findings (Must Fix)

#### 1. Unhandled Customer Creation Error Leads to Unlinked Autopay Subscriptions
- **Location:** [`app/api/payments/razorpay/subscription/route.ts:137-153`](file:///d:/cp/NC/celite-main/celite-main/app/api/payments/razorpay/subscription/route.ts#L137-L153) and [`L257-L277`](file:///d:/cp/NC/celite-main/celite-main/app/api/payments/razorpay/subscription/route.ts#L257-L277)
- **Lens:** Pierrot (Security/Integrity) & Archie (Architecture)
- **Problem:** When `POST /customers` fails on Razorpay (for example, if a customer with that email already exists in Razorpay), the `catch` block logs the error and leaves `customerId = null`. The subscription is then created without a `customer_id`.
- **Impact:** Subscriptions created without a linked `customer_id` will fail automatic recurring mandates (autopay) on Razorpay or emit webhook events without attached customer details, leading to failed subscription renewals.
- **Remediation:** If customer creation fails due to an existing email, perform a GET search query (`/customers?email=...`) to retrieve the existing `customer.id` and attach it to the subscription request.

---

### 🟡 Important Findings (Should Fix)

#### 2. Non-Timing-Safe Webhook HMAC Signature Comparison
- **Location:** [`app/api/razorpay/webhook/route.ts:70-71`](file:///d:/cp/NC/celite-main/celite-main/app/api/razorpay/webhook/route.ts#L70-L71)
- **Lens:** Pierrot (Security)
- **Problem:** The HMAC signature verification uses standard string inequality `expected !== signature`.
- **Impact:** Exposes the webhook endpoint to potential timing-side-channel attacks.
- **Remediation:** Replace string equality comparison with `crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))`.

#### 3. Immediate Deactivation on Payment Failure Ignores Razorpay Autopay Retries
- **Location:** [`app/api/razorpay/webhook/route.ts:540-570`](file:///d:/cp/NC/celite-main/celite-main/app/api/razorpay/webhook/route.ts#L540-L570)
- **Lens:** Vik (Logic & Flow)
- **Problem:** When an `invoice.payment_failed` webhook is received and `valid_until` has passed, the code immediately sets `is_active: false`. Razorpay's native autopay engine automatically attempts up to 3 retries over 7 days.
- **Impact:** Users whose cards experience a temporary bank glitch during automated renewal are immediately locked out before Razorpay completes its retry window.
- **Remediation:** Check whether Razorpay indicates the subscription status is `halted` or `cancelled` before setting `is_active: false`, or allow a grace period (e.g. 3 days) during retry attempts.

#### 4. Missing Event Idempotency on Concurrent Webhook Events
- **Location:** [`app/api/razorpay/webhook/route.ts:82-103`](file:///d:/cp/NC/celite-main/celite-main/app/api/razorpay/webhook/route.ts#L82-L103)
- **Lens:** Vik (Concurrency/Maintainability)
- **Problem:** Razorpay often fires `invoice.paid`, `invoice.payment_succeeded`, and `subscription.activated` concurrently for a single transaction. The handler processes each event independently.
- **Impact:** Duplicate database updates and multiple email trigger attempts for the same renewal cycle.
- **Remediation:** Implement event idempotency by tracking processed `event_id` or `payment_id` values in a `processed_webhooks` table or cache.

---

### 🔵 Suggestions & Refactorings

#### 5. Duplicate Manual JWT Decoding Logic
- **Location:** [`app/api/payments/razorpay/subscription/route.ts:105-134`](file:///d:/cp/NC/celite-main/celite-main/app/api/payments/razorpay/subscription/route.ts#L105-L134) & [`L211-L240`](file:///d:/cp/NC/celite-main/celite-main/app/api/payments/razorpay/subscription/route.ts#L211-L240)
- **Lens:** Vik (Code Simplicity)
- **Problem:** Manual JWT token string splitting (`parts.split('.')`) is copy-pasted in multiple routes.
- **Remediation:** Consolidate user extraction into a unified helper `getAuthUserFromHeader(req)` in [`lib/supabaseServer.ts`](file:///d:/cp/NC/celite-main/celite-main/lib/supabaseServer.ts).

#### 6. Missing Automated Webhook Test Coverage
- **Location:** Test Suite
- **Lens:** Tara (Test Quality)
- **Problem:** No automated integration tests cover the Razorpay webhook payload verification or subscription renewal flow.
- **Remediation:** Add unit/integration tests for `webhook/route.ts` simulating `invoice.paid`, `subscription.cancelled`, and `payment.failed` payloads.

---

## Action Plan & Immediate Fixes

1. **Fix Customer ID Fetching on Subscription Creation** (`subscription/route.ts`).
2. **Apply `crypto.timingSafeEqual` in Webhook Handler** (`webhook/route.ts`).
3. **Add Idempotency Check for Webhook Events**.
