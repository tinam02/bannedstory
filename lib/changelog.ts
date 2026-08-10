/**
 * after LATEST-ITEMS.m
 */

export type ChangeEntry = {
  /** yyyy-mm-dd drives <time datetime> and the sitemap lastModified */
  date: string;
  title: string;
  body?: string;
  /** bullets */
  notes?: string[];
};

export const CHANGELOG: ChangeEntry[] = [
  {
    date: '2026-08-10',
    title: 'Henehoe is live',
    body:
      'The closet now runs entirely on art extracted from the game client, so it ' +
      'is no longer capped at whatever the old public API happened to have.',
    notes: [
      '52,724 items across 13 tabs,',
      'Characters are composited in the browser and animated on real frame delays',
      'Poses, expressions, ear types, chat balloons, name tags and map backdrops',
      'Save a character as an animated PNG',
    ],
  },
];

/** newest first, whatever order the array happens to be written in */
export const entries = () =>
  [...CHANGELOG].sort((a, b) => b.date.localeCompare(a.date));

/** for metadata and the sitemap */
export const lastUpdated = () => entries()[0]?.date ?? '2026-08-10';

export const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
