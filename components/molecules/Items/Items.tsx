'use client';
import { fetchItems } from '@/lib/fetch';
import Item from '../../atoms/Item';
import Pagination from '../../atoms/Pagination/Pagination';
import { useEffect, useState } from 'react';
import { stItemList, stPaginationContainer } from './items.css';
import useChar from '@/app/context/CharCtx';
import Search from '@/components/atoms/Search/Search';

const Items = ({ q }: { q: string }) => {
  const [items, setItems] = useState<any>({});
  const [page, setPage] = useState(0);
  const [nameText, setNameText] = useState('');
  const { equippedItems, setEquippedItems } = useChar();

  useEffect(() => {
    fetchItems({
      page,
      subcategory: q,
      nameText,
    }).then(res => setItems(res));
  }, [page, q, nameText]);

  function addToChar(item: any, imgSrc: any) {
    item.imgSrc = imgSrc;
    const eqI = equippedItems || [];
    if (!eqI.includes(item)) {
      //if equipepditems already has the item with this category, remove old
      if (eqI.some((i: any) => i.subcategory === item.subcategory)) {
        //remove old item
        const newEquippedItems = eqI.filter(
          (i: any) => i.subcategory !== item.subcategory
        );
        setEquippedItems([...newEquippedItems, item]);
        return;
      }
      setEquippedItems([...eqI, item]);
    }
  }

  if (!items) return <>...</>;
  return (
    <>
      <div className={stItemList}>
        {items.result?.length > 1 &&
          items?.result?.map((item: any) => {
            return (
              <div key={item.itemId} className='closet-item clickable'>
                <Item item={item} onClick={imgSrc => addToChar(item, imgSrc)} />
              </div>
            );
          })}
      </div>

      <div className={stPaginationContainer}>
        <Search setNameText={setNameText} setPage={setPage} />
        {items.metadata && (
          <Pagination metadata={items.metadata} setPage={setPage} />
        )}
      </div>
    </>
  );
};

export default Items;
