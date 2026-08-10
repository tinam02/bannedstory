/**
 * The pieces every catalogue page is built from.
 *
 * All server components. Nothing here is interactive, and the point of the
 * item pages is that a crawler and a reader with no javascript both get the
 * whole thing out of the html
 */

import Link from 'next/link';
import { GITHUB_URL } from '@/lib/site';
import {
  Item,
  categoryByKey,
  fitScale,
  iconUrl,
  itemPath,
  titleOf,
} from '@/lib/items';
import styles from './items.module.scss';

export const SITE = 'https://henehoe.app';

/** one crumb. `href` is left off the last one, which is the page you are on */
export type Crumb = { name: string; href?: string };

/**
 * The trail, drawn and marked up in one go.
 *
 * BreadcrumbList is the one bit of structured data worth having here. Product
 * is not: these have no price and no seller, and marking up a fan site's
 * dress up items as merchandise is the kind of thing that gets a manual action
 */
export const Breadcrumbs = ({ trail }: { trail: Crumb[] }) => (
  <nav className={styles.crumbs} aria-label='Breadcrumb'>
    <ol>
      {trail.map(c => (
        <li key={c.name}>
          {c.href ? <Link href={c.href}>{c.name}</Link> : <span>{c.name}</span>}
        </li>
      ))}
    </ol>
    <script
      type='application/ld+json'
      // the trail is built from our own category table and item names, never
      // from anything a visitor can set
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: trail.map((c, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: c.name,
            ...(c.href ? { item: `${SITE}${c.href}` } : {}),
          })),
        }),
      }}
    />
  </nav>
);

/** an icon at a whole number scale, sized so nothing shifts when it loads */
export const Sprite = ({
  id,
  w,
  h,
  alt,
  box,
}: {
  id: number;
  w: number;
  h: number;
  alt: string;
  box: number;
}) => {
  const s = fitScale(w, h, box);
  return (
    // next/image would resize and re-encode a 30 pixel sprite, which is both
    // pointless and the one thing that would ruin it
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={styles.pixels}
      src={iconUrl(id)}
      alt={alt}
      width={w * s}
      height={h * s}
      loading='lazy'
      decoding='async'
    />
  );
};

/** one item in a grid */
export const Card = ({ item }: { item: Item }) => {
  const cat = categoryByKey(item.c);
  return (
    <li>
      <Link href={itemPath(item)} className={styles.card}>
        <span className={styles.shot}>
          <Sprite
            id={item.id}
            w={item.ic[0]}
            h={item.ic[1]}
            alt={titleOf(item)}
            box={56}
          />
        </span>
        <span className={styles.cardName}>{titleOf(item)}</span>
        <span className={styles.cardMeta}>
          {item.cash ? 'Cash' : (cat?.noun ?? '')}
        </span>
      </Link>
    </li>
  );
};

export const Grid = ({ items }: { items: Item[] }) => (
  <ul className={styles.grid}>
    {items.map(i => (
      <Card key={`${i.c}-${i.id}`} item={i} />
    ))}
  </ul>
);

export const Footer = () => (
  <p className={styles.footer}>
    MapleStory and all related assets are &copy; NEXON Korea Corp. Henehoe is an
    unofficial, non-commercial fan project, not affiliated with Nexon.{' '}
    <a href={GITHUB_URL} target='_blank' rel='noopener noreferrer'>
      Source on GitHub
    </a>
  </p>
);

/**
 * The numbered pager under a hub.
 *
 * First, last, and a window around where you are. A category of 118 pages
 * cannot list them all in the footer without the links being worth nothing,
 * and this still leaves every page reachable in a couple of hops
 */
export const Pager = ({
  page,
  pages,
  href,
}: {
  page: number;
  pages: number;
  href: (n: number) => string;
}) => {
  if (pages < 2) return null;

  const around = new Set<number>([1, pages, page]);
  for (let i = 1; i <= 2; i += 1) {
    if (page - i > 0) around.add(page - i);
    if (page + i <= pages) around.add(page + i);
  }
  const shown = Array.from(around).sort((a, b) => a - b);

  return (
    <nav className={styles.pager} aria-label='Pagination'>
      {page > 1 && (
        <Link className={styles.pageLink} href={href(page - 1)} rel='prev'>
          &larr; Previous
        </Link>
      )}
      {shown.map((n, i) => (
        <span key={n}>
          {i > 0 && shown[i - 1] !== n - 1 && (
            <span className={styles.pageGap}>&hellip;</span>
          )}
          {n === page ? (
            <span className={styles.pageHere} aria-current='page'>
              {n}
            </span>
          ) : (
            <Link className={styles.pageLink} href={href(n)}>
              {n}
            </Link>
          )}
        </span>
      ))}
      {page < pages && (
        <Link className={styles.pageLink} href={href(page + 1)} rel='next'>
          Next &rarr;
        </Link>
      )}
    </nav>
  );
};
