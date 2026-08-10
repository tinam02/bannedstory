import type { MetadataRoute } from 'next';
import { generateSitemaps } from './sitemap';

const SITE = 'https://henehoe.app';

const robots = (): MetadataRoute.Robots => ({
  rules: {
    userAgent: '*',
    // /avatar/items is the one part of the assets worth fetching: it is the
    // art on the item pages, and a page whose only picture is blocked renders
    // to a crawler as a page with no picture. the other 105k sprite files are
    // for the tool and would be pure crawl budget
    allow: ['/', '/avatar/items/'],
    disallow: ['/avatar/', '/ui/', '/maps/'],
  },
  // one line per chunk. next builds no index file for a split sitemap, and
  // several Sitemap lines is the documented way to say the same thing
  sitemap: generateSitemaps().map(s => `${SITE}/sitemap/${s.id}.xml`),
});

export default robots;
