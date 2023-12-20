import { loadItems } from '@/lib/fetch';
import Image from './atoms/Image';

const Item = ({ i }) => {
  console.log('i', i);
  return (
    <div>
      <h1>Items</h1>
      <ul>
        <Image
          src={`data:image/png;base64,${i.metaInfo?.iconRaw}`}
          alt={i.description?.name}
        />
      </ul>
    </div>
  );
};

export default Item;
