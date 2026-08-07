'use client';
import { ItemManifest, WornItem } from '@/lib/avatar';
import { EffectManifest, WornEffect } from '@/lib/effects';
import { Outfit } from '@/types';
import { ASSET_BASE, SHEET_EXT } from '@/lib/assets';
import { useEffect, useState } from 'react';

/**
 * Loads the sheets and manifests for whatever a character is wearing.
 *
 * Only the items extract-avatar.lua has covered so far will resolve. Anything
 * else is skipped rather than faked, so a half dressed character means a
 * missing extraction and not a broken renderer
 */

const ROOT = ASSET_BASE;

/**
 * The equipped slot -> the folder its manifests are in.
 *
 * Keyed by the slot in `selectedItems`, which is the item's subCategory for
 * everything except the weapon tab. That one equips under a flat "Weapon"
 * because the API spreads weapons over sixteen subcategories and a character
 * only holds one, so the category is the fallback for anything that arrives
 * with a weapon type as its slot instead
 */
const FOLDERS: Record<string, string> = {
  Body: 'Body',
  Head: 'Head',
  Face: 'Face',
  Hair: 'Hair',
  Hat: 'Cap',
  Top: 'Coat',
  Overall: 'Longcoat',
  Bottom: 'Pants',
  Shoes: 'Shoes',
  Glove: 'Glove',
  Cape: 'Cape',
  Weapon: 'Weapon',
  'Face Accessory': 'Accessory',
  'Eye Decoration': 'Accessory',
  Earrings: 'Accessory',
};

const folderFor = (slot: string, category?: string) =>
  FOLDERS[slot] ?? (category?.includes('Weapon') ? 'Weapon' : null);

// the part name only has to be stable and unique per worn item. body, head,
// face and hair have to match by name though, they're the claim order
const partFor = (slot: string) => slot.toLowerCase().replace(/\s+/g, '');

export type AvatarMeta = { zmap: string[]; smap: Record<string, string> };

// module level, so remounting or switching character doesn't refetch
let metaOnce: Promise<AvatarMeta> | null = null;
let effectIdsOnce: Promise<Set<number>> | null = null;
const manifests = new Map<string, Promise<ItemManifest | null>>();
const effectManifests = new Map<number, Promise<EffectManifest | null>>();
const sheets = new Map<string, Promise<HTMLImageElement | null>>();

/**
 * The ids that have an effect at all, fetched once.
 *
 * 1664 of 52,724, so asking per worn item would be a 404 nearly every time.
 * An empty set on failure means effects quietly do not draw, which is the
 * right way round: the character still renders
 */
const loadEffectIds = () => {
  effectIdsOnce ??= fetch(`${ROOT}/Effect/index.json`)
    .then(r => (r.ok ? (r.json() as Promise<number[]>) : []))
    .then(ids => new Set(ids))
    .catch(() => new Set<number>());
  return effectIdsOnce;
};

const loadEffect = (id: number) => {
  let hit = effectManifests.get(id);
  if (!hit) {
    hit = fetch(`${ROOT}/Effect/${id}.json`)
      .then(r => (r.ok ? (r.json() as Promise<EffectManifest>) : null))
      .catch(() => null);
    effectManifests.set(id, hit);
  }
  return hit;
};

const loadManifest = (folder: string, id: number) => {
  const url = `${ROOT}/${folder}/${id}.json`;
  let hit = manifests.get(url);
  if (!hit) {
    hit = fetch(url)
      .then(r => (r.ok ? (r.json() as Promise<ItemManifest>) : null))
      .catch(() => null);
    manifests.set(url, hit);
  }
  return hit;
};

const loadSheet = (url: string) => {
  let hit = sheets.get(url);
  if (!hit) {
    hit = new Promise<HTMLImageElement | null>(resolve => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => resolve(null);
      el.src = url;
    });
    sheets.set(url, hit);
  }
  return hit;
};

export type LoadedAvatar = {
  meta: AvatarMeta;
  worn: WornItem[];
  /** the worn items that also carry an Effect appearance */
  effects: WornEffect[];
  images: Map<string, HTMLImageElement>;
  /** slots we have no extraction for yet, so the ui can say so */
  missing: string[];
};

const useAvatar = (outfit: Outfit, enabled: boolean) => {
  const [loaded, setLoaded] = useState<LoadedAvatar | null>(null);

  // the items, not the whole outfit. an adjustment or a pose change shouldn't
  // send us back to the network
  const key = Object.entries(outfit.selectedItems)
    .map(([slot, item]) => `${slot}:${item?.id}`)
    .sort()
    .join(',');

  useEffect(() => {
    if (!enabled) return;
    let stale = false;

    metaOnce ??= fetch(`${ROOT}/meta.json`).then(r => r.json());

    (async () => {
      const meta = await metaOnce!;
      const worn: WornItem[] = [];
      const missing: string[] = [];

      await Promise.all(
        Object.entries(outfit.selectedItems).map(async ([slot, item]) => {
          if (!item) return;
          const folder = folderFor(slot, item.typeInfo?.category);
          if (!folder) return;
          const manifest = await loadManifest(folder, item.id);
          if (!manifest) {
            missing.push(slot);
            return;
          }
          const part = partFor(slot);
          worn.push({
            part,
            manifest,
            sheetUrl: `${ROOT}/${folder}/${item.id}${SHEET_EXT}`,
            // the face is keyed by expression, everything else by pose
            stance: part === 'face' ? outfit.emotion : undefined,
          });
        }),
      );

      // the effects, for whichever worn items have one. an item's effect is
      // its whole appearance when its Character.wz art is a 1x1 placeholder,
      // so this is not decoration
      const haveEffect = await loadEffectIds();
      const wornEffects: WornEffect[] = [];
      await Promise.all(
        Array.from(new Set(worn.map(w => w.manifest.id)))
          .filter(id => haveEffect.has(id))
          .map(async id => {
            const manifest = await loadEffect(id);
            if (manifest) {
              wornEffects.push({
                manifest,
                sheetUrl: `${ROOT}/Effect/${id}${SHEET_EXT}`,
              });
            }
          }),
      );

      // one load per sheet, not per layer. Array.from rather than spreading a
      // Set, the tsconfig targets es5
      const urls = Array.from(
        new Set([...worn.map(w => w.sheetUrl), ...wornEffects.map(e => e.sheetUrl)]),
      );
      const imgs = await Promise.all(
        urls.map(async url => [url, await loadSheet(url)] as const),
      );
      const images = new Map<string, HTMLImageElement>();
      for (const [url, img] of imgs) if (img) images.set(url, img);

      if (!stale) setLoaded({ meta, worn, effects: wornEffects, images, missing });
    })().catch(() => {
      // nothing extracted yet, the api render is still there
      metaOnce = null;
    });

    return () => {
      stale = true;
    };
  }, [enabled, key, outfit.emotion, outfit.selectedItems]);

  return loaded;
};

export default useAvatar;
