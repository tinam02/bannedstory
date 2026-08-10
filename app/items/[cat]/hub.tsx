/**
 * A category hub, page 1 and page N.
 *
 * Two routes render this: /items/hat and /items/hat/page/2. They are the same
 * page with a different slice, and keeping the first page at the bare url
 * rather than /page/1 means the category has one address rather than two that
 * both work
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Cursor from '@/components/atoms/Cursor';
import {
  PAGE_SIZE,
  categoryByKey,
  categoryPath,
  itemsIn,
  pageCount,
} from '@/lib/items';
import { Breadcrumbs, Footer, Grid, Pager } from '../parts';
import styles from '../items.module.scss';

/**
 * What a category is, in a sentence.
 *
 * The hubs are 448 pages that would otherwise differ only by their contents,
 * so each category says something true about itself that the others do not
 */
const ABOUT: Record<string, string> = {
  hat: 'Hats sit in the cap slot. Most cover part of the hairstyle and some hide it completely, which is noted on every hat page.',
  hair: 'Hairstyles come in eight colours: black, red, orange, blonde, green, blue, purple and brown. Each style has one page with all of its colours on it.',
  face: 'Faces carry the character’s expressions. Every face has several eye colours, grouped onto one page.',
  'eye-accessory': 'Eye accessories sit over the eyes, in the slot glasses and eyepatches use.',
  'face-accessory': 'Face accessories cover the mouth and cheeks, the slot masks and face paint use.',
  earrings: 'Earrings sit on the ear, and show or hide depending on the ear type and the hairstyle.',
  top: 'Tops fill the coat slot on their own, and are worn with a separate bottom.',
  bottom: 'Bottoms fill the trouser slot, worn under a top rather than an overall.',
  overall: 'Overalls are one piece and take up the top and the bottom slot together.',
  shoes: 'Shoes sit under the trouser, and a few are tall enough to cover it.',
  gloves: 'Gloves cover the hands, and change shape depending on what the character is holding.',
  cape: 'Capes hang behind the character. Many of the cash ones are pure effect, with the whole look living in an animation rather than a sprite.',
  weapon: 'Weapons are held in the hand and drive which attack animations the character can play. Two handed ones take the shield slot as well.',
};

export const hubMetadata = (key: string, page: number): Metadata => {
  const cat = categoryByKey(key);
  if (!cat) return {};
  const total = itemsIn(key).length;
  const pages = pageCount(key);
  const suffix = page > 1 ? ` (page ${page} of ${pages})` : '';
  const title = `MapleStory ${cat.title.toLowerCase()}${suffix}`;
  const description = `All ${total.toLocaleString()} MapleStory ${cat.title.toLowerCase()} in one list${suffix ? `, page ${page} of ${pages}` : ''}. ${ABOUT[key] ?? ''} Try any of them on a character, free, in the browser.`;
  const url = categoryPath(key, page);

  return {
    title,
    description: description.slice(0, 300),
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title: `${title} | Henehoe`,
      description: description.slice(0, 300),
      siteName: 'Henehoe',
      locale: 'en_GB',
    },
  };
};

export default function Hub({ cat: key, page }: { cat: string; page: number }) {
  const cat = categoryByKey(key);
  if (!cat) notFound();

  const all = itemsIn(key);
  const pages = pageCount(key);
  if (page < 1 || page > pages) notFound();

  const slice = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <Breadcrumbs
          trail={[
            { name: 'Henehoe', href: '/' },
            { name: 'Items', href: '/items' },
            ...(page > 1
              ? [
                  { name: cat.title, href: categoryPath(key) },
                  { name: `Page ${page}` },
                ]
              : [{ name: cat.title }]),
          ]}
        />

        <h1 className={styles.title}>
          MapleStory {cat.title.toLowerCase()}
          {page > 1 ? `, page ${page}` : ''}
        </h1>
        <p className={styles.blurb}>
          {all.length.toLocaleString()}{' '}
          {all.length === 1 ? cat.noun : cat.title.toLowerCase()}, straight out
          of the game files. {ABOUT[key] ?? ''}
        </p>

        <Grid items={slice} />

        <Pager page={page} pages={pages} href={n => categoryPath(key, n)} />

        <p className={styles.sectionNote} style={{ marginTop: 32 }}>
          <Link href='/items'>All item categories</Link>
        </p>

        <Footer />
      </div>
      <Cursor />
    </main>
  );
}
