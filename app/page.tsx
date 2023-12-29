import Char from '@/components/atoms/Char';
import Items from '@/components/molecules/Items';

export default async function Home() {
  return (
    <main>
      <Char reqBody={{}} /><Items/>
    </main>
  );
}
