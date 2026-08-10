import type { Metadata } from 'next';
import { categories } from '@/lib/items';
import Hub, { hubMetadata } from './hub';

type Params = { cat: string };

// no `dynamicParams = false`, see the note in [slug]/page.tsx
export function generateStaticParams(): Params[] {
  return categories().map(c => ({ cat: c.key }));
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  return hubMetadata(params.cat, 1);
}

export default function CategoryPage({ params }: { params: Params }) {
  return <Hub cat={params.cat} page={1} />;
}
