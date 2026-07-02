# R2 Private Bucket Setup Guide

## Overview

Source files are stored in a **private R2 bucket** (`celite-source-files`) for security. These files are only accessible via signed URLs with short expiry times (15 minutes) and only to subscribed users.

## Required Environment Variables

Add these to your `.env.local` file:

```env
# R2 Configuration
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_SOURCE_BUCKET=celite-source-files
R2_PREVIEWS_BUCKET=celite-previews
R2_PREVIEWS_DOMAIN=preview.celite.in
```

## Step 1: Create the Private Bucket in Cloudflare R2

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2** → **Object Storage**
3. Click **Create bucket**
4. Name it: `celite-source-files`
5. **IMPORTANT**: Do NOT enable public access. This bucket must remain private.
6. Click **Create bucket**

## Step 2: Create R2 API Token

1. In Cloudflare Dashboard, go to **R2** → **Manage R2 API Tokens**
2. Click **Create API token**
3. Set permissions:
   - **Object Read & Write** (for uploads and downloads)
   - **Bucket**: `celite-source-files`
4. Copy the **Access Key ID** and **Secret Access Key**
5. Add them to your `.env.local`:
   ```env
   R2_ACCESS_KEY_ID=your-access-key-id
   R2_SECRET_ACCESS_KEY=your-secret-access-key
   ```

## Step 3: Verify Bucket Configuration

### Security Checklist

- ✅ Bucket is **private** (no public access)
- ✅ CORS is **disabled** (not needed for server-side uploads)
- ✅ Only API tokens with specific bucket permissions are used
- ✅ Signed URLs expire in 15 minutes (configured in code)

## Step 4: Test Upload

1. Go to Admin Panel → Products
2. Create or edit a template
3. Upload a source file (ZIP/RAR)
4. Check the browser console for any errors
5. Verify the file appears in Cloudflare R2 dashboard under `celite-source-files` bucket

## Troubleshooting

### Error: "R2_SOURCE_BUCKET environment variable is not set"
- **Solution**: Add `R2_SOURCE_BUCKET=celite-source-files` to your `.env.local`

### Error: "R2 bucket does not exist"
- **Solution**: Create the bucket `celite-source-files` in Cloudflare R2 dashboard

### Error: "Invalid R2 credentials"
- **Solution**: Verify `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` are correct

### Error: "Failed to generate secure download link"
- **Solution**: Check that the bucket exists and credentials are valid

### Upload succeeds but file doesn't appear in bucket
- **Solution**: Check the bucket name matches exactly (case-sensitive)
- Verify the R2 endpoint is correct

## Security Best Practices

1. **Never make the source bucket public** - Files should only be accessible via signed URLs
2. **Use short expiry times** - Signed URLs expire in 15 minutes
3. **Verify subscription** - Only subscribed users can generate download links
4. **Monitor access** - Check Cloudflare R2 logs for unauthorized access attempts
5. **Rotate credentials** - Regularly rotate R2 API tokens

## File Path Structure

Source files are stored with this structure:
```
{categorySlug}/{subcategorySlug}/{subSubcategorySlug}/{templateFolder}/{filename}
```

Example:
```
after-effects/logo-reveal/animation-3d-logo/template.zip
```

## Download Flow

1. User clicks download button
2. Backend checks if user has active subscription
3. If subscribed, generates signed URL (15 min expiry)
4. User downloads file directly from R2
5. Signed URL expires after 15 minutes (not shareable)

