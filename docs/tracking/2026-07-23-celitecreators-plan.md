# Tracking: CeliteCreators.in Pay-Per-Product Marketplace Plan

> **Date:** July 23, 2026  
> **Topic:** CeliteCreators.in Pay-Per-Product Marketplace Architecture & Implementation Plan  
> **PRD & Plan Document:** [`docs/plans/2026-07-23-celitecreators-prd.md`](file:///d:/cp/NC/celite-main/celite-main/docs/plans/2026-07-23-celitecreators-prd.md)  
> **Prior Phase:** None

---

## Plan Overview

| Metric | Details |
| :--- | :--- |
| **Domain** | `celitecreators.in` |
| **Business Model** | Pay-Per-Product (A La Carte Creator Asset Purchases) |
| **Core Architecture** | Next.js 16 (App Router), React 19, Supabase Auth/PostgreSQL, Cloudflare R2, Razorpay |
| **Key Workflows** | Creator Onboarding, Product Upload, Pay-Per-Product Checkout, Presigned R2 Delivery |

---

## Implementation Roadmap & Milestones

- [ ] **Phase 1**: Database Schema & Cloudflare R2 Private/Public Bucket Setup
- [ ] **Phase 2**: Creator Onboarding (`/creator/register`) & Shop Page (`/creator/[slug]`)
- [ ] **Phase 3**: Asset Upload Portal (`/creator/upload`) & Admin Moderation Panel
- [ ] **Phase 4**: Public Home Page (`/`), Category Filter (`/category/[slug]`), & Search Grid
- [ ] **Phase 5**: Product Landing Page (`/product/[slug]`) with Interactive Preview Player
- [ ] **Phase 6**: Pay-Per-Product Razorpay Checkout & Presigned R2 Instant Delivery

---

## Acceptance Criteria

1. **Creator Onboarding**: Creators can sign up, create custom shops, and provide bank/UPI payout details.
2. **Asset Upload**: Creators can upload preview videos/images and source `.zip` files directly to Cloudflare R2.
3. **Pay-Per-Product Checkout**: Buyers can purchase individual products without a monthly subscription via Razorpay.
4. **Presigned R2 Delivery**: Validated purchases immediately issue a 60-minute presigned download URL for the private source asset.
