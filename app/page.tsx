import Char from '@/components/atoms/Char';
import Platform from '@/components/atoms/Platform';
import Closet from '@/components/molecules/Items/Closet/Closet';
import { fontArial } from './styles/fonts';
import Cursor from '@/components/atoms/Cursor';
import Wearing from '@/components/molecules/Items/Wearing/Wearing';
import ZoomControls from '@/components/atoms/ZoomControls';

export default async function Home() {
  return (
    <main className={fontArial}>
      <ZoomControls />
      <Char />
      <Platform />
      <Closet />
      <Cursor />
      <Wearing />
    </main>
  );
}
