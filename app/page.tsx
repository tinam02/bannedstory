import Char from '@/components/atoms/Char';
import Platform from '@/components/atoms/Platform';
import Closet from '@/components/molecules/Items/Closet/Closet';
import { fontArial } from './styles/fonts';
import Cursor from '@/components/atoms/Cursor';

export default async function Home({ searchParams }: { searchParams: any }) {
  return (
    <main className={fontArial}>
      <Char reqBody={{}} />
      <Platform />
      <Closet />
      <Cursor />
    </main>
  );
}
