# Quick Start: Fresh Database Setup

## 🚀 One-Command Setup

For experienced users, here's the quickest way to set up:

### 1. Create New Supabase Project
- Go to [Supabase Dashboard](https://app.supabase.com)
- Click **New Project**
- Complete setup

### 2. Run SQL Setup Script
```sql
-- Copy and paste entire contents of:
-- supabase_migrations/00_complete_fresh_setup.sql
-- Into Supabase Dashboard → SQL Editor → Run
```

### 3. Create Admin User
1. **Authentication** → **Users** → **Add User**
2. Create user with email/password
3. Copy **User ID** (UUID)

### 4. Add Admin to Database
```sql
-- In SQL Editor, replace YOUR_USER_ID with actual UUID:
INSERT INTO public.admins (user_id) 
VALUES ('YOUR_USER_ID')
ON CONFLICT (user_id) DO NOTHING;
```

### 5. Create Storage Bucket
- **Storage** → **New Bucket**
- Name: `templatesource`
- Set as **Private**

### 6. Update Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## ✅ Verify Setup

Run this query to check everything:

```sql
SELECT 
  (SELECT COUNT(*) FROM public.templates) as templates,
  (SELECT COUNT(*) FROM public.categories) as categories,
  (SELECT COUNT(*) FROM public.subcategories) as subcategories,
  (SELECT COUNT(*) FROM public.admins) as admins,
  (SELECT COUNT(*) FROM public.settings) as settings;
```

Expected: `templates: 0, categories: 3, subcategories: 15, admins: 1+, settings: 2`

## 📋 What Gets Created

- ✅ 8 tables (templates, categories, subcategories, orders, order_items, subscriptions, admins, settings)
- ✅ 3 default categories
- ✅ 15 default subcategories  
- ✅ Razorpay settings (₹799 monthly, ₹5,499 yearly)
- ✅ Row Level Security (RLS) policies
- ✅ Indexes for performance
- ✅ Foreign key relationships

## 🎯 Next Steps

1. Log in as admin
2. Go to Admin Panel
3. Add your first template with YouTube video link
4. Test the application!

---

For detailed instructions, see [README_FRESH_SETUP.md](./README_FRESH_SETUP.md)

