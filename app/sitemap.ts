import type { MetadataRoute } from 'next';
import { lastUpdated } from '@/lib/changelog';

const SITE = 'https://henehoe.app';

const sitemap = (): MetadataRoute.Sitemap => [
  {
    url: SITE,
    changeFrequency: 'weekly',
    priority: 1,
  },
  {
    // lastModified comes off the top changelog entry, so adding one is the
    // only thing to remember. weekly because that is the cadence
    url: `${SITE}/changelog`,
    lastModified: lastUpdated(),
    changeFrequency: 'weekly',
    priority: 0.6,
  },
];

export default sitemap;
