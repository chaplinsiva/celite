---
agent-notes: { ctx: "Architecture Decision Record for Client-Side FFmpeg WASM Video Compression and R2 Preview Replacement", deps: [docs/adrs/template.md, lib/r2Client.ts, app/api/admin/replace-video-preview/route.ts], state: canonical, last: "archie@2026-08-02" }
---

# ADR-0004: Client-Side FFmpeg WASM Video Compression & R2 Preview Replacement

## Status

Accepted

## Context

Video template preview assets stored in Cloudflare R2 bucket (`celite-previews`) can sometimes exceed optimal web streaming sizes (e.g. 10MB to 50MB+), slowing down product page load times and increasing bandwidth costs.
Processing video re-encoding on Next.js server CPU instances can lead to server resource exhaustion, high memory spikes, and timeout errors.

## Decision

1. **Client-Side WASM Re-encoding**:
   - Video preview compression runs directly inside the administrator's browser using `@ffmpeg/ffmpeg` and `@ffmpeg/util` compiled to WebAssembly (WASM).
   - Video compression uses H.264 video codec (`libx264`) with CRF 28 and AAC audio encoding, generating highly compressed MP4 video previews.

2. **In-Place Cloudflare R2 Object Overwrite**:
   - The backend API endpoint `/api/admin/replace-video-preview` receives the newly compressed video file blob along with the target template ID and original R2 key.
   - The endpoint uses AWS SDK `PutObjectCommand` via `lib/r2Client.ts` to overwrite the existing object key in `celite-previews` bucket.
   - Database record metadata in `templates` table is updated with the new compressed file size.

3. **Confirmation Guardrails**:
   - Administrators must explicitly review original vs compressed file sizes in MB before confirming object replacement.

## Consequences

### Positive

- **Zero Server Overhead**: Heavy video encoding computation is offloaded entirely to client WASM runtime.
- **Unchanged CDN URLs**: Replacing files in-place at the exact R2 key preserves existing public CDN URLs (`preview.celite.in/...`) without breaking image/video links.
- **Immediate Bandwidth Savings**: Reduces preview video sizes by 50%-80% on average.

### Negative

- **Client Browser Resource Usage**: Compressing large videos in-browser utilizes local CPU/RAM during transcode execution.

### Neutral

- **WASM Loading**: Initial load of `@ffmpeg/ffmpeg` core WASM binary (~31MB) is cached locally by browser.
