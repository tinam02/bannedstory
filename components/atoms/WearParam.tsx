'use client';
import { useEffect, useRef } from 'react';
import useChar from '@/app/context/CharCtx';
import { CLOSET_TABS } from '@/lib/closet';
import { asOutfitItem, loadItemIndex } from '@/app/hooks/useItemIndex';

/**
 * `/?wear=1007088`, which is what every item page's button links to.
 *
 * Reads window.location rather than useSearchParams. On a statically exported
 * page useSearchParams forces the whole tree into a suspense boundary and
 * bails out of prerendering, and this is a one shot effect that only ever runs
 * in a browser, so there is nothing to gain from doing it the framework way.
 *
 */
export default function WearParam() {
  const { equip, hydrated } = useChar();
  // strict mode mounts effects twice in dev, and equipping twice is harmless
  // but the url rewrite below is not worth doing twice either
  const done = useRef(false);

  useEffect(() => {
    // wait for the saved characters.
    //
    // CharProvider loads them in its own effect and replaces the whole cast
    // when it does, and it is the outermost provider, so its effect runs after
    // this one. equipping first means equipping onto a character that is about
    // to be thrown away
    if (!hydrated || done.current) return;
    done.current = true;

    const id = Number(new URLSearchParams(window.location.search).get('wear'));
    if (!Number.isFinite(id) || id <= 0) return;

    let stale = false;

    (async () => {
      for (const tab of CLOSET_TABS) {
        if (!tab.index) continue;
        // the id block is what tells the three Accessory tabs apart
        if (tab.ids && (id < tab.ids.from || id >= tab.ids.to)) continue;

        const index = await loadItemIndex(tab.index);
        if (stale) return;
        const entry = index?.items.find(e => e.id === id);
        if (!entry) continue;

        equip(tab.slot, asOutfitItem(entry, tab.slot));
        break;
      }

      // drop the parameter once it has been used. a refresh should not put the
      // item back on a character the visitor has since changed
      window.history.replaceState(null, '', window.location.pathname);
    })();

    return () => {
      stale = true;
    };
  }, [equip, hydrated]);

  return null;
}
