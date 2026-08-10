import type { MetadataRoute } from 'next';
import { lastUpdated } from '@/lib/changelog';
import {
  allItems,
  builtOn,
  categories,
  categoryPath,
  isIndexable,
  itemPath,
  pageCount,
} from '@/lib/items';

const SITE = 'https://henehoe.app';

/**
 * How many urls go in one file.
 *
 * The limit is 50,000, this is nowhere near it. Small files on purpose: a
 * chunk that fails to parse or times out costs a tenth of the catalogue rather
 * than all of it
 */
const CHUNK = 5000;

/** the pages that are not items: home, changelog, and every hub */
const fixed = (): MetadataRoute.Sitemap => {
  const out: MetadataRoute.Sitemap = [
    { url: SITE, changeFrequency: 'weekly', priority: 1 },
    {
      // lastModified comes off the top changelog entry, so adding one is the
      // only thing to remember. weekly because that is the cadence
      url: `${SITE}/changelog`,
      lastModified: lastUpdated(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${SITE}/items`,
      lastModified: builtOn(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ];

  for (const c of categories()) {
    const pages = pageCount(c.key);
    for (let n = 1; n <= pages; n += 1) {
      out.push({
        url: `${SITE}${categoryPath(c.key, n)}`,
        lastModified: builtOn(),
        changeFrequency: 'weekly',
        // page 1 is the one worth crawling first, the rest are how the items
        // are reached rather than pages anyone should land on
        priority: n === 1 ? 0.8 : 0.4,
      });
    }
  }

  return out;
};

/** the items, minus the ones marked noindex on the page itself */
const itemUrls = (): MetadataRoute.Sitemap =>
  allItems()
    .filter(isIndexable)
    .map(i => ({
      url: `${SITE}${itemPath(i)}`,
      // the extraction date. an item's art and name do not change under the
      // same id, so this only moves when the item is actually rebuilt
      lastModified: builtOn(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    }));

// built once, then sliced. generateSitemaps and sitemap() both need the count
// and next calls them in separate passes
let all: MetadataRoute.Sitemap | null = null;

const everything = () => {
  if (!all) all = [...fixed(), ...itemUrls()];
  return all;
};

export const generateSitemaps = () =>
  Array.from(
    { length: Math.max(1, Math.ceil(everything().length / CHUNK)) },
    (_, id) => ({ id }),
  );

const sitemap = ({ id }: { id: number }): MetadataRoute.Sitemap =>
  everything().slice(id * CHUNK, (id + 1) * CHUNK);

export default sitemap;
