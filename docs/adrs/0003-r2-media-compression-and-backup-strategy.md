<!-- agent-notes: { ctx: "ADR 0003: R2 media compression & original backup keying strategy", deps: ["lib/r2Client.ts", "lib/utils.ts"], state: complete, last: "archie@2026-07-28" } -->
# ADR 0003: Cloudflare R2 Media Compression & Original Asset Backup Strategy

**Status:** Accepted  
**Date:** 2026-07-28  
**Deciders:** Archie (Software Architect), Wei (Infrastructure & Security), Sato (Lead Implementation)

---

## Context & Problem Statement
High-bitrate video previews and heavy uncompressed image thumbnails uploaded by creators impact user experience and CDN bandwidth costs. When compressing assets (converting videos to 720p/1080p MP4 and images to optimized WebP), administrators need a reliable way to inspect compressed assets side-by-side with originals, upload them to Cloudflare R2, and maintain a backup of original assets for 1-click restore.

---

## Decision Drivers
- Fast page load performance (compressed preview videos <5MB, WebP thumbnails <200KB).
- Safety against quality degradation via instant 1-click restore.
- Clean keying convention in Cloudflare R2 preview bucket (`celite-previews`).

---

## Technical Decision

### 1. Cloudflare R2 Keying Convention for Originals & Compressed Assets
- **Active Preview Assets:** Stored in `previews/{category}/{slug}-preview.mp4` (video) and `previews/{category}/{slug}-thumb.webp` (image).
- **Backup Original Assets:** When compressed for the first time, original assets are archived into `previews/originals/{slug}-original-{timestamp}.{ext}`.
- **Database Backup Reference:** The original key is saved in the template record or setting metadata as `original_video_path` / `original_thumbnail_path`.

### 2. Compression Engine Pipeline
- **Image Previews / Thumbnails:** Client-side HTML5 Canvas / OffscreenCanvas encoding to WebP at 82% quality with real-time visual side-by-side inspection.
- **Video Previews:** Server API route (`/api/admin/media/compress`) using FFmpeg / video optimization pipeline converting to H.264 720p/1080p MP4.

### 3. Restore Strategy
- 1-click restore API (`/api/admin/media/restore`) copies the archived original from `previews/originals/...` back to the active preview key in Cloudflare R2 and updates Supabase database records.

---

## Consequences
- **Positive:** Reduces preview bandwidth by 60-85%, provides immediate safety net with 1-click restore.
- **Negative:** Storage usage in R2 slightly increases until archived originals are purged.
