'use client';
import useChar from '@/app/context/CharCtx';
import BodyItem from '@/components/atoms/BodyItem';
import { fetchBodyItems, IBodyTypes } from '@/lib/fetch';
import { useEffect, useState } from 'react';
import Pagination from '../../atoms/Pagination/Pagination';
import { stItemList } from './items.css';

export const getItemId = (item: any, q: IBodyTypes) => {
  const key = `${q}Id`;
  return item[key];
};
const BodyItems = ({
  q = 'face',
  nameText = '',
}: {
  q: IBodyTypes;
  nameText?: string;
}) => {
  const [items, setItems] = useState<any>({});
  const [page, setPage] = useState(0);
  const { equippedBodyItems, setEquippedBodyItems } = useChar();

  useEffect(() => {
    fetchBodyItems({
      page,
      q,
      nameText,
    }).then(res => setItems(res));
  }, [page, q, nameText]);

  function addToChar(item: any) {
    if (
      !equippedBodyItems?.find(
        (i: any) => getItemId(i, q) === getItemId(item, q)
      )
    ) {
      const newEquippedItems = equippedBodyItems.filter(
        (i: any) => !getItemId(i, q)
      );
      setEquippedBodyItems([...newEquippedItems, item]);
    }
  }
// console.log('qq',items,nameText)
  if (!items) return <>...</>;
  return (
    <>
      <div className={stItemList}>
        {items.result?.length > 1 &&
          items?.result?.map((item: any) => {
            const itemId = getItemId(item, q);
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
    </>
  );
};

export default BodyItems;
