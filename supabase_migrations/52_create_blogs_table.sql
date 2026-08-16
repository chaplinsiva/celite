-- =========================================================
-- Migration: 52_create_blogs_table.sql
-- Description: Create blogs table for SEO articles with RLS and full CRUD support
-- =========================================================

-- 1. Create blogs table
CREATE TABLE IF NOT EXISTS public.blogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    subtitle TEXT,
    excerpt TEXT,
    cover_image TEXT,
    category TEXT NOT NULL,
    category_slug TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}'::text[],
    author_name TEXT DEFAULT 'Celite Creative Team',
    author_role TEXT DEFAULT 'Motion Design & Video Production Specialists',
    author_avatar TEXT DEFAULT '/PNG1.png',
    author_bio TEXT DEFAULT 'Written and curated by Celite’s in-house motion designers and video editors.',
    read_time TEXT DEFAULT '5 min read',
    featured BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'published' CHECK (status IN ('published', 'draft', 'archived')),
    meta_title TEXT,
    meta_description TEXT,
    keywords TEXT[] DEFAULT '{}'::text[],
    content_html TEXT NOT NULL,
    faqs JSONB DEFAULT '[]'::jsonb,
    published_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Indexes for fast lookup & filtering
CREATE INDEX IF NOT EXISTS idx_blogs_slug ON public.blogs(slug);
CREATE INDEX IF NOT EXISTS idx_blogs_category_slug ON public.blogs(category_slug);
CREATE INDEX IF NOT EXISTS idx_blogs_status ON public.blogs(status);
CREATE INDEX IF NOT EXISTS idx_blogs_featured ON public.blogs(featured);
CREATE INDEX IF NOT EXISTS idx_blogs_published_at ON public.blogs(published_at DESC);

-- 3. Enable RLS
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Anyone (including unauthenticated visitors) can read published blogs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'blogs' AND policyname = 'Public can view published blogs'
    ) THEN
        CREATE POLICY "Public can view published blogs"
            ON public.blogs
            FOR SELECT
            USING (status = 'published');
    END IF;
END $$;

-- Admins can do full CRUD on blogs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'blogs' AND policyname = 'Admins can manage all blogs'
    ) THEN
        CREATE POLICY "Admins can manage all blogs"
            ON public.blogs
            FOR ALL
            USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid()));
    END IF;
END $$;
