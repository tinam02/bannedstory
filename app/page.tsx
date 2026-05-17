import Char from '@/components/atoms/Char';
import Platform from '@/components/atoms/Platform';
import Closet from '@/components/molecules/Items/Closet/Closet';
import { fontArial } from './styles/fonts';
import Cursor from '@/components/atoms/Cursor';
import Wearing from '@/components/molecules/Items/Wearing/Wearing';
import ZoomControls from '@/components/atoms/ZoomControls';
import SkinPicker from '@/components/atoms/SkinPicker';

export default async function Home() {
  return (
    <main className={fontArial}>
      <ZoomControls />
      <SkinPicker />
      <Char />
      <Platform />
      <Closet />
      <Cursor />
      <Wearing />
    </main>
  );
}
