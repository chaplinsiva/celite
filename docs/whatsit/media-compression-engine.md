<!-- agent-notes: { ctx: "whatsit reference page for Celite Real Media Compression Engine", deps: ["lib/mediaProcessor.ts", "app/api/admin/media/compress/route.ts"], state: active, last: "sato@2026-07-28" } -->

# Real Media Compression & Cloudflare R2 Optimizer Engine

> **One-sentence summary:** A real Node.js server-side and browser WebP image and H.264 video compression engine powered by Sharp and FFmpeg for Celite Admin Panel and Cloudflare R2 object storage.

**Website:** [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/) | [Sharp Docs](https://sharp.pixelplumbing.com/) | [FFmpeg](https://ffmpeg.org/)  
**License / Pricing:** Open Source (Apache 2.0 / LGPL / MIT) | Free Cloudflare R2 Egress  
**First released:** 2026 | **Latest stable:** Native Next.js 16 App Router Integration

---

## What Problem Does It Solve?

- **Eliminates High CDN Bandwidth Costs:** Uncompressed video previews (30MB-100MB) and large PNG thumbnails degrade page load speeds and consume excessive bandwidth.
- **Real Lossless/Near-Lossless Transcoding:** Converts heavy PNG/JPEG images into high-efficiency WebP (up to 85% size reduction) and video previews into optimized H.264 MP4 (720p/1080p CRF 26).
- **Admin Verification Safety Net:** Allows administrators to visually inspect original vs compressed previews side-by-side with exact file size savings before uploading to Cloudflare R2, with 1-click restore.

---

## How It Works

1. **Admin Inspection Trigger:** Admin selects a template in the Admin Panel (`MediaCompressorPanel.tsx`).
2. **Buffer Ingestion:** Server downloads active asset from Cloudflare R2 / CDN into Buffer memory.
3. **Sharp Processing (Images):** Resizes image to max width 1920px, auto-orients EXIF, and encodes to WebP format.
4. **FFmpeg Transcoding (Videos):** Transcodes input video using `libx264`, `crf 26`, `-preset fast`, `-movflags +faststart` for instant progressive web playback.
5. **R2 Upload & Sync:** Uploads real compressed Buffer to Cloudflare R2 `celite-previews` bucket and updates Supabase database `video_path` / `thumbnail_path`.

---

## Key Features

| Feature | Details |
|---------|---------|
| **Sharp Engine** | Sub-second high-speed WebP/JPEG conversion with configurable quality slider (50%-95%) |
| **FFmpeg Engine** | Transcodes MP4/MOV/WebM to web-optimized 720p/1080p H.264 MP4 with faststart streaming |
| **Visual Inspector** | Side-by-side video/image modal showing real file sizes and exact percentage reduction |
| **Cloudflare R2 Sync** | Direct buffer upload to `celite-previews` bucket and CDN URL mapping |
| **1-Click Restore** | Backup key retention enabling instant revert to original uncompressed file |

---

## Technical Stack & Dependencies

```json
{
  "sharp": "^0.33.5",
  "fluent-ffmpeg": "^2.1.3",
  "@ffmpeg-installer/ffmpeg": "^1.1.0"
}
```

---

## Getting Started

1. Navigate to Admin Panel (`/admin`).
2. Click **⚡ Media Compressor** tab on the sidebar.
3. Filter templates by **Uncompressed**, **Images**, or **Videos**.
4. Click **Compress WebP** or **Transcode Video** to launch side-by-side inspection.
5. Review the visual quality & size savings, then click **Approve & Upload to Cloudflare R2**.
