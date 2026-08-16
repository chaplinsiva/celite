---
agent-notes: { ctx: "Celite SEO Blogs engine and 5 initial long-form articles plan", deps: ["data/blogData.ts", "app/blogs/page.tsx", "app/blogs/[slug]/page.tsx"], state: active, last: "sato@2026-08-16" }
---

# Plan: Celite Blog Engine & 5 SEO-Driven Articles

## Goal
Establish a high-converting, SEO-optimized Blog platform at `/blogs` and `/blogs/{slug}` to boost Celite's organic search visibility, capture high-intent video creator queries, and guide visitors towards Celite's subscription and template catalogs.

## 5 Initial SEO Articles (Written by Celite)
1. **`top-10-after-effects-wedding-templates-2026`**: Top 10 After Effects Wedding & Save the Date Templates for 2026
2. **`how-to-create-cinematic-save-the-date-videos`**: How to Create Cinematic Save the Date Videos in After Effects (Step-by-Step Guide)
3. **`best-royalty-free-music-and-sfx-for-video-editors`**: The Ultimate Guide to Royalty-Free Music & SFX for Video Editors in 2026
4. **`mastering-3d-elements-in-after-effects-motion-graphics`**: Mastering 3D Elements and Models in After Effects: A Modern Motion Designer's Playbook
5. **`why-video-templates-save-creators-100-hours`**: Why Video Templates Are the Secret Weapon of High-Earning Creators & Agencies

## Architecture & Design
- **Visual Aesthetic**: Signature Celite Theme (Obsidian base `#0d0f17` → `#0a0b10` → `#07080c`, floating royal/electric blue borders, radial light flares, glassmorphic badges, high-contrast typography).
- **SEO & Structured Data**:
  - `generateMetadata`: dynamic titles, descriptions, canonical URLs, and OpenGraph/Twitter cards.
  - JSON-LD schemas: `BlogPosting` / `Article`, `BreadcrumbList`, and `FAQPage`.
- **SSG Delivery**: `generateStaticParams` pre-renders all 5 articles at build time.
- **Sitemap Integration**: Dynamic Next.js sitemap (`app/sitemap.ts`) including `/blogs` and all `/blogs/{slug}` URLs.
