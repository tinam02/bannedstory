'use client';
import { characterRenderUrl, fetchItems, preloadImageUrl } from '@/lib/fetch';
import Item from '../../atoms/Item';
import Pagination from '../../atoms/Pagination/Pagination';
import { useEffect, useState } from 'react';
import { stEmpty, stItemList, stPaginationContainer } from './items.css';
import useChar from '@/app/context/CharCtx';
import Search from '@/components/atoms/Search/Search';
import { loadSavedBody, selectedItemsToBody } from '@/lib/utils';
import { useSweepDebounce } from '@/app/hooks/useSweepDebounce';

const Items = ({ q }: { q: string }) => {
  const [items, setItems] = useState<any>({});
  const [page, setPage] = useState(0);
  const [nameText, setNameText] = useState('');
  const [loading, setLoading] = useState(true);
  const { selectedItems, setSelectedItems } = useChar();
  const preloader = useSweepDebounce();

  useEffect(() => {
    // Responses can land out of order once queries fire while typing — ignore
    // anything that resolves after its query has been superseded.
    let stale = false;
    setLoading(true);
    fetchItems({
      page,
      subcategory: q,
      nameText,
    }).then(res => {
      if (stale) return;
      setItems(res);
      setLoading(false);
    });
    return () => {
      stale = true;
    };
  }, [page, q, nameText]);

  const previewOnHover = (item: any) => {
    const saved = loadSavedBody();
    const preview = selectedItemsToBody(
      { ...(selectedItems ?? {}), [item.subcategory]: item },
      saved,
    );
    preloadImageUrl(characterRenderUrl(preview));
  };

  function addToChar(item: any, imgSrc: any) {
    setSelectedItems(prev => ({
      ...(prev ?? {}),
      [item.subcategory]: { ...item, imgSrc },
    }));
  }

  if (!items) return <>...</>;
  return (
    <>
      <div className={stItemList} data-loading={loading ? '' : undefined}>
        {!loading && items.result?.length === 0 && (
          <div className={stEmpty}>
            {nameText ? `No items match “${nameText}”` : 'No items found'}
          </div>
        )}
        {items.result?.length > 0 &&
          items?.result?.map((item: any) => {
            return (
              <div
                key={item.itemId}
                className='closet-item clickable'
                onMouseEnter={() =>
                  preloader.trigger(() => previewOnHover(item))
                }
              >
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
