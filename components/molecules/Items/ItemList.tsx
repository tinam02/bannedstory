'use client';
import { useEffect, useState } from 'react';
import {
  characterRenderUrl,
  fetchItems,
  iconUrlFor,
  preloadImageUrl,
} from '@/lib/fetch';
import Item from '../../atoms/Item';
import Pagination from '../../atoms/Pagination/Pagination';
import {
  stEmpty,
  stItemList,
  stPaginationContainer,
  stPanelInner,
} from './items.css';
import useChar from '@/app/context/CharCtx';
import Search, { SEARCH_DEBOUNCE_MS } from '@/components/atoms/Search/Search';
import { useSweepDebounce } from '@/app/hooks/useSweepDebounce';
import { useDebouncedValue } from '@/app/hooks/useDebouncedValue';
import { OutfitItem } from '@/types';

/**
 * One closet tab. `subcategory` is both the maplestory.io filter and the slot
 * key an equipped item lands under.
 */
const ItemList = ({ subcategory }: { subcategory: string }) => {
  const [items, setItems] = useState<{
    result?: OutfitItem[];
    metadata?: any;
  }>({});
  const [page, setPage] = useState(0);
  // `query` is what's in the box; `nameText` is what the list is fetched for.
  const [query, setQuery] = useState('');
  const [nameText, applyQueryNow] = useDebouncedValue(
    query.trim(),
    SEARCH_DEBOUNCE_MS,
  );
  const [loading, setLoading] = useState(true);
  const { outfit, equip } = useChar();
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

  const previewOnHover = (item: OutfitItem) =>
    preloadImageUrl(
      characterRenderUrl({
        ...outfit,
        selectedItems: { ...outfit.selectedItems, [subcategory]: item },
      }),
    );

  return (
    <div className={stPanelInner}>
      <div className={stItemList} data-loading={loading ? '' : undefined}>
        {!loading && items.result?.length === 0 && (
          <div className={stEmpty}>
            {nameText ? `No items match “${nameText}”` : 'No items found'}
          </div>
        )}
        {items.result?.map(item => (
          <div
            key={item.id}
            className='closet-item clickable'
            onMouseEnter={() => preloader.trigger(() => previewOnHover(item))}
          >
            <Item
              item={item}
              iconUrl={iconUrlFor(item)}
              onClick={() => equip(subcategory, item)}
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
    </div>
  );
};

export default ItemList;
