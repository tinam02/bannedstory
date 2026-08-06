'use client';
import { useEffect, useRef, useState } from 'react';
import {
  characterRenderUrl,
  fetchItems,
  iconUrlFor,
  preloadImageUrl,
} from '@/lib/fetch';
import Item from '../../atoms/Item';
import ScrollBar from '../../atoms/ScrollBar/ScrollBar';
import styles from './Items.module.scss';
import useChar from '@/app/context/CharCtx';
import Search, { SEARCH_DEBOUNCE_MS } from '@/components/atoms/Search/Search';
import CashFilter from '@/components/atoms/CashFilter/CashFilter';
import { useSweepDebounce } from '@/app/hooks/useSweepDebounce';
import { useDebouncedValue } from '@/app/hooks/useDebouncedValue';
import { OutfitItem } from '@/types';

// How close to the bottom of the grid the sentinel starts pulling the next page. Roughly a row and a half of lead time, so the list refills before th scroll actually bottoms out.
const PRELOAD_MARGIN = '200px';

/**
 * One closet tab.
 *
 * `slot` is the key an equipped item lands under, and by default it's also the
 * maplestory.io subcategory to filter by. A tab that spans several categories
 * passes `categories` instead, which is how one WEAPON tab covers swords, bows
 * and everything else while still equipping into a single slot.
 *
 * Pages are appended rather than swapped, so the list just grows as you scroll.
 * Every page is still its own `fetchItems` URL under `force-cache`, so a tab you come back to costs nothing and since Mantine keeps all panels mounted coming back usually doesn't even refetch
 */
const ItemList = ({
  slot,
  categories,
  cashOnly,
  onCashOnlyChange,
}: {
  slot: string;
  categories?: string[];
  cashOnly: boolean;
  onCashOnlyChange: (next: boolean) => void;
}) => {
  const [items, setItems] = useState<OutfitItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  // `query` is what's in the box; `nameText` is what the list is fetched for.
  const [query, setQuery] = useState('');
  const [nameText, applyQueryNow] = useDebouncedValue(
    query.trim(),
    SEARCH_DEBOUNCE_MS,
  );
  const { outfit, equip } = useChar();
  const preloader = useSweepDebounce();

  const gridRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // a stable string, because `categories` arrives as a fresh array literal every
  // render, and putting it in a dep list directly would refetch forever
  const catKey = categories?.join(',') ?? '';

  // A new search means a different list, so the accumulated one is thrown away.
  // Done during render rather than in an effect: React re-renders with the reset values before committing, so the fetch below sees page 0 straight away
  // instead of firing once for the stale page and again for the reset one.
  const listKey = `${slot} ${catKey} ${cashOnly} ${nameText}`;
  const [prevListKey, setPrevListKey] = useState(listKey);
  if (prevListKey !== listKey) {
    setPrevListKey(listKey);
    setItems([]);
    setPage(0);
    setHasMore(true);
  }

  useEffect(() => {
    // Responses can land out of order once queries fire while typing, so
    // anything that resolves after its query has been superseded is ignored.
    let stale = false;
    setLoading(true);
    fetchItems({
      page,
      subcategory: slot,
      categories,
      cashOnly,
      nameText,
    }).then(res => {
      if (stale) return;
      setItems(prev => {
        if (page === 0) return res.result;
        // dedupe ids so no same react keys
        const seen = new Set(prev.map(i => i.id));
        return [...prev, ...res.result.filter(i => !seen.has(i.id))];
      });
      setHasMore(typeof res.metadata.nextPage === 'number');
      setLoading(false);
    });
    return () => {
      stale = true;
    };
    // catKey rather than categories, see above
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, slot, catKey, cashOnly, nameText]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    // Rebuilt once the in-flight page lands: re-observing re-tests the sentinel,
    // so a viewport taller than one page keeps pulling until it's full.
    if (!sentinel || !hasMore || loading) return;
    const io = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) setPage(p => p + 1);
      },
      { root: gridRef.current, rootMargin: PRELOAD_MARGIN },
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, [hasMore, loading]);

  const previewOnHover = (item: OutfitItem) =>
    preloadImageUrl(
      characterRenderUrl({
        ...outfit,
        selectedItems: { ...outfit.selectedItems, [slot]: item },
      }),
    );

  const prefetchOnDwell = (item: OutfitItem) => {
    // Off while animating so we dont prefetch gifs
    if (outfit.animating) return preloader.cancel();
    preloader.trigger(() => previewOnHover(item));
  };

  // Only a fresh query dims the grid. Appends leave what you're looking at alone
  const reloading = loading && page === 0;

  return (
    <div className={styles.panelInner}>
      <div className={styles.searchBar}>
        <Search
          value={query}
          onChange={setQuery}
          onSubmit={next => applyQueryNow(next.trim())}
        />
        <CashFilter on={cashOnly} onChange={onCashOnlyChange} />
      </div>

      <div className={styles.listWrap}>
        <div
          ref={gridRef}
          className={styles.itemList}
          data-loading={reloading ? '' : undefined}
        >
          {!loading && items.length === 0 && (
            <div className={styles.empty}>
              {nameText ? `No items match "${nameText}"` : 'No items found'}
            </div>
          )}
          {items.map(item => (
            <button
              key={item.id}
              type='button'
              className={styles.item}
              onClick={() => equip(slot, item)}
              onMouseEnter={() => prefetchOnDwell(item)}
              onMouseLeave={preloader.cancel}
            >
              <Item item={item} iconUrl={iconUrlFor(item)} />
            </button>
          ))}
          {hasMore && (
            <div ref={sentinelRef} className={styles.sentinel}>
              {loading && page > 0 && 'Loading…'}
            </div>
          )}
        </div>
        <ScrollBar targetRef={gridRef} />
      </div>
    </div>
  );
};

export default ItemList;
