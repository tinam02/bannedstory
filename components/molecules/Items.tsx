import { fetchItems } from '@/lib/fetch';
import Item from '../atoms/Item';

const Items = async () => {
  const { result, metadata } = await fetchItems({});
  return (
    <div>
      {result.length > 1 &&
        result?.map((item: any) => {
          return (
            <div key={item.id}>
              <Item item={item} />
            </div>
          );
        })}
    </div>
  );
};

export default Items;
