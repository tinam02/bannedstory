import Closet from '@/components/molecules/Items/Closet/Closet';
import { fontArial } from './styles/fonts';
import Cursor from '@/components/atoms/Cursor';
import Wearing from '@/components/molecules/Items/Wearing/Wearing';
import Toolbar from '@/components/molecules/Toolbar/Toolbar';
import Stage from '@/components/molecules/Stage/Stage';
import SiteCopy from '@/components/atoms/SiteCopy/SiteCopy';

export default async function Home() {
  return (
    <main className={fontArial}>
      <SiteCopy />
      <Toolbar />
      <Stage />
      <Closet />
      <Cursor />
      <Wearing />
    </main>
  );
}
