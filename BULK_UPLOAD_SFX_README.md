# Bulk Upload Sound Effects - ElevenLabs Integration

This guide explains how to generate and upload sound effects using the ElevenLabs API.

## Setup

1. **Environment Variables**
   Add these to your `.env.local`:
   ```
   ELEVENLABSAPIKEY=your_elevenlabs_api_key
   ELEVENLABSAPIKEYID=your_elevenlabs_api_id (optional, for voice-based generation)
   ```

2. **Run Migration**
   The migration file `supabase_migrations/29_create_sound_effects_category.sql` will create:
   - Sound Effects category
   - Whoosh subcategory

   Run it in your Supabase dashboard or via CLI.

## Generate Whoosh Sound Effects

### Option 1: Using the API Route (Recommended)

Call the API endpoint with an admin token:

```bash
curl -X POST http://localhost:3000/api/admin/bulk-upload-sfx \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"count": 5, "soundType": "whoosh"}'
```

### Option 2: Using the Script

```bash
npx tsx scripts/generate-whoosh-sfx.ts YOUR_ADMIN_TOKEN
```

### Option 3: From Admin Panel

Create an admin page button that calls the API route (future enhancement).

## API Endpoint

**POST** `/api/admin/bulk-upload-sfx`

**Headers:**
- `Authorization: Bearer <admin_token>`
- `Content-Type: application/json`

**Body:**
```json
{
  "count": 5,
  "soundType": "whoosh"
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Generated 5 sound effects",
  "results": [
    {
      "success": true,
      "name": "Whoosh Sound Effect 1",
      "slug": "whoosh-sound-effect-1",
      "audioUrl": "https://..."
    }
  ],
  "category": {
    "id": "...",
    "slug": "sound-effects"
  },
  "subcategory": {
    "id": "...",
    "slug": "whoosh"
  }
}
```

## What It Does

1. Creates/verifies Sound Effects category and Whoosh subcategory
2. Generates 5 whoosh sound effects using ElevenLabs API
3. Uploads audio previews to R2 (public bucket)
4. Uploads source files to R2 (private bucket)
5. Creates template records in database
6. Links to creator shop ID: `54297974-d7e7-4b59-9f91-89800be0b3f5`

## View Sound Effects

After generation, visit: `/sound-effects`

## Files Created

- `app/api/admin/bulk-upload-sfx/route.ts` - API endpoint
- `app/sound-effects/SfxClient.tsx` - Client component
- `app/sound-effects/page.tsx` - Page component
- `supabase_migrations/29_create_sound_effects_category.sql` - Migration
- `scripts/generate-whoosh-sfx.ts` - Helper script


