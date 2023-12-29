import { fetchItems } from '@/lib/fetch';
import { useEffect } from 'react';

const Items = async () => {
  const {result,metadata} = await fetchItems({});
  return (
    <div>
      {result.length >1 && result?.map(item => {  console.log(item);

        return (
          <div key={item.id}>
            <h1>{item.name}</h1>
            <h2>{item.description}</h2>
            <h3>{item.price}</h3>
          </div>
        );
      })}
    </div>
  );
};

export default Items;
