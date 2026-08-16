// agent-notes: { ctx: "Celite Blog types, DB mapping, and Supabase query utilities", deps: [lib/supabaseServer], state: active, last: "sato@2026-08-16" }

import { getSupabaseServerClient } from '@/lib/supabaseServer';

export interface BlogAuthor {
  name: string;
  role: string;
  avatar: string;
  bio: string;
}

export interface BlogFAQ {
  question: string;
  answer: string;
}

export interface BlogPost {
  id?: string;
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  coverImage: string;
  category: string;
  categorySlug: string;
  tags: string[];
  publishedAt: string;
  updatedAt: string;
  readTime: string;
  featured?: boolean;
  status?: 'published' | 'draft' | 'archived';
  author: BlogAuthor;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  contentHtml: string;
  faqs?: BlogFAQ[];
}

export const DEFAULT_CELITE_AUTHOR: BlogAuthor = {
  name: 'Celite Creative Team',
  role: 'Motion Design & Video Production Specialists',
  avatar: '/PNG1.png',
  bio: 'Written and curated by Celite’s in-house motion designers and video editors. Dedicated to delivering industry-standard After Effects templates, 3D assets, cinematic audio, and workflow masterclasses for creators worldwide.',
};

/**
 * Maps a raw Supabase `blogs` table row into a structured `BlogPost` object.
 */
export function mapRowToBlogPost(row: Record<string, unknown>): BlogPost {
  return {
    id: typeof row.id === 'string' ? row.id : undefined,
    slug: String(row.slug || ''),
    title: String(row.title || ''),
    subtitle: typeof row.subtitle === 'string' ? row.subtitle : '',
    excerpt: typeof row.excerpt === 'string' ? row.excerpt : '',
    coverImage: typeof row.cover_image === 'string' ? row.cover_image : '/hero_ae_template.png',
    category: String(row.category || 'General'),
    categorySlug: typeof row.category_slug === 'string'
      ? row.category_slug
      : String(row.category || 'general').toLowerCase().replace(/[^a-z0-9-]/g, '-'),
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    publishedAt: typeof row.published_at === 'string'
      ? row.published_at.split('T')[0]
      : new Date().toISOString().split('T')[0],
    updatedAt: typeof row.updated_at === 'string'
      ? row.updated_at.split('T')[0]
      : new Date().toISOString().split('T')[0],
    readTime: typeof row.read_time === 'string' ? row.read_time : '5 min read',
    featured: Boolean(row.featured),
    status: (row.status as 'published' | 'draft' | 'archived') || 'published',
    author: {
      name: typeof row.author_name === 'string' ? row.author_name : DEFAULT_CELITE_AUTHOR.name,
      role: typeof row.author_role === 'string' ? row.author_role : DEFAULT_CELITE_AUTHOR.role,
      avatar: typeof row.author_avatar === 'string' ? row.author_avatar : DEFAULT_CELITE_AUTHOR.avatar,
      bio: typeof row.author_bio === 'string' ? row.author_bio : DEFAULT_CELITE_AUTHOR.bio,
    },
    metaTitle: typeof row.meta_title === 'string' ? row.meta_title : `${String(row.title || '')} • Celite`,
    metaDescription: typeof row.meta_description === 'string'
      ? row.meta_description
      : typeof row.excerpt === 'string'
      ? row.excerpt
      : '',
    keywords: Array.isArray(row.keywords) ? (row.keywords as string[]) : [],
    contentHtml: typeof row.content_html === 'string' ? row.content_html : '',
    faqs: Array.isArray(row.faqs) ? (row.faqs as BlogFAQ[]) : [],
  };
}

/**
 * Fetch all published blogs from Supabase database.
 */
export async function getPublishedBlogs(): Promise<BlogPost[]> {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('blogs')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Error querying published blogs from Supabase:', error.message);
      return [];
    }

    return (data || []).map(mapRowToBlogPost);
  } catch (err) {
    console.error('Unexpected error fetching published blogs:', err);
    return [];
  }
}

/**
 * Fetch a single blog by slug from Supabase database.
 */
export async function getBlogBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('blogs')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      console.error(`Error querying blog slug '${slug}' from Supabase:`, error.message);
      return null;
    }

    if (!data) return null;
    return mapRowToBlogPost(data);
  } catch (err) {
    console.error(`Unexpected error fetching blog slug '${slug}':`, err);
    return null;
  }
}

/**
 * Fetch related blogs by category from Supabase database.
 */
export async function getRelatedBlogs(currentSlug: string, categorySlug: string, limit = 3): Promise<BlogPost[]> {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('blogs')
      .select('*')
      .neq('slug', currentSlug)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data.map(mapRowToBlogPost);
  } catch (err) {
    console.error('Unexpected error fetching related blogs:', err);
    return [];
  }
}

/**
 * Extracts unique categories and their article count from an array of BlogPosts.
 */
export function getAllBlogCategories(blogsList: BlogPost[] = []): { name: string; slug: string; count: number }[] {
  const categoriesMap = new Map<string, { name: string; slug: string; count: number }>();

  blogsList.forEach((post) => {
    const existing = categoriesMap.get(post.categorySlug);
    if (existing) {
      existing.count += 1;
    } else {
      categoriesMap.set(post.categorySlug, {
        name: post.category,
        slug: post.categorySlug,
        count: 1,
      });
    }
  });

  return Array.from(categoriesMap.values());
}
