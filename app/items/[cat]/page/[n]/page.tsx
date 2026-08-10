// /items/hat/page/2 onwards.
//
// the folder really is called `page`, which reads oddly next to page.tsx but
// is a plain url segment. next matches static segments before dynamic ones, so
// this wins over [slug] and no item can be shadowed by it

import type { Metadata } from 'next';
import { categories, pageCount } from '@/lib/items';
import Hub, { hubMetadata } from '../../hub';

type Params = { cat: string; n: string };

// no `dynamicParams = false`, see the note in [slug]/page.tsx
export function generateStaticParams(): Params[] {
  const out: Params[] = [];
  for (const c of categories()) {
    // page 1 lives at /items/hat, so this starts at 2
    for (let n = 2; n <= pageCount(c.key); n += 1) {
      out.push({ cat: c.key, n: String(n) });
    }
  }
  return out;
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  return hubMetadata(params.cat, Number(params.n));
}

export default function CategoryPageN({ params }: { params: Params }) {
  return <Hub cat={params.cat} page={Number(params.n)} />;
}
