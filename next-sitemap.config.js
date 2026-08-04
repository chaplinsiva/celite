const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function getSupabaseData() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[sitemap] Supabase env vars missing, skipping dynamic entries');
    return { templates: [], categories: [], subcategories: [], subSubcategories: [] };
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
    const [templatesRes, categoriesRes, subcategoriesRes, subSubcategoriesRes] = await Promise.all([
      supabase.from('templates').select('slug, updated_at').eq('status', 'approved').order('updated_at', { ascending: false }),
      supabase.from('categories').select('id, slug, updated_at'),
      supabase.from('subcategories').select('id, slug, updated_at, category_id'),
      supabase.from('sub_subcategories').select('slug, updated_at, subcategory_id'),
    ]);

    const templates = templatesRes.error ? [] : templatesRes.data ?? [];
    const categories = categoriesRes.error ? [] : categoriesRes.data ?? [];
    const subcategories = subcategoriesRes.error ? [] : subcategoriesRes.data ?? [];
    const subSubcategories = subSubcategoriesRes.error ? [] : subSubcategoriesRes.data ?? [];

    if (templatesRes.error) {
      console.warn('[sitemap] Failed to load templates:', templatesRes.error.message);
    }
    if (categoriesRes.error) {
      console.warn('[sitemap] Failed to load categories:', categoriesRes.error.message);
    }
    if (subcategoriesRes.error) {
      console.warn('[sitemap] Failed to load subcategories:', subcategoriesRes.error.message);
    }
    if (subSubcategoriesRes.error) {
      console.warn('[sitemap] Failed to load sub-subcategories:', subSubcategoriesRes.error.message);
    }

    return { templates, categories, subcategories, subSubcategories };
  } catch (error) {
    console.warn('[sitemap] Unexpected Supabase error:', error?.message || error);
    return { templates: [], categories: [], subcategories: [], subSubcategories: [] };
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

    const { templates, categories, subcategories, subSubcategories } = await getSupabaseData();

    // Identify the Video Templates category for dedicated landing page URLs
    const videoTemplatesCat = categories.find(
      (cat) => cat.slug === 'video-templates'
    );
    const videoTemplatesCatId = videoTemplatesCat?.id || null;

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

    // Add dedicated subcategory landing pages under /video-templates/[slug]
    // These are high-priority pages that Google should index as category pages
    subcategories.forEach((subcat) => {
      if (!subcat?.slug) return;
      if (videoTemplatesCatId && subcat.category_id === videoTemplatesCatId) {
        paths.push({
          loc: `/video-templates/${subcat.slug}`,
          changefreq: 'daily',
          priority: 0.85,
          lastmod: subcat.updated_at || now,
        });
      }
    });

    // Add dedicated sub-subcategory landing pages under /video-templates/[subcat]/[subsubcat]
    // Only for subcategories that belong to the Video Templates category
    const videoSubcats = subcategories.filter(
      (s) => videoTemplatesCatId && s.category_id === videoTemplatesCatId
    );
    subSubcategories.forEach((subSubcat) => {
      if (!subSubcat?.slug) return;
      const parentSubcat = videoSubcats.find((s) => s.id === subSubcat.subcategory_id);
      if (parentSubcat) {
        paths.push({
          loc: `/video-templates/${parentSubcat.slug}/${subSubcat.slug}`,
          changefreq: 'daily',
          priority: 0.8,
          lastmod: subSubcat.updated_at || now,
        });
      }
    });

    // Add category filter URLs (legacy support — lower priority)
    categories.forEach((cat) => {
      if (!cat?.slug) return;
      paths.push({
        loc: `/templates?category=${encodeURIComponent(cat.slug)}`,
        changefreq: 'weekly',
        priority: 0.5,
        lastmod: cat.updated_at || now,
      });
    });

    // Add subcategory query-param URLs (legacy — lower priority)
    subcategories.forEach((subcat) => {
      if (!subcat?.slug) return;
      paths.push({
        loc: `/templates?subcategory=${encodeURIComponent(subcat.slug)}`,
        changefreq: 'weekly',
        priority: 0.5,
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


