import Char from '@/components/atoms/Char';
import Platform from '@/components/atoms/Platform';
import Closet from '@/components/molecules/Items/Closet/Closet';
import { fontArial } from './styles/fonts';

export default async function Home({ searchParams }: { searchParams: any }) {
  return (
    <main className={fontArial}>
      <Char reqBody={{}} />
      <Platform />
      <Closet />
    </main>
  );
}
