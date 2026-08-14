---
agent-notes: { ctx: "Feature plan for Admin Panel Video Preview Compressor", deps: [AGENTS.md, app/admin/AdminClient.tsx, lib/r2Client.ts], state: active, last: "pat@2026-08-02" }
---

# Plan: Admin Video Preview Compressor

## Goal
Provide administrators with a dedicated **Video Preview Compressor** interface in the Admin Panel to monitor video preview asset file sizes, perform in-browser compression via FFmpeg WASM, compare compressed output against original sizes in MB, and confirm direct replacements in Cloudflare R2 object storage.

---

## Constraints
- **Client-Side WASM Execution**: Compression runs inside the admin's browser using `@ffmpeg/ffmpeg` without overloading server CPU.
- **R2 Storage Replacement**: Replaced video files update the existing object key in `celite-previews` bucket so public CDN URLs remain unchanged.
- **Security & Authorization**: Cloudflare R2 object overwrites require admin session verification.

---

## Architecture Gate Items
- **ADR-0004**: Client-side WASM FFmpeg video compression engine & Cloudflare R2 object overwrite flow (`docs/adrs/0004-client-side-ffmpeg-video-compression-r2-replacement.md`).

---

## Approach

1. **Install Dependencies**: `@ffmpeg/ffmpeg`, `@ffmpeg/util`.
2. **Architecture Phase**: Draft ADR-0004 for client-side FFmpeg WASM video compression and R2 replacement API.
3. **Backend Route**: Build `/api/admin/replace-video-preview` endpoint using `uploadPreviewToR2` from `lib/r2Client.ts`.
4. **Admin Panel UI**:
   - Create `VideoCompressorPanel.tsx` in `app/admin/components/`.
   - Update `AdminSidebar.tsx` and `AdminClient.tsx` to include `videoCompressor` tab.
5. **Testing**: Write unit tests for API route and verify FFmpeg WASM initialization.

---

## Personas Involved
- **Archie**: Architecture Decision Gate (ADR-0004).
- **Tara**: Test coverage for API routes.
- **Vik**: Code review for UI maintainability and performance.

---

## Acceptance Criteria
- [ ] Admin panel tab "Video Compressor" displays all video templates with original file sizes in MB.
- [ ] Clicking "Compress Video" transcode the preview file locally with live progress indicator.
- [ ] Before/after size comparison shows original MB vs compressed MB and percentage savings.
- [ ] Confirmation dialog allows replacing original preview asset in Cloudflare R2 bucket (`celite-previews`).
- [ ] Vitest unit tests pass cleanly.
