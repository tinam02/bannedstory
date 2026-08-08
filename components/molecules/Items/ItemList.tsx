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
import {
  asOutfitItem,
  rowSheetUrl,
  useClosetRows,
} from '@/app/hooks/useItemIndex';
import { ClosetTab } from '@/lib/closet';
import { ASSET_BASE, SHEET_EXT } from '@/lib/assets';

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
  const { rows, loaded, ready } = useClosetRows(tab);

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

  // the rows already carry only this tab's slice, so nothing to re-split here
  const hasCash = useMemo(() => rows.some(r => r.e.cash), [rows]);

  // cashOnly is one switch for the whole closet
  const filterCash = cashOnly && hasCash;

  const matches = useMemo(() => {
    const q = nameText.toLowerCase();
    return rows.filter(r => {
      if (filterCash && !r.e.cash) return false;
      if (q && !r.e.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, nameText, filterCash]);

  // A new search means a different list, so start it from the top again.
  // Done during render rather than in an effect, so nothing paints the old
  // scroll position first.
  const listKey = `${tab.slot} ${filterCash} ${nameText}`;
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
  const prefetchOnDwell = (folder: string, id: number) => {
    preloader.trigger(() =>
      preloadImageUrl(`${ASSET_BASE}/${folder}/${id}${SHEET_EXT}`),
    );
  };

  return (
    <div className={styles.panelInner}>
      <div className={styles.searchBar}>
        <Search
          value={query}
          onChange={setQuery}
          onSubmit={next => applyQueryNow(next.trim())}
        />
        {hasCash && <CashFilter on={cashOnly} onChange={onCashOnlyChange} />}
      </div>

      <div className={styles.listWrap}>
        <div
          ref={gridRef}
          className={styles.itemList}
          data-loading={ready ? undefined : ''}
        >
          {ready && matches.length === 0 && (
            <div className={styles.empty}>
              {nameText ? `No items match "${nameText}"` : 'No items found'}
            </div>
          )}
          {ready &&
            loaded &&
            shown.map(r => (
              <button
                key={`${r.folder}-${r.e.id}`}
                type='button'
                className={styles.item}
                onClick={() => equip(r.slot, asOutfitItem(r.e, r.slot))}
                onMouseEnter={() => prefetchOnDwell(r.folder, r.e.id)}
                onMouseLeave={preloader.cancel}
              >
                <SpriteIcon
                  sheet={rowSheetUrl(r, loaded)}
                  x={r.e.x}
                  y={r.e.y}
                  w={r.e.w}
                  h={r.e.h}
                  title={
                    tab.all
                      ? `${r.e.name || r.e.id}  (${r.slot})`
                      : r.e.name || String(r.e.id)
                  }
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
