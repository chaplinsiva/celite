# Celite — Change Log

> This document tracks all changes made to the Celite project.
> Format follows [Keep a Changelog](https://keepachangelog.com/).
> Update this document whenever modifications are made to the codebase.

---

## How to Use This Document

When a new change is made, add an entry under the appropriate date heading with these categories:

- **Added** — New features or files
- **Changed** — Modifications to existing functionality
- **Fixed** — Bug fixes
- **Removed** — Removed features or files
- **Security** — Security-related changes
- **Database** — Schema migrations or data changes

---

## [Baseline] — 2026-07-02

### Documented — Initial Project Analysis

This is the initial baseline snapshot of the Celite project. The following was documented:

#### Project State Summary
- **Framework**: Next.js 16 (App Router) with TypeScript 5, React 19
- **Styling**: Tailwind CSS v4 with custom theme tokens and animations
- **Database**: Supabase PostgreSQL with 12+ tables, full RLS policies
- **Storage**: Cloudflare R2 dual-bucket architecture (private + public)
- **Payments**: Razorpay integration (monthly ₹799, yearly ₹5,499)
- **Email**: Nodemailer SMTP via Hostinger (5 email templates)
- **Deployment**: Netlify with Next.js plugin, Node 20
- **SEO**: next-sitemap, JSON-LD structured data, Google Analytics GA4

#### Page Count
| Type | Count |
|---|---|
| Public pages/routes | 18 |
| API route handlers | 34 |
| Admin panel modules | 13 |
| Shared components | 51 |
| UI primitives | 33 |
| SQL migration files | 52 |

#### Known Issues at Baseline
- `package.json` requires Node 20.x but project was installed with Node 25.8.1
- 33 npm audit vulnerabilities (1 low, 25 moderate, 6 high, 1 critical)
- `node-domexception@1.0.0` deprecated dependency
- Some deprecated R2 functions still present (`uploadToR2`, `deleteFromR2`, `getFileFromR2`)
- Duplicate `@keyframes` definitions in `globals.css` (rainbow, marquee, fadeSlideIn, etc.)

---

## [2026-07-02] — Analytics Improvements & Template Performance

### Added
- New **Template Performance** section in Analytics panel (`AnalyticsPanel.tsx`)
  - Side-by-side display of **Top 5** and **Least 5** performing templates
  - Performance ranked by **Score = Downloads ÷ Days** formula
  - For time-bounded ranges (7d/30d/90d/365d): divides by the range days
  - For "All Time": divides by **Days Since Published** (per-template)
  - Visual progress bars, gold/silver/bronze rank badges, score `/day` display
  - Independent time range selector with 📅 / ♾️ emoji labels
- API now returns `template_created_at` in download records for score calculation
- New **Renewal Rate** tab in Detailed Analytics section (`AnalyticsPanel.tsx`)
  - Circular gauge showing overall renewal rate with color coding (green ≥70%, amber ≥40%, red <40%)
  - Summary cards: Renewed, Churned, Total Due, Autopay Retention %
  - Renewed breakdown: Autopay vs Manual split
  - Plan-wise renewal bars: Monthly and Yearly with individual rates
  - Independent time range selector (30d / 90d / 365d / All time)

### Changed
- Modified `app/admin/components/AnalyticsPanel.tsx` — Added client-side pagination to the "Recent Downloads" section
  - Displays **20 rows per page** with Previous/Next navigation buttons
  - Shows total download count badge and "Showing X–Y of Z" info
  - Page resets to 1 when data is reloaded (filters change, real-time update, etc.)
  - Pagination controls only appear when there are more than 20 downloads
- Modified `app/admin/components/SubscriptionLogPanel.tsx` — Added client-side pagination to the Subscription Log
  - Displays **20 entries per page** with Previous/Next navigation and page info
  - Page automatically resets to 1 when filter tab or search text changes
  - Shows "Showing X–Y of Z entries" and "Page N of M" indicators

### Fixed
- Fixed WhatsApp links in Active and Expired/Cancelled subscription tables not opening the user's number
  - **Root cause**: Phone numbers were only fetched from `users_view` (auth phone field), which most users don't have
  - **Fix**: Modified `app/api/admin/analytics/route.ts` to also fetch `billing_mobile` from `checkout_details` table, which contains the phone number users entered during checkout
  - Now WhatsApp links correctly open with the user's actual phone number pre-filled

---

## [Unreleased]

_No unreleased changes yet. Future modifications will be logged here._

<!-- 
============================================================================
TEMPLATE FOR NEW ENTRIES — Copy and fill in when making changes:
============================================================================

## [YYYY-MM-DD] — Brief Description of Change

### Added
- New file: `path/to/file.tsx` — Description
- New API endpoint: `/api/example` — Purpose

### Changed
- Modified `path/to/file.tsx` — What changed and why
- Updated dependency `package-name` from vX to vY

### Fixed
- Fixed bug in `path/to/file.tsx` — Description of the bug and fix

### Removed
- Removed `path/to/old-file.tsx` — Reason

### Security
- Updated `package-name` to patch CVE-XXXX-XXXXX

### Database
- Migration: `supabase_migrations/XX_description.sql` — What it does
- Added column `column_name` to `table_name`

-->
