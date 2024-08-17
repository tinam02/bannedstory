'use client';
import { fetchFaces, fetchItems, IBodyTypes } from '@/lib/fetch';
import Item from '../../atoms/Item';
import Pagination from '../../atoms/Pagination/Pagination';
import { useEffect, useState } from 'react';
import { stItemList } from './items.css';
import useChar from '@/app/context/CharCtx';
import BodyItem from '@/components/atoms/BodyItem';

const BodyItems = ({ q = 'face' }: { q: IBodyTypes }) => {
  const [items, setItems] = useState<any>({});
  const [page, setPage] = useState(0);
  const { equippedBodyItems, setEquippedBodyItems } = useChar();

  useEffect(() => {
    fetchFaces({
      page,
    }).then(res => setItems(res));
  }, [page, q]);

  function addToChar(item: any) {
    if (!equippedBodyItems?.find((i: any) => i.faceId === item.faceId)) {
      const newEquippedItems = equippedBodyItems.filter((i: any) => !i.faceId);
      setEquippedBodyItems([...newEquippedItems, item]);
    }
  }

  if (!items) return <>...</>;
  return (
    <div className={stItemList}>
      {items.result?.length > 1 &&
        items?.result?.map((item: any) => {
          const itemId = item.faceId || item.hairId;
          return (
            <div key={itemId}>
              <BodyItem
                item={{
                  ...item,
                  itemId,
                }}
                onClick={() => addToChar(item)}
                q={q}
              />
            </div>
          );
        })}
      {items.metadata && (
        <Pagination metadata={items.metadata} setPage={setPage} />
      )}
    </div>
  );
};

export default BodyItems;
