'use client';
import { Outfit, OutfitItem } from '@/types';
import {
  createOutfit,
  DEFAULT_SKIN_ID,
  skinEntries,
  skinIdOf,
  withSkin,
} from '@/lib/outfit';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 4;
export const ZOOM_STEP = 0.5;

export { DEFAULT_SKIN_ID };

const STORAGE_KEY = 'outfit';
// Pre-unification keys, read once so a saved character survives the upgrade.
const LEGACY_ITEMS_KEY = 'selectedItems';
const LEGACY_SKIN_KEY = 'skinId';

type CharContextValue = {
  outfit: Outfit;
  setOutfit: React.Dispatch<React.SetStateAction<Outfit>>;
  equip: (slot: string, item: OutfitItem) => void;
  unequip: (slot: string) => void;
  skinId: number;
  setSkinId: (id: number) => void;
  zoom: number;
  setZoom: (update: number | ((zoom: number) => number)) => void;
  animating: boolean;
  toggleAnimating: () => void;
  /** False until localStorage has been read, so nothing overwrites it early. */
  hydrated: boolean;
};

const FALLBACK = createOutfit(0);

export const CharContext = createContext<CharContextValue>({
  outfit: FALLBACK,
  setOutfit: () => {},
  equip: () => {},
  unequip: () => {},
  skinId: DEFAULT_SKIN_ID,
  setSkinId: () => {},
  zoom: FALLBACK.zoom,
  setZoom: () => {},
  animating: FALLBACK.animating,
  toggleAnimating: () => {},
  hydrated: false,
});

/** Rebuilds an outfit from the old two-key localStorage layout. */
function migrateLegacy(now: number): Outfit | null {
  const rawItems = localStorage.getItem(LEGACY_ITEMS_KEY);
  if (!rawItems) return null;
  try {
    const legacy = JSON.parse(rawItems) as Record<string, any>;
    const skinId =
      Number(localStorage.getItem(LEGACY_SKIN_KEY)) || DEFAULT_SKIN_ID;
    const selectedItems = skinEntries(skinId);
    for (const [slot, item] of Object.entries(legacy)) {
      // Legacy items keyed the id as `itemId` and had no region/version.
      if (!item?.itemId || slot === 'Body' || slot === 'Head') continue;
      selectedItems[slot] = {
        name: item.name ?? slot,
        desc: item.desc ?? '',
        id: item.itemId,
        region: 'GMS',
        version: '265',
        typeInfo: {
          overallCategory: item.overallCategory,
          category: item.category,
          subCategory: slot,
          lowItemId: item.lowItemId,
          highItemId: item.highItemId,
        },
        ...(item.isCash !== undefined && { isCash: item.isCash }),
        ...(item.requiredJobs && { requiredJobs: item.requiredJobs }),
      };
    }
    return { ...createOutfit(now), skin: String(skinId), selectedItems };
  } catch {
    return null;
  }
}

export function CharProvider({ children }: { children: React.ReactNode }) {
  const [outfit, setOutfit] = useState<Outfit>(FALLBACK);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const now = Date.now();
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setOutfit(JSON.parse(stored));
      } catch {
        setOutfit(createOutfit(now));
      }
    } else {
      setOutfit(migrateLegacy(now) ?? createOutfit(now));
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(outfit));
  }, [outfit, hydrated]);

  const equip = useCallback((slot: string, item: OutfitItem) => {
    setOutfit(prev => ({
      ...prev,
      selectedItems: { ...prev.selectedItems, [slot]: item },
    }));
  }, []);

  const unequip = useCallback((slot: string) => {
    setOutfit(prev => {
      const { [slot]: _removed, ...rest } = prev.selectedItems;
      return { ...prev, selectedItems: rest };
    });
  }, []);

  const setSkinId = useCallback((id: number) => {
    setOutfit(prev => withSkin(prev, id));
  }, []);

  const setZoom = useCallback((update: number | ((zoom: number) => number)) => {
    setOutfit(prev => ({
      ...prev,
      zoom: typeof update === 'function' ? update(prev.zoom) : update,
    }));
  }, []);

  const toggleAnimating = useCallback(() => {
    setOutfit(prev => ({ ...prev, animating: !prev.animating }));
  }, []);

  const value = useMemo(
    () => ({
      outfit,
      setOutfit,
      equip,
      unequip,
      skinId: skinIdOf(outfit),
      setSkinId,
      zoom: outfit.zoom,
      setZoom,
      animating: outfit.animating,
      toggleAnimating,
      hydrated,
    }),
    [outfit, equip, unequip, setSkinId, setZoom, toggleAnimating, hydrated],
  );

  return <CharContext.Provider value={value}>{children}</CharContext.Provider>;
}

export default function useChar() {
  return useContext(CharContext);
}
