import Char from '@/components/atoms/Char';
import Platform from '@/components/atoms/Platform';
import Closet from '@/components/molecules/Items/Closet/Closet';

export default async function Home({ searchParams }: { searchParams: any }) {
  return (
    <main>
      <Char reqBody={{}} />
      <Platform />
      <Closet />
    </main>
  );
}
