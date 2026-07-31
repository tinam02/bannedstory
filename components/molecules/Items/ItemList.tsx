'use client';
import { useEffect, useState } from 'react';
import {
  characterRenderUrl,
  fetchItems,
  itemIconUrl,
  preloadImageUrl,
} from '@/lib/fetch';
import Item from '../../atoms/Item';
import Pagination from '../../atoms/Pagination/Pagination';
import { stEmpty, stItemList, stPaginationContainer } from './items.css';
import useChar from '@/app/context/CharCtx';
import Search, { SEARCH_DEBOUNCE_MS } from '@/components/atoms/Search/Search';
import { loadSavedBody, selectedItemsToBody } from '@/lib/utils';
import { useSweepDebounce } from '@/app/hooks/useSweepDebounce';
import { useDebouncedValue } from '@/app/hooks/useDebouncedValue';

/**
 * One closet tab. `subcategory` is both the maplestory.io filter and the slot
 * key an equipped item lands under, so gear and face/hair only differ in which
 * icon endpoint they use.
 */
const ItemList = ({
  subcategory,
  iconUrl = itemIconUrl,
}: {
  subcategory: string;
  iconUrl?: (itemId: number) => string;
}) => {
  const [items, setItems] = useState<any>({});
  const [page, setPage] = useState(0);
  // `query` is what's in the box; `nameText` is what the list is fetched for.
  const [query, setQuery] = useState('');
  const [nameText, applyQueryNow] = useDebouncedValue(
    query.trim(),
    SEARCH_DEBOUNCE_MS,
  );
  const [loading, setLoading] = useState(true);
  const { selectedItems, setSelectedItems } = useChar();
  const preloader = useSweepDebounce();

  useEffect(() => {
    // Responses can land out of order once queries fire while typing — ignore
    // anything that resolves after its query has been superseded.
    let stale = false;
    setLoading(true);
    fetchItems({ page, subcategory, nameText }).then(res => {
      if (stale) return;
      setItems(res);
      setLoading(false);
    });
    return () => {
      stale = true;
    };
  }, [page, subcategory, nameText]);

  const previewOnHover = (item: any) => {
    const preview = selectedItemsToBody(
      { ...(selectedItems ?? {}), [subcategory]: item },
      loadSavedBody(),
    );
    preloadImageUrl(characterRenderUrl(preview));
  };

  const addToChar = (item: any, imgSrc: string) => {
    setSelectedItems(prev => ({
      ...(prev ?? {}),
      [subcategory]: { ...item, subcategory, imgSrc },
    }));
  };

  return (
    <>
      <div className={stItemList} data-loading={loading ? '' : undefined}>
        {!loading && items.result?.length === 0 && (
          <div className={stEmpty}>
            {nameText ? `No items match “${nameText}”` : 'No items found'}
          </div>
        )}
        {items.result?.map((item: any) => (
          <div
            key={item.itemId}
            className='closet-item clickable'
            onMouseEnter={() => preloader.trigger(() => previewOnHover(item))}
          >
            <Item
              item={item}
              iconUrl={iconUrl(item.itemId)}
              onClick={imgSrc => addToChar(item, imgSrc)}
            />
          </div>
        ))}
      </div>

      <div className={stPaginationContainer}>
        <Search
          value={query}
          onChange={next => {
            setQuery(next);
            setPage(0);
          }}
          onSubmit={next => {
            applyQueryNow(next.trim());
            setPage(0);
          }}
        />
        {items.metadata && (
          <Pagination metadata={items.metadata} setPage={setPage} />
        )}
      </div>
    </>
  );
};

export default ItemList;
