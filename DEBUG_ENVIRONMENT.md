# Debug: Different Template Counts Between Environments

## Problem
- **Production** (celite.netlify.app): Shows 5 templates
- **Localhost**: Shows 7 templates

This means production and localhost are using **different Supabase databases**.

## How to Verify Which Database is Being Used

### 1. Check Production Console
1. Go to https://celite.netlify.app
2. Open browser DevTools (F12)
3. Go to Console tab
4. Look for the log: `[TemplateCarousel] Loaded X featured templates`
5. This will show how many templates production found

### 2. Check Production Network Tab
1. In DevTools, go to Network tab
2. Refresh the page
3. Look for requests to `*.supabase.co` or `supabase.co`
4. The URL will show which Supabase project is being used
5. Example: `https://xxxxx.supabase.co/rest/v1/templates`

### 3. Check Localhost
1. Open localhost:3000
2. Open DevTools (F12) → Console
3. Look for `[TemplateCarousel] Loaded X featured templates`
4. Compare the count

### 4. Verify Netlify Environment Variables
1. Go to Netlify Dashboard → Your Site → Site settings → Environment variables
2. Verify these match your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` - Should match local `.env.local`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Should match local `.env.local`

### 5. Check Which Supabase Project is Configured

**On Netlify:**
- Go to: Site settings → Environment variables
- Copy the value of `NEXT_PUBLIC_SUPABASE_URL`
- This URL should match your local `.env.local` file

**On Localhost:**
- Open `.env.local` file
- Check `NEXT_PUBLIC_SUPABASE_URL`
- Compare with Netlify

## Quick Fix

1. **Get the correct Supabase credentials from your local `.env.local` file**
2. **Set them on Netlify:**
   - Site settings → Environment variables
   - Update or add:
     - `NEXT_PUBLIC_SUPABASE_URL` (from `.env.local`)
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (from `.env.local`)
     - `SUPABASE_SERVICE_ROLE_KEY` (from `.env.local`)
3. **Redeploy:**
   - Netlify Dashboard → Deploys
   - Trigger deploy → Clear cache and deploy site

## Why This Happens

When you upload templates on localhost:
- They go to the Supabase database configured in your `.env.local`
- If production uses different environment variables, it connects to a different database
- Result: Templates appear on localhost but not on production

**Solution:** Ensure both environments use the same Supabase project URL and keys.

