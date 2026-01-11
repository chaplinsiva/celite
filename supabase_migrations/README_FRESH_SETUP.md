# Fresh Database Setup Guide

This guide helps you set up a complete fresh database for your Next.js template store application in a new Supabase project/organization.

## Files Overview

1. **`00_complete_fresh_setup.sql`** - Main setup script (creates all tables, indexes, RLS policies)
2. **`01_add_initial_admins.sql`** - Script to add initial admin users (run after creating users)

## Prerequisites

- New Supabase project/organization
- Supabase CLI installed (optional, but recommended)
- Access to Supabase Dashboard SQL Editor

## Step-by-Step Setup

### Step 1: Create New Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project
3. Wait for project initialization to complete
4. Note your project URL and anon key (you'll need these for your `.env.local`)

### Step 2: Run the Fresh Setup Script

#### Option A: Using Supabase Dashboard

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy and paste the entire contents of `00_complete_fresh_setup.sql`
5. Click **Run** (or press Ctrl+Enter)
6. Wait for completion - you should see "Success. No rows returned"

#### Option B: Using Supabase CLI

```bash
# Link to your project (if not already linked)
supabase link --project-ref your-project-ref

# Run the migration
supabase db push
# Or directly:
psql "your-connection-string" -f supabase_migrations/00_complete_fresh_setup.sql
```

### Step 3: Create Storage Buckets

Your application needs two storage buckets:

1. **`templatesource`** (Private) - For template source files (zip/rar)
2. Optionally keep `templates` bucket if you have legacy files (though previews are now YouTube)

To create buckets:
1. Go to **Storage** in Supabase Dashboard
2. Create bucket: **`templatesource`**
   - Set as **Private** (not public)
   - Enable RLS if not already enabled
3. (Optional) If you have legacy files, keep the `templates` bucket but you won't need it for new previews

### Step 4: Add Initial Admin Users

**⚠️ IMPORTANT**: You need to create users via Supabase Auth first, then run the admin script.

1. **Create users via Supabase Auth**:
   - Go to **Authentication** → **Users**
   - Click **Add User** → **Create new user**
   - Create your admin user(s) with email/password
   - **Copy the User ID** (UUID)

2. **Add admin users to admins table**:
   - Open SQL Editor
   - Copy contents of `01_add_initial_admins.sql`
   - **Replace the UUIDs** with your actual user IDs
   - Run the script

### Step 5: Configure Environment Variables

Update your `.env.local` file with your new Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Step 6: Verify Setup

Run these queries in SQL Editor to verify everything is set up correctly:

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check categories and subcategories
SELECT c.name as category, COUNT(s.id) as subcategory_count
FROM public.categories c
LEFT JOIN public.subcategories s ON s.category_id = c.id
GROUP BY c.id, c.name
ORDER BY c.name;

-- Check settings
SELECT key, value, description FROM public.settings ORDER BY key;

-- Check admins
SELECT user_id, created_at FROM public.admins;
```

Expected output:
- **Tables**: templates, categories, subcategories, orders, order_items, subscriptions, admins, settings
- **Categories**: 3 categories (After Effects, Website Templates, PSD Templates)
- **Subcategories**: 15 subcategories total (5 per category)
- **Settings**: 2 settings (RAZORPAY_MONTHLY_AMOUNT, RAZORPAY_YEARLY_AMOUNT)
- **Admins**: Your admin user(s)

## Database Schema Summary

### Tables Created

1. **templates** - Product templates catalog
   - Uses YouTube video links for previews (not storage bucket)
   - Supports categories/subcategories
   - Limited offers feature

2. **categories** - Template categories
   - Pre-populated with default categories

3. **subcategories** - Subcategories within categories
   - Pre-populated with default subcategories

4. **orders** - User orders/purchases
   - Links to auth.users
   - Stores billing information

5. **order_items** - Items within each order
   - Links to orders and templates

6. **subscriptions** - User subscriptions
   - Monthly/yearly plans
   - Razorpay integration support

7. **admins** - Admin users
   - Controls access to admin panel

8. **settings** - Application settings
   - Pre-populated with Razorpay amounts

### Key Features

- **R2 Storage System**: Templates use Cloudflare R2 for previews (video, thumbnail, audio, 3D models) and source files
- **Row Level Security (RLS)**: Enabled on all tables with appropriate policies
- **Indexes**: Optimized for common queries
- **Foreign Keys**: Proper relationships between tables
- **Default Data**: Categories, subcategories, and settings pre-populated

## Next Steps

1. **Set up Razorpay** (if not already done):
   - Add Razorpay keys to your `.env.local`
   - Configure webhook in Razorpay dashboard

2. **Add Templates**:
   - Log in as admin
   - Go to Admin Panel → Products
   - Add templates with preview files uploaded to R2 storage

3. **Test the Application**:
   - Create a test user account
   - Browse templates
   - Test purchase flow
   - Test subscription flow

## Troubleshooting

### Issue: "permission denied for table"
- **Solution**: Make sure RLS policies are created correctly. Re-run the setup script.

### Issue: "relation does not exist"
- **Solution**: Verify the script ran successfully. Check if all tables were created.

### Issue: "Admin panel access denied"
- **Solution**: Make sure you added your user ID to the `admins` table using `01_add_initial_admins.sql`

### Issue: "Cannot insert into settings"
- **Solution**: Make sure your user is in the `admins` table. Settings require admin privileges.

## Migration from Existing Database

If you're migrating from an existing database:

1. Export data from old database:
   ```sql
   -- Export templates
   COPY (SELECT * FROM public.templates) TO '/path/to/templates.csv' CSV HEADER;
   
   -- Export other data as needed
   ```

2. Run fresh setup script on new database

3. Import data (adjust as needed):
   ```sql
   COPY public.templates FROM '/path/to/templates.csv' CSV HEADER;
   ```

4. **Important**: Update YouTube video links for all templates (replace old storage bucket URLs)

## Support

If you encounter issues:
1. Check Supabase logs in Dashboard → Logs
2. Verify RLS policies are correctly set
3. Check that all foreign key constraints are satisfied
4. Ensure users have proper permissions

