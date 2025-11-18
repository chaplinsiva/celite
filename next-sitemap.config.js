const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function getSupabaseData() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[sitemap] Supabase env vars missing, skipping dynamic entries');
    return { templates: [], categories: [] };
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
    const [templatesRes, categoriesRes] = await Promise.all([
      supabase.from('templates').select('slug, updated_at').order('updated_at', { ascending: false }),
      supabase.from('categories').select('slug, updated_at'),
    ]);

    const templates = templatesRes.error ? [] : templatesRes.data ?? [];
    const categories = categoriesRes.error ? [] : categoriesRes.data ?? [];

    if (templatesRes.error) {
      console.warn('[sitemap] Failed to load templates:', templatesRes.error.message);
    }
    if (categoriesRes.error) {
      console.warn('[sitemap] Failed to load categories:', categoriesRes.error.message);
    }

    return { templates, categories };
  } catch (error) {
    console.warn('[sitemap] Unexpected Supabase error:', error?.message || error);
    return { templates: [], categories: [] };
  }
}

const STATIC_PAGES = [
  { loc: '/', changefreq: 'daily', priority: 1.0 },
  { loc: '/templates', changefreq: 'daily', priority: 0.9 },
  { loc: '/pricing', changefreq: 'weekly', priority: 0.9 },
  { loc: '/about', changefreq: 'monthly', priority: 0.8 },
  { loc: '/contact', changefreq: 'monthly', priority: 0.7 },
  { loc: '/refund-policy', changefreq: 'yearly', priority: 0.5 },
  { loc: '/shipping-policy', changefreq: 'yearly', priority: 0.5 },
  { loc: '/privacy-policy', changefreq: 'yearly', priority: 0.5 },
  { loc: '/terms', changefreq: 'yearly', priority: 0.5 },
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

    const { templates, categories } = await getSupabaseData();

    templates.forEach((tpl) => {
      if (!tpl?.slug) return;
      paths.push({
        loc: `/product/${tpl.slug}`,
        changefreq: 'weekly',
        priority: 0.8,
        lastmod: tpl.updated_at || now,
      });
    });

    categories.forEach((cat) => {
      if (!cat?.slug) return;
      paths.push({
        loc: `/templates?category=${encodeURIComponent(cat.slug)}`,
        changefreq: 'weekly',
        priority: 0.7,
        lastmod: cat.updated_at || now,
      });
    });

    return paths;
  },
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api', '/dashboard', '/checkout'],
      },
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


