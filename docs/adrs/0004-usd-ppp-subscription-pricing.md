---
agent-notes: { ctx: "ADR for USD PPP subscription pricing", deps: ["AGENTS.md"], state: proposed, last: "archie@2026-08-13" }
---

# ADR-0004: USD Purchasing Power Parity (PPP) Subscription Pricing

## Status

Proposed

## Context

Currently, the Celite marketplace supports monthly and yearly subscription plans in both INR and USD.
For USD users, subscription prices were statically configured via separate settings in the database (`RAZORPAY_MONTHLY_AMOUNT_USD` and `RAZORPAY_YEARLY_AMOUNT_USD`), default to $9/mo and $59/yr.
However, we want to align the USD pricing dynamically with Purchasing Power Parity (PPP) relative to our domestic INR prices.
The required formula is:
$$USD\_PPP = INR \times 0.033$$
We also need to store this calculated PPP price (`USD_PPP`) in the database upon checkout to track user payments accurately.

## Decision

We will implement the following changes:
1. **Database Schema**: Add a nullable `usd_ppp` numeric column to both `public.subscriptions` and `public.checkout_details` tables.
2. **Dynamic Pricing Calculation**:
   - In frontend checkout page, retrieve the INR subscription prices, compute the USD PPP price using the formula, and display it to USD users.
   - Pass this `usd_ppp` value to the backend checkout details logging API.
3. **Backend Subscription Generation**:
   - In the Razorpay subscription route, if currency is USD, calculate the PPP amount in cents based on the database INR setting.
   - Upgrade the Razorpay plan reuse utility (`getOrCreatePlan`) to verify that a cached Razorpay plan matches the expected amount and currency. If not, generate a new plan on Razorpay. This ensures pricing updates on the backend propagate correctly.
   - Include `usd_ppp` in metadata and save it to the database during subscription activation and webhook event processing.

## Consequences

### Positive

- Dynamically updates USD pricing if INR prices are adjusted.
- Prevents selling at outdated rates since plans are verified on Razorpay.
- Retains transaction-level PPP data for finance and analytics.

### Negative

- Requires altering two database tables (`checkout_details` and `subscriptions`).
- Relies on currency settings on the client checkout page to trigger the calculation.

### Neutral

- Reuses existing checkout schemas with the additional field.
- Creates new Razorpay plans automatically when prices change.
