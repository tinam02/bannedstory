import Closet from '@/components/molecules/Items/Closet/Closet';
import { fontArial } from './styles/fonts';
import Cursor from '@/components/atoms/Cursor';
import Wearing from '@/components/molecules/Items/Wearing/Wearing';
import Toolbar from '@/components/molecules/Toolbar/Toolbar';
import Stage from '@/components/molecules/Stage/Stage';

export default async function Home() {
  return (
    <main className={fontArial}>
      <Toolbar />
      <Stage />
      <Closet />
      <Cursor />
      <Wearing />
    </main>
  );
}
