<!-- agent-notes: { ctx: "Code review for product page real DB subscription pricing", deps: ["app/product/[slug]/page.tsx", "app/product/[slug]/ProductDetails.tsx"], state: complete, last: "sato@2026-07-28" } -->
# Code Review: Product Page Real DB Subscription Pricing

**Date:** 2026-07-28  
**Topic:** Replacing hardcoded mock price (`₹799`) on Product Details page with dynamic database settings  
**Reviewers:** Vik (Simplicity & Maintainability), Tara (Test Quality & Coverage), Pierrot (Security Surface)

---

## Context & Purpose
The product details page (`app/product/[slug]/page.tsx` and `ProductDetails.tsx`) previously contained hardcoded mock subscription price UI elements (`₹799`). This change fetches the canonical `RAZORPAY_MONTHLY_AMOUNT` setting from the database (`settings` table) inside the Server Component (`page.tsx`) and passes the converted display amount (`monthlyPrice`) into the client UI component (`ProductDetails.tsx`), formatting it dynamically via `formatPrice(...)`.

---

## Lens 1: Vik (Simplicity, Maintainability & Performance)

### Findings
- **Clean Server Component Fetching:** Fetching `settings` inside `app/product/[slug]/page.tsx` using `Promise.all` alongside template metadata adds zero sequential round-trips to page loading.
- **Single Source of Truth:** Converts paise values stored in DB (e.g. `79900`) using canonical helper `paiseToINR` from `lib/priceUtils.ts` and formats using `formatPrice` from `lib/currency.ts`.
- **Graceful Fallback:** Provides fallback default (`monthlyPrice ?? 799`) in case DB settings are temporarily absent or being seeded.

### Verdict
- **Status:** Passed cleanly.

---

## Lens 2: Tara (Test Quality & Coverage)

### Findings
- **Fallback Verification:** Fallback logic correctly handles `null` / `undefined` values during initial renders or SSR fallback states.
- **Prop Synchronization:** `ProductDetailsProps` and `SubscriptionCard` prop types explicitly reflect `monthlyPrice?: number | null` to prevent runtime `NaN` formatting issues.
- **Edge Cases:** If `RAZORPAY_MONTHLY_AMOUNT` is updated in DB (e.g. promotional prices or regional currency changes), both Desktop and Mobile subscription cards dynamically display the exact price.

### Verdict
- **Status:** Passed cleanly.

---

## Lens 3: Pierrot (Security Surface)

### Findings
- **No Secret Exposure:** Only public subscription metadata (`RAZORPAY_MONTHLY_AMOUNT`) is fetched. Secrets such as API private keys remain isolated.
- **Sanitized Server Queries:** DB select queries are parameterized via Supabase client, preventing injection.
- **IDOR / Auth Protection:** Subscription price display is non-sensitive public metadata visible to all prospective subscribers.

### Verdict
- **Status:** Passed cleanly.

---

## Summary of Findings

| Severity | Count | Issue Summary |
| --- | --- | --- |
| **Critical** | 0 | None |
| **Important** | 0 | None |
| **Suggestion** | 0 | Clean bill of health |

---

## Key Lessons
1. **Always fetch public configuration server-side:** Fetching settings in App Router Server Components eliminates extra client-side loading spinners and prevents layout shifts.
2. **Reuse canonical price utilities:** Using `paiseToINR` and `formatPrice` maintains UI consistency across Checkout, Pricing, and Product Details pages.
