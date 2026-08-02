# Product Requirements Document (PRD): CeliteCreators.in

> **Target Domain:** `celitecreators.in`  
> **Product Name:** Celite Creators Marketplace  
> **Business Model:** Pay-Per-Product (A La Carte Creator Asset Purchases)  
> **Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Supabase, Cloudflare R2, Razorpay  
> **Status:** Draft / Approved for Architecture & Implementation  
> **Date:** July 23, 2026

---

## 1. Product Vision & Goals

**CeliteCreators.in** is a dedicated pay-per-product marketplace connecting digital asset creators (video editors, 3D artists, graphic designers, sound engineers) with buyers looking to purchase individual premium templates and assets on demand without requiring a monthly subscription.

### Key Success Metrics
- **Creator Onboarding Rate:** Target 100+ active creator shops within Q1.
- **Conversion Rate:** High-converting single-product checkout flow (< 2 clicks to Razorpay modal).
- **Creator Payout Accuracy:** Automated 70/30 or 80/20 revenue split calculation per single-product sale.
- **Asset Security:** 100% presigned secure downloads via Cloudflare R2 bucket storage.

---

## 2. Core User Roles & Workflows

```
┌───────────────────────────┐      ┌───────────────────────────┐      ┌───────────────────────────┐
│        BUYER FLOW         │      │       CREATOR FLOW        │      │        ADMIN FLOW         │
├───────────────────────────┤      ├───────────────────────────┤      ├───────────────────────────┤
│ 1. Browse / Search Asset  │      │ 1. Sign up & Apply Shop   │      │ 1. Review & Approve Shop  │
│ 2. Preview Video/Image    │      │ 2. Enter Payout / Bank    │      │ 2. Moderate Asset Uploads │
│ 3. Pay per Product        │      │ 3. Upload Asset & Source  │      │ 3. Process Payouts        │
│ 4. Instant R2 Download    │      │ 4. Track Sales & Payouts  │      │ 4. Platform Analytics     │
└───────────────────────────┘      └───────────────────────────┘      └───────────────────────────┘
```

---

## 3. Detailed Feature & Page Specifications

### 3.1 Home Page (`/`)
- **Hero Section**: High-impact value proposition, search bar with auto-suggestions, trending tags pill bar.
- **Featured Categories Grid**: Video Templates, After Effects, 3D Models, Stock Photos, Music & SFX, Web Templates, Graphics.
- **Creator Showcase Carousel**: Highlighting top-rated creator shops with follower count and total sales badges.
- **Trending Products Grid**: Real-time popular assets with price badge (e.g. ₹299, ₹499), ratings, thumbnail preview on hover.
- **Call-to-Action Banner**: "Become a Creator on Celite — Keep up to 80% of every sale".

