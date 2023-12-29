import Image from 'next/image';
import { loadItems } from '@/lib/fetch';
import Item from '@/components/Item';
import Char from '@/components/Char';

export default async function Home() {
  return (
    <main>
      <Char reqBody={{}} />
    </main>
  );
}
