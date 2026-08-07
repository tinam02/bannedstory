import type { MetadataRoute } from 'next';

const robots = (): MetadataRoute.Robots => ({
  rules: {
    userAgent: '*',
    allow: '/',
    disallow: ['/avatar/', '/ui/', '/maps/'],
  },
  sitemap: 'https://henehoe.app/sitemap.xml',
});

export default robots;
