'use client';
import { fetchItems } from '@/lib/fetch';
import Item from '../../atoms/Item';
import Pagination from '../../atoms/Pagination';
import { useEffect, useState } from 'react';
import { stItemList } from './items.css';

const Items = ({ q }: { q: any }) => {
  const [items, setItems] = useState<any>({});
  const [page, setPage] = useState(0);
  useEffect(() => {
    console.log(page);
    fetchItems({
      page,
    }).then(res => setItems(res));
  }, [page]);

  function addToChar(item: any) {
    console.log(item);
  }

  if (!items) return <>...</>;
  return (
    <div className={stItemList}>
      {items.result?.length > 1 &&
        items?.result?.map((item: any) => {
          return (
            <div key={item.itemId}>
              <Item item={item} onClick={()=>addToChar(item)} />
            </div>
          );
        })}
      {items.metadata && (
        <Pagination metadata={items.metadata} setPage={setPage} />
      )}
    </div>
  );
};

export default Items;
