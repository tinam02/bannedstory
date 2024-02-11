import Char from '@/components/atoms/Char';
import Platform from '@/components/atoms/Platform';
import Items from '@/components/molecules/Items/Items';
import { style } from 'typestyle';

export default async function Home({ searchParams }: { searchParams: any }) {
  return (
    <main>
      <Char reqBody={{}} />
      <Platform />
      <Items q={'Hat'} />
      <Items q={'Top'} />
      <Items q={'Bottom'} />
    </main>
  );
}
