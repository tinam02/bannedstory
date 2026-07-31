import Char from '@/components/atoms/Char';
import Platform from '@/components/atoms/Platform';
import Closet from '@/components/molecules/Items/Closet/Closet';
import { fontArial } from './styles/fonts';
import Cursor from '@/components/atoms/Cursor';
import Wearing from '@/components/molecules/Items/Wearing/Wearing';
import Toolbar from '@/components/molecules/Toolbar/Toolbar';

export default async function Home() {
  return (
    <main className={fontArial}>
      <Toolbar />
      <Char />
      <Platform />
      <Closet />
      <Cursor />
      <Wearing />
    </main>
  );
}
