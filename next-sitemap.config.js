/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://celite.in',
  generateRobotsTxt: true,
  sitemapSize: 7000,
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
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


