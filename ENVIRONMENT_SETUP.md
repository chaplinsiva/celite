# Environment Variables Setup Guide

## Problem
When templates are uploaded on localhost, they only appear locally and not on production (celite.netlify.app). This happens because localhost and production are using different Supabase projects.

## Solution
Ensure both environments use the **same Supabase project**.

## Required Environment Variables

You need to set these environment variables in both places:

1. **Local Development** (`.env.local` file):
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

2. **Netlify Production** (Netlify Dashboard):
   - Go to: Site settings → Environment variables
   - Add the same values as above:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`

## Important: Service Role Key is Project-Wide

⚠️ **ONE SERVICE ROLE KEY FOR ALL ADMINS**: 
- The `SUPABASE_SERVICE_ROLE_KEY` is a **single project-wide key**, not per-admin
- All admins share the same service role key (it's an environment variable, not per-user)
- Individual admin access is controlled by the `admins` table in your database (user IDs stored there)
- Each admin logs in with their own email/password, then the system checks if their user ID is in the `admins` table

## How to Find Your Supabase Credentials

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → Use for `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → Use for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** (click "Reveal" to show) → Use for `SUPABASE_SERVICE_ROLE_KEY`

## Important Notes

⚠️ **CRITICAL**: After updating Netlify environment variables:
1. Go to Netlify Dashboard → Deploys
2. Click "Trigger deploy" → "Clear cache and deploy site"
3. This ensures the new environment variables are picked up

⚠️ **SECURITY**: Never commit `.env.local` to git. The `.env.local` file should be in `.gitignore`.

## Verify Configuration

To verify both environments are using the same database:

1. **On Localhost**: Upload a test template
2. **On Production**: Check if the same template appears
3. If it doesn't appear, the environments are using different Supabase projects

## Quick Fix

If you want all admins to use production immediately:
- Always upload templates from the production site (celite.netlify.app/admin)
- Do not upload from localhost unless your local `.env.local` matches production

