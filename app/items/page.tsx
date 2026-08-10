import type { Metadata } from 'next';
import Link from 'next/link';
import Cursor from '@/components/atoms/Cursor';
import {
  allItems,
  categories,
  categoryCounts,
  categoryPath,
} from '@/lib/items';
import { Breadcrumbs, Footer } from './parts';
import styles from './items.module.scss';

const DESCRIPTION =
  'Every MapleStory cosmetic in one place. Browse hats, hairstyles, faces, ' +
  'outfits, capes and weapons pulled straight from the game files, and try ' +
  'any of them on a character in the browser.';

export const metadata: Metadata = {
  title: 'MapleStory item catalogue',
  description: DESCRIPTION,
  alternates: { canonical: '/items' },
  openGraph: {
    type: 'website',
    url: '/items',
    title: 'MapleStory item catalogue | Henehoe',
    description: DESCRIPTION,
    siteName: 'Henehoe',
    locale: 'en_GB',
  },
};

export default function ItemsIndex() {
  const counts = new Map(categoryCounts().map(c => [c.key, c]));
  const pages = allItems().length;
  const ids = categoryCounts().reduce((n, c) => n + c.ids, 0);

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <Breadcrumbs
          trail={[{ name: 'Henehoe', href: '/' }, { name: 'Items' }]}
        />

        <h1 className={styles.title}>MapleStory item catalogue</h1>
        <p className={styles.blurb}>
          {ids.toLocaleString()} items across {categories().length} categories <br/>
          Hairstyles and faces share a page with
          their colour variants
        </p>

        <ul className={styles.cats}>
          {categories().map(c => {
            const n = counts.get(c.key);
            return (
              <li key={c.key}>
                <Link href={categoryPath(c.key)} className={styles.cat}>
                  <span className={styles.catName}>{c.title}</span>
                  <span className={styles.catCount}>
                    &nbsp;{(n?.ids ?? 0).toLocaleString()} items
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <p className={styles.sectionNote} style={{ marginTop: 32 }}>
          <Link href='/'>Back to the character creator</Link>
        </p>

        <Footer />
      </div>
      <Cursor />
    </main>
  );
}
