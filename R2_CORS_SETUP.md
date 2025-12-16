# R2 CORS Setup Guide

## Problem

Cloudflare R2 does **NOT** support bucket-level CORS policies like AWS S3. When uploading files directly to R2 using presigned URLs, browsers send a preflight OPTIONS request that R2 doesn't handle, causing CORS errors.

## Solution: Cloudflare Worker

You must use a Cloudflare Worker to add CORS headers for R2 requests.

## Step 1: Create Cloudflare Worker

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages** → **Create application** → **Create Worker**
3. Name it: `r2-cors-proxy` (or any name you prefer)
4. Copy the code from `cloudflare-worker-r2-cors.js` into the worker editor

## Step 2: Bind R2 Buckets to Worker

1. In the Worker editor, go to **Settings** → **Variables and Secrets**
2. Click **Add binding** → **R2 Bucket**
3. Add two bindings:
   - **Variable name**: `R2_PREVIEWS_BUCKET`
   - **R2 bucket**: `celite-previews`
   
   - **Variable name**: `R2_SOURCE_BUCKET`
   - **R2 bucket**: `celite-source-files`

## Step 3: Configure Custom Domain Route

1. Go to **Workers & Pages** → Your worker → **Triggers**
2. Click **Add Custom Domain**
3. Add domain: `previews.celite.in`
4. Configure DNS:
   - Add CNAME record: `previews` → `r2-cors-proxy.your-subdomain.workers.dev`
   - Or use Cloudflare's automatic DNS configuration

## Step 4: Update Code to Use Worker Domain

After the worker is set up, you have two options:

### Option A: Use Worker for All Previews (Recommended)

Update `lib/r2Client.ts` to use the worker domain for preview URLs:

```typescript
// Instead of: https://preview.celite.in/${key}
// Use: https://previews.celite.in/${key}
```

### Option B: Keep Direct R2 for GET, Use Worker for PUT

For direct uploads (presigned URLs), you need to upload through the worker instead of directly to R2.

## Step 5: Current Implementation (Automatic Fallback)

The code currently handles CORS errors automatically:

1. **Try direct upload first** (if `direct_upload_enabled` is true)
   - Gets presigned URL from `/api/creator/presigned-upload`
   - Attempts PUT request directly to R2
   
2. **Automatic fallback on CORS error**
   - If CORS error detected (status 0, network error, timeout)
   - Automatically falls back to server-side upload
   - User sees seamless transition
   - Upload continues with progress tracking

This ensures uploads **always work**, even without the worker set up.

## Step 6: Full Direct Upload Solution (Optional)

To enable true direct uploads without fallback, you need to:

### Option A: Use Worker for Uploads (Best Performance)

Create a worker endpoint that handles uploads:

```javascript
// Worker receives upload, validates, then uploads to R2
// Returns CORS headers automatically
```

Then update the presigned upload API to return worker URL instead of R2 URL.

### Option B: Keep Current Implementation (Recommended for Now)

The automatic fallback ensures:
- ✅ Uploads always work
- ✅ No user-facing errors
- ✅ Progress tracking continues
- ⚠️ Slightly slower (goes through server)

Once the worker is set up, direct uploads will work without fallback.

## Testing

After setting up the worker:

1. Test GET request:
```javascript
fetch('https://previews.celite.in/preview/video/.../file.mp4')
  .then(res => console.log('Success:', res))
  .catch(err => console.error('Error:', err));
```

2. Test OPTIONS preflight:
```javascript
fetch('https://previews.celite.in/preview/video/.../file.mp4', {
  method: 'OPTIONS'
})
  .then(res => console.log('CORS headers:', res.headers))
  .catch(err => console.error('Error:', err));
```

## Notes

- The worker handles both GET (downloads) and PUT (uploads)
- CORS headers are added automatically
- Range requests are supported for video streaming
- Worker domain must be different from your main domain (subdomain works)

## Current Status

✅ **Automatic CORS Error Handling**
- Code automatically detects CORS errors
- Falls back to server-side upload seamlessly
- User experience is not interrupted
- Progress tracking continues

⚠️ **To Enable True Direct Uploads**
- Set up Cloudflare Worker (see worker code above)
- Configure `WORKER_UPLOAD_DOMAIN` environment variable
- Optionally use `/api/creator/upload-via-worker` endpoint

## Quick Fix Summary

**Problem**: R2 doesn't support CORS → Direct uploads fail

**Current Solution**: Automatic fallback to server-side upload ✅

**Best Solution**: Cloudflare Worker with CORS headers 🚀

**Status**: Uploads work now, can be optimized later with worker

