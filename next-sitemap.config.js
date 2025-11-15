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
  additionalPaths: async (config) => {
    const result = [];
    
    // Home
    result.push({
      loc: '/',
      changefreq: 'daily',
      priority: 1.0,
      lastmod: new Date().toISOString(),
    });
    
    // Browse Templates / Categories (same page)
    result.push({
      loc: '/templates',
      changefreq: 'daily',
      priority: 0.9,
      lastmod: new Date().toISOString(),
    });
    
    // Pricing
    result.push({
      loc: '/pricing',
      changefreq: 'weekly',
      priority: 0.9,
      lastmod: new Date().toISOString(),
    });
    
    // What we offer - About page
    result.push({
      loc: '/about',
      changefreq: 'monthly',
      priority: 0.8,
      lastmod: new Date().toISOString(),
    });
    
    return result;
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


