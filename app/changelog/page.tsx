import type { Metadata } from 'next';
import Link from 'next/link';
import Cursor from '@/components/atoms/Cursor';
import { GITHUB_URL } from '@/lib/site';
import { entries, formatDate, lastUpdated } from '@/lib/changelog';
import styles from './page.module.scss';

const DESCRIPTION =
  'Every update to Henehoe, the MapleStory character creator. New cash shop ' +
  'items, hair, faces, outfits and features, with the date each one landed';

export const metadata: Metadata = {
  title: 'Changelog',
  description: DESCRIPTION,
  alternates: { canonical: '/changelog' },
  // no `images` here on purpose. declaring openGraph at all drops the one
  // app/opengraph-image.tsx generates, and next gives no way to name a
  // generated image by hand, so the fields are set individually instead
  openGraph: {
    type: 'article',
    url: '/changelog',
    title: 'Changelog | Henehoe',
    description: DESCRIPTION,
    siteName: 'Henehoe',
    locale: 'en_GB',
  },
};

export default function ChangelogPage() {
  const all = entries();

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <Link href='/' className={styles.back}>
          &larr; Back to the character creator
        </Link>

        <h1 className={styles.title}>Changelog</h1>
        <p className={styles.blurb}>
          Last updated {formatDate(lastUpdated())}.
        </p>

        {all.map(e => (
          <article key={e.date} className={styles.entry}>
            <time className={styles.date} dateTime={e.date}>
              {formatDate(e.date)}
            </time>
            <h2 className={styles.entryTitle}>{e.title}</h2>
            {e.body && <p className={styles.body}>{e.body}</p>}
            {e.notes?.length ? (
              <ul className={styles.notes}>
                {e.notes.map(n => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}

        <p className={styles.footer}>
          MapleStory and all related assets are &copy; NEXON Korea Corp. Henehoe
          is an unofficial, non-commercial fan project, not affiliated with
          Nexon.{' '}
          <a href={GITHUB_URL} target='_blank' rel='noopener noreferrer'>
            Source on GitHub
          </a>
        </p>
      </div>
      <Cursor />
    </main>
  );
}
