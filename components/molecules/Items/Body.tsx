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
import { loadSavedBody, selectedItemsToBody } from '@/lib/utils';
import { useSweepDebounce } from '@/app/hooks/useSweepDebounce';

export const getItemId = (item: any, q: IBodyTypes) => {
  const key = `${q}Id`;
  return item[key];
};

// Lowercase API slug (face/hair) → capitalized subcategory used as the slot key.
const slotForQ = (q: IBodyTypes) => (q === 'face' ? 'Face' : 'Hair');

const BodyItems = ({ q = 'face' }: { q: IBodyTypes }) => {
  const [items, setItems] = useState<any>({});
  const [page, setPage] = useState(0);
  const [nameText, setNameText] = useState('');
  const { selectedItems, setSelectedItems } = useChar();
  const preloader = useSweepDebounce();

  const previewOnHover = (itemId: number) => {
    const saved = loadSavedBody();
    const slot = slotForQ(q);
    const previewItems = {
      ...(selectedItems ?? {}),
      [slot]: { itemId, subcategory: slot },
    };
    preloadImageUrl(characterRenderUrl(selectedItemsToBody(previewItems, saved)));
  };

  useEffect(() => {
    fetchBodyItems({
      page,
      q,
      nameText,
    }).then(res => setItems(res));
  }, [page, q, nameText]);

  function addToChar(item: any, imgSrc?: string) {
    const slot = slotForQ(q);
    const itemId = item[`${q}Id`] ?? item.itemId;
    if (itemId == null) return;
    setSelectedItems(prev => ({
      ...(prev ?? {}),
      [slot]: { ...item, itemId, subcategory: slot, imgSrc },
    }));
  }

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
                onMouseEnter={() => preloader.trigger(() => previewOnHover(itemId))}
              >
                <BodyItem
                  item={{
                    ...item,
                    itemId,
                  }}
                  onClick={imgSrc => addToChar(item, imgSrc)}
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
