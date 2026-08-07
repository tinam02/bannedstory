'use client';
import { ClosetTab, indexFolderFor } from '@/lib/closet';
import { asSheet, ASSET_BASE } from '@/lib/assets';
import { OutfitItem } from '@/types';
import { REGION, VERSION } from '@/lib/fetch';
import { useEffect, useState } from 'react';

/**
 * Loads a closet tab's own item index, the one extract-index.lua builds.
 *
 * Small enough to hold whole: the biggest tab is Hair at a few hundred KB of
 * json, and the entire index across every tab is about 12 MB including icons
 */

const ROOT = `${ASSET_BASE}/index`;

/** one row as extract-index.lua writes it */
export type IndexEntry = {
  id: number;
  name: string;
  cash: boolean;
  /** which sheet, since a big folder is split across a few */
  s: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type ItemIndex = {
  sheets: string[];
  items: IndexEntry[];
};

// module level, so switching tabs and back doesn't refetch
const cache = new Map<string, Promise<ItemIndex | null>>();

const load = (folder: string) => {
  let hit = cache.get(folder);
  if (!hit) {
    hit = fetch(`${ROOT}/${folder}.json`)
      .then(r => (r.ok ? (r.json() as Promise<ItemIndex>) : null))
      .catch(() => null);
    cache.set(folder, hit);
  }
  return hit;
};

/** the cached loader, for callers outside react. the randomiser uses it */
export const loadItemIndex = (folder: string) => load(folder);

/** the sheet a row's icon lives on, for css background positioning */
export const iconSheetUrl = (folder: string, index: ItemIndex, e: IndexEntry) =>
  asSheet(`${ROOT}/${index.sheets[e.s] ?? index.sheets[0]}`);

/**
 * An index row in the shape the rest of the app passes around.
 *
 * `typeInfo.subCategory` is what decides the face's animationName and which
 * icon endpoint a fallback would use, so it carries the tab's slot
 */
export const asOutfitItem = (e: IndexEntry, slot: string): OutfitItem =>
  ({
    id: e.id,
    name: e.name,
    isCash: e.cash,
    region: REGION,
    version: VERSION,
    typeInfo: { subCategory: slot },
  }) as unknown as OutfitItem;

/** 1 icon, ready to hand to SpriteIcon */
export type ItemIcon = {
  sheet: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

// id -> entry, built once per folder. the wearing list asks for a handful of
// ids and Hair alone is 17k rows, so scanning the array each time would be
// silly even though it would work
const byId = new Map<string, Map<number, IndexEntry>>();

const lookup = async (folder: string, id: number) => {
  const index = await load(folder);
  if (!index) return null;
  let map = byId.get(folder);
  if (!map) {
    map = new Map(index.items.map(e => [e.id, e]));
    byId.set(folder, map);
  }
  const e = map.get(id);
  if (!e) return null;
  return {
    sheet: asSheet(`${ROOT}/${index.sheets[e.s] ?? index.sheets[0]}`),
    x: e.x,
    y: e.y,
    w: e.w,
    h: e.h,
  } as ItemIcon;
};

/**
 * The icon for 1 equipped item, out of our own index.
 *
 * Null while loading, and null for an item we have no index entry for, so
 * callers can fall back rather than show a gap
 */
export const useItemIcon = (slot: string, id?: number) => {
  const [icon, setIcon] = useState<ItemIcon | null>(null);
  const folder = indexFolderFor(slot);

  useEffect(() => {
    if (!folder || id == null) {
      setIcon(null);
      return;
    }
    let stale = false;
    lookup(folder, id).then(got => {
      if (!stale) setIcon(got);
    });
    return () => {
      stale = true;
    };
  }, [folder, id]);

  return icon;
};

const useItemIndex = (tab: ClosetTab) => {
  const [index, setIndex] = useState<ItemIndex | null>(null);
  const folder = tab.index;

  useEffect(() => {
    if (!folder) {
      setIndex(null);
      return;
    }
    let stale = false;
    load(folder).then(got => {
      if (!stale) setIndex(got);
    });
    return () => {
      stale = true;
    };
  }, [folder]);

  return index;
};

export default useItemIndex;
