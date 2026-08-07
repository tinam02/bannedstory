import type { MetadataRoute } from 'next';

const sitemap = (): MetadataRoute.Sitemap => [
  {
    url: 'https://henehoe.app',
    changeFrequency: 'weekly',
    priority: 1,
  },
];

export default sitemap;
