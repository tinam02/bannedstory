import Image from 'next/image';
import { loadItems, sendData } from '@/lib/fetch';
import Item from '@/components/Item';
import Char from '@/components/Char';

export default async function Home() {
  //const data = await loadItems();
  const character = await sendData( );
  console.log(character)
  return (
    <main>
     <Char d={character} />
    </main>
  );
}
