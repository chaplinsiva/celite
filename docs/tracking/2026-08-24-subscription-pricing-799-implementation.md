# Tracking: Subscription Pricing Return to ₹799 (Limited Offer)

<!-- agent-notes: { ctx: "TDD completion report for ending 499 offer and returning to 799", deps: ["docs/process/tracking-protocol.md"], state: active, last: "tara@2026-08-24" } -->

## Summary
- **Feature**: Conclude 3rd Anniversary ₹499 promotion and return monthly subscription pricing to ₹799/month (~~₹899~~ ₹799 Limited Offer).
- **Date**: 2026-08-24
- **Author**: Tara (TDD workflow)
- **Status**: Completed & Verified

---

## What Was Built & Updated

1. **Database Migration**:
   - Created [53_end_anniversary_offer_return_to_799.sql](file:///d:/celite-main/celite-main/supabase_migrations/53_end_anniversary_offer_return_to_799.sql) ensuring `RAZORPAY_MONTHLY_AMOUNT` in `settings` is set to `79900` paise (₹799).

2. **Legacy Autopay & Resubscription Workflow**:
   - Fixed webhook activation & renewal logic in [route.ts](file:///d:/celite-main/celite-main/app/api/razorpay/webhook/route.ts):
     - Existing ₹499 autopay subscribers continue charging and renewing seamlessly at ₹499 through their active Razorpay mandate without disruption.
     - Subscriptions that were cancelled and are re-subscribed via checkout trigger a new subscription at the current active price of ₹799 (79,900 paise).
     - Default monthly amount fallback updated from legacy `59900` to `79900`.

3. **UI Updates Across All Surfaces**:
   - [PromoBanner.tsx](file:///d:/celite-main/celite-main/components/PromoBanner.tsx): Updated badge to **Limited Time Offer** and price to **~~₹899~~ ₹799/month** with unlimited downloads.
   - [Hero.tsx](file:///d:/celite-main/celite-main/components/Hero.tsx): Updated right pricing card to **~~₹899~~ ₹799/month** with "Limited Offer" badge and "Limited Time Special Offer" subtext.
   - [PricingContent.tsx](file:///d:/celite-main/celite-main/app/pricing/PricingContent.tsx): Updated hero badge, monthly card subtext (⚡ Limited Time Offer - Save ₹100), and dynamic annual savings comparison.
   - [ProductDetails.tsx](file:///d:/celite-main/celite-main/app/product/%5Bslug%5D/ProductDetails.tsx): Updated `SubscriptionCard` monthly fallback price to 799, removed anniversary labels in favor of "Free Gift" and "Limited Offer".
   - [page.tsx](file:///d:/celite-main/celite-main/app/checkout/page.tsx): Validated checkout summary displays ~~₹899~~ ₹799 for monthly plan.
   - [SpecialOfferPanel.tsx](file:///d:/celite-main/celite-main/app/admin/components/SpecialOfferPanel.tsx) & [route.ts](file:///d:/celite-main/celite-main/app/api/admin/special-offer-stats/route.ts): Dynamic revenue estimation and clean plan labels.

4. **TDD Test Suite**:
   - Created [subscription-pricing-and-offer.test.ts](file:///d:/celite-main/celite-main/__tests__/subscription-pricing-and-offer.test.ts) covering:
     - Price resolution from database settings (₹799 / 79900 paise).
     - Legacy ₹499 autopay renewal preservation.
     - Cancelled user re-subscribing at ₹799.
     - Yearly savings calculation against ₹799 monthly.

---

## Test Results
- **Total Test Files**: 10 passed
- **Total Tests**: 43 passed (100% passing)
- **Execution Time**: ~4.5s
