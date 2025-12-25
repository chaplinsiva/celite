const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function getSupabaseData() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[sitemap] Supabase env vars missing, skipping dynamic entries');
    return { templates: [], categories: [], subcategories: [] };
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
    const [templatesRes, categoriesRes, subcategoriesRes] = await Promise.all([
      supabase.from('templates').select('slug, updated_at').eq('status', 'approved').order('updated_at', { ascending: false }),
      supabase.from('categories').select('slug, updated_at'),
      supabase.from('subcategories').select('slug, updated_at, category_id'),
    ]);

    const templates = templatesRes.error ? [] : templatesRes.data ?? [];
    const categories = categoriesRes.error ? [] : categoriesRes.data ?? [];
    const subcategories = subcategoriesRes.error ? [] : subcategoriesRes.data ?? [];

    if (templatesRes.error) {
      console.warn('[sitemap] Failed to load templates:', templatesRes.error.message);
    }
    if (categoriesRes.error) {
      console.warn('[sitemap] Failed to load categories:', categoriesRes.error.message);
    }
    if (subcategoriesRes.error) {
      console.warn('[sitemap] Failed to load subcategories:', subcategoriesRes.error.message);
    }

    return { templates, categories, subcategories };
  } catch (error) {
    console.warn('[sitemap] Unexpected Supabase error:', error?.message || error);
    return { templates: [], categories: [], subcategories: [] };
  }
}

const STATIC_PAGES = [
  // Core pages - highest priority
  { loc: '/', changefreq: 'daily', priority: 1.0 },
  { loc: '/pricing', changefreq: 'weekly', priority: 0.9 },

  // Category landing pages - high priority for discoverability
  { loc: '/video-templates', changefreq: 'daily', priority: 0.9 },
  { loc: '/3d-models', changefreq: 'daily', priority: 0.9 },
  { loc: '/stock-photos', changefreq: 'daily', priority: 0.9 },
  { loc: '/music-sfx', changefreq: 'daily', priority: 0.9 },
  { loc: '/prompts', changefreq: 'daily', priority: 0.9 },
  { loc: '/graphics', changefreq: 'daily', priority: 0.9 },
  { loc: '/web-templates', changefreq: 'daily', priority: 0.9 },
  { loc: '/templates', changefreq: 'daily', priority: 0.8 },

  // Creator & Business pages
  { loc: '/start-selling', changefreq: 'weekly', priority: 0.8 },
  { loc: '/about', changefreq: 'monthly', priority: 0.7 },
  { loc: '/contact', changefreq: 'monthly', priority: 0.7 },

  // Legal/Policy pages - lower priority
  { loc: '/refund-policy', changefreq: 'yearly', priority: 0.4 },
  { loc: '/shipping-policy', changefreq: 'yearly', priority: 0.4 },
  { loc: '/privacy-policy', changefreq: 'yearly', priority: 0.4 },
  { loc: '/terms', changefreq: 'yearly', priority: 0.4 },
];

/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://celite.in',
  generateRobotsTxt: true,
  sitemapSize: 7000,
  exclude: [
    '/admin',
    '/admin/*',
    '/api/*',
    '/dashboard',
    '/dashboard/*',
    '/login',
    '/signup',
    '/checkout',
    '/checkout/*',
  ],
  additionalPaths: async () => {
    const now = new Date().toISOString();
    const paths = STATIC_PAGES.map((page) => ({
      ...page,
      lastmod: now,
    }));

    const { templates, categories, subcategories } = await getSupabaseData();

    // Add all product pages
    templates.forEach((tpl) => {
      if (!tpl?.slug) return;
      paths.push({
        loc: `/product/${tpl.slug}`,
        changefreq: 'weekly',
        priority: 0.8,
        lastmod: tpl.updated_at || now,
      });
    });

    // Add category filter URLs (legacy support)
    categories.forEach((cat) => {
      if (!cat?.slug) return;
      paths.push({
        loc: `/templates?category=${encodeURIComponent(cat.slug)}`,
        changefreq: 'weekly',
        priority: 0.6,
        lastmod: cat.updated_at || now,
      });
    });

    // Add subcategory URLs for deeper indexing
    subcategories.forEach((subcat) => {
      if (!subcat?.slug) return;
      paths.push({
        loc: `/templates?subcategory=${encodeURIComponent(subcat.slug)}`,
        changefreq: 'weekly',
        priority: 0.6,
        lastmod: subcat.updated_at || now,
      });
    });

    return paths;
  },
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/*',
          '/api',
          '/api/*',
          '/dashboard',
          '/dashboard/*',
          '/checkout',
          '/checkout/*',
          '/login',
          '/signup',
          '/forgot-password',
          '/reset-password',
          '/auth',
          '/auth/*',
          '/creator-dashboard',
        ],
      },
      // Be polite to crawlers
      {
        userAgent: '*',
        crawlDelay: 1,
      },
    ],
    additionalSitemaps: [
      'https://celite.in/sitemap.xml',
    ],
    transformRobotsTxt: async (_config, robotsTxt) =>
      robotsTxt
        .split('\n')
        .filter((line) => !line.startsWith('Host:') && !line.startsWith('# Host'))
        .join('\n')
        .replace(/\n{2,}/g, '\n\n')
        .trimEnd(),
  },
}


