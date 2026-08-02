# Tracking: Subscription Pipeline & Autopay Code Review

> **Date:** July 23, 2026  
> **Topic:** Subscription Pipeline & Autopay Reliability Review  
> **Review Document:** [`docs/code-reviews/2026-07-23-subscription-pipeline-and-autopay-review.md`](file:///d:/cp/NC/celite-main/celite-main/docs/code-reviews/2026-07-23-subscription-pipeline-and-autopay-review.md)

---

## Review Summary

| Lens | Lead | Status | Findings |
| :--- | :--- | :---: | :--- |
| **Simplicity & Performance** | Vik | 🟡 Issues Found | Duplicate JWT parsing, missing event idempotency |
| **Test Coverage** | Tara | 🟡 Issues Found | Missing webhook integration tests |
| **Security Surface** | Pierrot | 🔴 Critical Issue | Non-timing-safe HMAC comparison, fallback customer creation failure |
| **Architecture & Migrations** | Archie | 🟢 Good | Plan preservation logic intact |

---

## Findings Overview

- **Critical:** 1 (Razorpay Customer ID fallback missing on subscription creation)
- **Important:** 3 (`crypto.timingSafeEqual` missing, immediate deactivation on temporary payment failure, concurrent event processing)
- **Suggestions:** 2 (JWT token helper refactoring, test suite addition)

---

## Resolution Status

- [ ] Implement Razorpay Customer lookup fallback on duplicate email error ([`app/api/payments/razorpay/subscription/route.ts`](file:///d:/cp/NC/celite-main/celite-main/app/api/payments/razorpay/subscription/route.ts#L137-L153))
- [ ] Replace `===` with `crypto.timingSafeEqual` in [`app/api/razorpay/webhook/route.ts`](file:///d:/cp/NC/celite-main/celite-main/app/api/razorpay/webhook/route.ts#L70-L71)
- [ ] Add event deduplication for concurrent `invoice.paid` / `subscription.activated` webhooks
