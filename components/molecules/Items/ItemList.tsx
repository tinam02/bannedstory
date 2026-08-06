'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { preloadImageUrl } from '@/lib/fetch';
import SpriteIcon from '../../atoms/SpriteIcon/SpriteIcon';
import ScrollBar from '../../atoms/ScrollBar/ScrollBar';
import styles from './Items.module.scss';
import useChar from '@/app/context/CharCtx';
import Search, { SEARCH_DEBOUNCE_MS } from '@/components/atoms/Search/Search';
import CashFilter from '@/components/atoms/CashFilter/CashFilter';
import { useSweepDebounce } from '@/app/hooks/useSweepDebounce';
import { useDebouncedValue } from '@/app/hooks/useDebouncedValue';
import useItemIndex, {
  asOutfitItem,
  iconSheetUrl,
} from '@/app/hooks/useItemIndex';
import { ClosetTab } from '@/lib/closet';

// How close to the bottom of the grid the sentinel starts pulling the next page. Roughly a row and a half of lead time, so the list refills before th scroll actually bottoms out.
const PRELOAD_MARGIN = '200px';

// how many rows to reveal at a time. the whole tab is already in memory, this
// only keeps the dom from holding 17000 nodes at once
const LOCAL_PAGE = 60;

/**
 * One closet tab, read entirely from our own extraction.
 *
 * Names, icons and cash flags all come out of the client's own files, so
 * searching is a filter over an array that is already in memory rather than a
 * request
 */
const ItemList = ({
  tab,
  cashOnly,
  onCashOnlyChange,
}: {
  tab: ClosetTab;
  cashOnly: boolean;
  onCashOnlyChange: (next: boolean) => void;
}) => {
  const { slot } = tab;
  const index = useItemIndex(tab);

  const [page, setPage] = useState(0);
  // `query` is what's in the box; `nameText` is what the list is filtered on.
  const [query, setQuery] = useState('');
  const [nameText, applyQueryNow] = useDebouncedValue(
    query.trim(),
    SEARCH_DEBOUNCE_MS,
  );
  const { equip } = useChar();
  const preloader = useSweepDebounce();

  const gridRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // `ids` splits the tabs that share a folder, since wz files face accessories,
  // eye decorations and earrings together in Accessory
  const matches = useMemo(() => {
    if (!index) return [];
    const q = nameText.toLowerCase();
    return index.items.filter(e => {
      if (tab.ids && (e.id < tab.ids.from || e.id >= tab.ids.to)) return false;
      if (cashOnly && !e.cash) return false;
      if (q && !e.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [index, nameText, cashOnly, tab.ids]);

  // A new search means a different list, so start it from the top again.
  // Done during render rather than in an effect, so nothing paints the old
  // scroll position first.
  const listKey = `${slot} ${cashOnly} ${nameText}`;
  const [prevListKey, setPrevListKey] = useState(listKey);
  if (prevListKey !== listKey) {
    setPrevListKey(listKey);
    setPage(0);
  }

  const shown = matches.slice(0, (page + 1) * LOCAL_PAGE);
  const hasMore = shown.length < matches.length;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;
    // `page` has to be in here. an IntersectionObserver only fires on a change,
    // and appending rows leaves the sentinel exactly as intersecting as it
    // already was, so nothing would fire again and the list would stop dead
    // after the first LOCAL_PAGE rows
    const io = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) setPage(p => p + 1);
      },
      { root: gridRef.current, rootMargin: PRELOAD_MARGIN },
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, [hasMore, page]);

  // dwelling on an item warms its sprite sheet, so clicking draws immediately
  const prefetchOnDwell = (id: number) => {
    const folder = tab.index;
    if (!folder) return;
    preloader.trigger(() => preloadImageUrl(`/avatar/${folder}/${id}.png`));
  };

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
          data-loading={index ? undefined : ''}
        >
          {index && matches.length === 0 && (
            <div className={styles.empty}>
              {nameText ? `No items match "${nameText}"` : 'No items found'}
            </div>
          )}
          {index &&
            shown.map(e => (
              <button
                key={e.id}
                type='button'
                className={styles.item}
                onClick={() => equip(slot, asOutfitItem(e, slot))}
                onMouseEnter={() => prefetchOnDwell(e.id)}
                onMouseLeave={preloader.cancel}
              >
                <SpriteIcon
                  sheet={iconSheetUrl(tab.index!, index, e)}
                  x={e.x}
                  y={e.y}
                  w={e.w}
                  h={e.h}
                  title={e.name || String(e.id)}
                />
              </button>
            ))}
          {hasMore && <div ref={sentinelRef} className={styles.sentinel} />}
        </div>
        <ScrollBar targetRef={gridRef} />
      </div>
    </div>
  );
};

export default ItemList;
