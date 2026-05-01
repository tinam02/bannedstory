'use client';
import useChar from '@/app/context/CharCtx';
import BodyItem from '@/components/atoms/BodyItem';
import {
  characterRenderUrl,
  fetchBodyItems,
  IBodyTypes,
  preloadImageUrl,
} from '@/lib/fetch';
import { useEffect, useState } from 'react';
import Pagination from '../../atoms/Pagination/Pagination';
import { stItemList, stPaginationContainer } from './items.css';
import Search from '@/components/atoms/Search/Search';
import { loadSavedBody } from '@/lib/utils';
import { IChar } from '@/types';

export const getItemId = (item: any, q: IBodyTypes) => {
  const key = `${q}Id`;
  return item[key];
};
const BodyItems = ({ q = 'face' }: { q: IBodyTypes }) => {
  const [items, setItems] = useState<any>({});
  const [page, setPage] = useState(0);
  const [nameText, setNameText] = useState('');
  const { equippedItems, equippedBodyItems, setEquippedBodyItems } = useChar();

  const previewOnHover = (itemId: number) => {
    const saved = loadSavedBody();
    const slotKey = `${q}Id` as 'faceId' | 'hairId';
    const preview: IChar = {
      ...saved,
      itemIds: equippedItems?.map((i: any) => i.itemId) ?? saved.itemIds ?? [],
      faceId:
        equippedBodyItems?.find((i: any) => i.faceId)?.faceId ?? saved.faceId,
      hairId:
        equippedBodyItems?.find((i: any) => i.hairId)?.hairId ?? saved.hairId,
      [slotKey]: itemId,
    };
    preloadImageUrl(characterRenderUrl(preview));
  };

  useEffect(() => {
    fetchBodyItems({
      page,
      q,
      nameText,
    }).then(res => setItems(res));
  }, [page, q, nameText]);

  function addToChar(item: any, imgSrc?: any) {
    item.imgSrc = imgSrc;

    setEquippedBodyItems((prev: any[] | null) => {
      // normalize previous st
      const prevArr = Array.isArray(prev) ? prev : [];

      const slotKey = `${q}Id`;
      const newId = item[slotKey];
      if (newId == null) return prevArr;

      // if same item already equipped in this slot, do nothing
      if (prevArr.some(i => i[slotKey] === newId)) {
        return prevArr;
      }

      // remove whatever was in this slot before
      const withoutThisSlot = prevArr.filter(i => i[slotKey] == null);

      // add new item for this slot
      return [...withoutThisSlot, item];
    });
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
              <div
                key={itemId}
                className='closet-item clickable'
                onMouseEnter={() => previewOnHover(itemId)}
              >
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
        <div className={stPaginationContainer}>
          <Search setNameText={setNameText} setPage={setPage} />
          {items.metadata && (
            <Pagination metadata={items.metadata} setPage={setPage} />
          )}
        </div>
      </div>
    </>
  );
};

export default BodyItems;
