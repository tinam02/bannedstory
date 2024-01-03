import Char from '@/components/atoms/Char';
import Items from '@/components/molecules/Items/Items';
 
export default async function Home({searchParams}:{
  searchParams: any
}) { 
  return (
    <main>
      <Char reqBody={{}} /><Items q={searchParams}/>
    </main>
  );
}