### 3.2 Creator Onboarding & Shop Page (`/creator/[slug]`)
- **Creator Registration & KYC**:
  - Sign up via Supabase Auth (Google OAuth or Email).
  - Submit Shop Name, Bio, Avatar, Portfolio link, and Bank details (UPI ID, Account #, IFSC, Bank Name).
- **Public Creator Shop (`/creator/[slug]`)**:
  - Custom header banner, profile image, badges, follower button.
  - Creator's published asset catalog grid with sorting & filtering.
  - Creator statistics (Total Assets, Sales Count, Rating).

### 3.3 Creator Dashboard & Upload Portal (`/creator` or `/creator/dashboard`)
- **Asset Upload Flow (`/creator/upload`)**:
  - **Step 1: Basic Info**: Title, Slug, Description, Subtitle, Tags, Category & Subcategory selection.
  - **Step 2: Pricing & License**: Set price in INR (e.g. ₹199, ₹499, ₹999), commercial license selection.
  - **Step 3: Media Previews**: Upload thumbnail image, video preview (H.264/MP4), or audio preview.
  - **Step 4: Source File Upload**: Drag-and-drop zip file directly to Cloudflare R2 bucket via presigned upload URL.
  - **Step 5: Review Submission**: Status defaults to `pending` until Admin approval.
- **Sales & Earnings Analytics**:
  - Monthly gross sales, platform commission, net earnings.
  - Payout request button (minimum threshold ₹1,000).

### 3.4 Product Page (`/product/[slug]`)
- **Interactive Preview Player**: Video thumbnail preview player with mute/play controls, 3D canvas loader (if 3D asset), or audio player.
- **Buy Now Action Card**:
  - Display price in INR (e.g. ₹399).
  - Instant **"Buy & Download"** button launching Razorpay checkout.
  - Instant file download token generation upon payment confirmation.
- **Asset Specifications Table**: Compatible software (After Effects CC, Premiere Pro, Blender, Figma), resolution (4K, Full HD), plugins required, file size.
- **Creator Profile Snippet**: Link to creator shop, direct message button.
- **Customer Reviews & Ratings**: 5-star rating system with verified buyer badges.

### 3.5 Category & Search Page (`/category/[slug]` or `/browse`)
- **Comprehensive Filter Sidebar**: Price range slider, software compatibility checkboxes, resolution filter, rating filter.
- **Sorting Options**: Popularity, Newly Added, Price Low-to-High, Price High-to-Low.
- **Responsive Asset Grid**: 3-column desktop / 2-column tablet / 1-column mobile grid layout.

---

## 4. Technical Architecture & Database Blueprint

### Supabase Database Schema

```sql
-- 1. Creator Shops Table
CREATE TABLE public.creator_shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    profile_image_url TEXT,
    banner_image_url TEXT,
    bank_account_number TEXT,
    bank_ifsc TEXT,
    bank_upi_id TEXT,
    bank_account_name TEXT,
    direct_upload_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Marketplace Products Table
CREATE TABLE public.templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_shop_id UUID REFERENCES public.creator_shops(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    subtitle TEXT,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    is_free BOOLEAN DEFAULT false,
    category_id UUID REFERENCES public.categories(id),
    subcategory_id UUID REFERENCES public.subcategories(id),
    thumbnail_path TEXT,
    preview_path TEXT,
    video_path TEXT,
    audio_preview_path TEXT,
    source_path TEXT NOT NULL, -- Private R2 Key
    software JSONB DEFAULT '[]'::jsonb,
    plugins JSONB DEFAULT '[]'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Pay-Per-Product Orders Table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    total NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'failed'
    razorpay_order_id TEXT UNIQUE,
    razorpay_payment_id TEXT,
    billing_name TEXT,
    billing_email TEXT,
    billing_mobile TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Order Items Table
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    template_slug TEXT REFERENCES public.templates(slug),
    creator_shop_id UUID REFERENCES public.creator_shops(id),
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Creator Payout Requests Table
CREATE TABLE public.creator_payout_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_shop_id UUID REFERENCES public.creator_shops(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processed', 'rejected'
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### Cloudflare R2 Bucket Structure & Security

- **Public Bucket (`celite-public`)**:
  - `/previews/videos/{slug}.mp4`
  - `/thumbnails/{slug}.jpg`
  - `/creator-avatars/{creator_id}.png`
- **Private Secure Bucket (`celite-private`)**:
  - `/source-files/{creator_id}/{slug}.zip`
  - *Access Protocol:* Server-side presigned URLs generated via `@aws-sdk/s3-request-presigner` expiring in 60 minutes after verified order payment.

### Razorpay Integration Strategy

1. **Order Creation (`POST /api/payments/razorpay/order`)**:
   - Creates a Razorpay Order (`/orders`) for single item or cart.
   - Saves order notes (`user_id`, `template_slug`, `creator_shop_id`).
2. **Payment Verification (`POST /api/payments/razorpay/verify`)**:
   - Verifies HMAC SHA256 signature (`crypto.timingSafeEqual`).
   - Inserts row into `orders` and `order_items`.
   - Grants download permission and returns signed Cloudflare R2 download link.

---

## 5. Implementation Phases & Roadmap

```
Phase 1: Database & Storage Foundations
  - Supabase tables (creator_shops, templates, orders)
  - Cloudflare R2 S3 client configuration & presigned URL helper

Phase 2: Creator Onboarding & Asset Upload Portal
  - Creator Registration & KYC flow
  - Upload Asset Page with R2 direct upload & metadata form

Phase 3: Core Marketplace Pages & Search
  - Home Page (`/`), Category Page (`/category/[slug]`), Creator Shop (`/creator/[slug]`)
  - Filter & Sort components

Phase 4: Product Page & Pay-Per-Product Razorpay Checkout
  - Interactive preview player component
  - Single-product purchase modal & instant presigned R2 download delivery

Phase 5: Testing, Admin Moderation & Launch
  - Admin approval workflow for creator products
  - End-to-end payment & download testing
```
