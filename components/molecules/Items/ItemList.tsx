'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchItems, iconUrlFor, preloadImageUrl } from '@/lib/fetch';
import Item from '../../atoms/Item';
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
import { OutfitItem } from '@/types';

// How close to the bottom of the grid the sentinel starts pulling the next page. Roughly a row and a half of lead time, so the list refills before th scroll actually bottoms out.
const PRELOAD_MARGIN = '200px';

// how many rows of index to reveal at a time. whole tab is already in memory, this only keeps the dom from holding 17000 nodes at once
const LOCAL_PAGE = 60;

/**
 * One closet tab.
 *
 * Every tab now reads our own extraction: names, icons and cash flags all come
 * from the client's files, and searching is a filter over an array already in
 * memory. Nothing here calls maplestory.io.
 *
 * The api path below is dead code kept as a fallback. It runs only if a tab has
 * no `index` in lib/closet.ts, or if its index file fails to load, in which case
 * a tab degrades instead of coming up empty. Worth keeping until the assets have
 * proven themselves on real hosting, and deletable after.
 *
 * The index is the whole point: their list is frozen at GMS 265, so items that
 * exist in game and render fine from our sprites cannot be found through their
 * search at all.
 *
 * Pages are appended rather than swapped, so the list just grows as you scroll.
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
  const { slot, categories } = tab;
  const index = useItemIndex(tab);
  const local = Boolean(tab.index) && index !== null;

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
  const listKey = `${slot} ${catKey} ${cashOnly} ${nameText} ${local}`;
  const [prevListKey, setPrevListKey] = useState(listKey);
  if (prevListKey !== listKey) {
    setPrevListKey(listKey);
    setItems([]);
    setPage(0);
    setHasMore(true);
  }

  // our own index, filtered here. `ids` splits the tabs that share a folder,
  // since wz files face accessories, eye decorations and earrings together
  const matches = useMemo(() => {
    if (!local || !index) return [];
    const q = nameText.toLowerCase();
    return index.items.filter(e => {
      if (tab.ids && (e.id < tab.ids.from || e.id >= tab.ids.to)) return false;
      if (cashOnly && !e.cash) return false;
      if (q && !e.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [local, index, nameText, cashOnly, tab.ids]);

  useEffect(() => {
    if (local) {
      // already in memory, this is just a slice not request
      setLoading(false);
      setHasMore((page + 1) * LOCAL_PAGE < matches.length);
      return;
    }
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
  }, [page, slot, catKey, cashOnly, nameText, local, matches.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    // Rebuilt once the in-flight page lands: re-observing re-tests the sentinel,
    // so a viewport taller than one page keeps pulling until it's full.
    //
    // `page` has to be in here. an IntersectionObserver only fires on a change,
    // and appending rows leaves the sentinel exactly as intersecting as it
    // already was, so nothing fires again. the api path got away with it by
    // accident because `loading` flipped every page and rebuilt the observer.
    // reading our own index never loads, so without this the list stopped dead
    // at the first LOCAL_PAGE rows
    if (!sentinel || !hasMore || loading) return;
    const io = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) setPage(p => p + 1);
      },
      { root: gridRef.current, rootMargin: PRELOAD_MARGIN },
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, [hasMore, loading, page]);

  // warms sprite sheet w/ hovered item
  const prefetchOnDwell = (id: number) => {
    const folder = tab.index;
    if (!folder) return;
    preloader.trigger(() => preloadImageUrl(`/avatar/${folder}/${id}.png`));
  };

  // Only a fresh query dims the grid. Appends leave what you're looking at alone
  const reloading = loading && page === 0;
  const shown = local ? matches.slice(0, (page + 1) * LOCAL_PAGE) : items;
  const empty = local ? matches.length === 0 : !loading && items.length === 0;

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
          {empty && (
            <div className={styles.empty}>
              {nameText ? `No items match "${nameText}"` : 'No items found'}
            </div>
          )}
          {local && index
            ? (shown as unknown as typeof matches).map(e => (
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
              ))
            : (shown as OutfitItem[]).map(item => (
                <button
                  key={item.id}
                  type='button'
                  className={styles.item}
                  onClick={() => equip(slot, item)}
                  onMouseEnter={() => prefetchOnDwell(item.id)}
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
