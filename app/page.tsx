import Char from '@/components/atoms/Char';
import Platform from '@/components/atoms/Platform';
import BodyItems from '@/components/molecules/Items/Body';
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
      <BodyItems q={'face'} />
    </main>
  );
}
