import Char from '@/components/atoms/Char';
import DebouncedInput from '@/components/atoms/DebouncedInput';
import Platform from '@/components/atoms/Platform';
import BodyItems from '@/components/molecules/Items/Body';
import Closet from '@/components/molecules/Items/Closet/Closet';
import Items from '@/components/molecules/Items/Items';
import { style } from 'typestyle';

export default async function Home({ searchParams }: { searchParams: any }) {
  return (
    <main>
      <Char reqBody={{}} />
      <Platform />
      <Closet />
     
    </main>
  );
}
