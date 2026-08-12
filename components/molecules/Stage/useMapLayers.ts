'use client';
import { useEffect, useState } from 'react';
import { mapManifestUrl } from '@/lib/assets';

// reads the layers.json that scripts/wz/dump-map-layers.lua writes
//
// only maps with layers: true in index.json have one, the rest are plates only

/** one sprite out of the map's wz data */
export type MapSprite = {
  file: string;
  // x/y is the wz anchor, ox/oy the sprite rect offset from it, so the top left
  // in map pixels is x + ox
  x: number;
  y: number;
  ox: number;
  oy: number;
  w: number;
  h: number;
  /** 1 means a still png, anything higher means an apng */
  frames: number;
  /** horizontal flip */
  f: number;
  /** wz opacity, 0 to 255. absent means opaque */
  a?: number;
  // obj only
  layer?: number;
  z?: number;
  // back only. rx/ry are parallax rates, so a back's drawn position depends on
  // where the camera was, unlike an obj which is pinned to the map
  front?: number;
  rx?: number;
  ry?: number;
  /** 0 none, 1-3 tiling, 4-7 tiling plus an auto scroll */
  type?: number;
  cx?: number;
  cy?: number;
  /** which state of the map this belongs to, see inState */
  tags?: string;
};

/**
 * Whether a sprite or an emitter belongs to the state the map is being shown in.
 *
 * A map can carry more than one version of its own scenery, at the same
 * coordinates, and pick between them. Temple of Tears holds a clean set and a
 * polluted one, right down to two copies of each pillar with different bands,
 * which is why drawing all of them put smoke on a temple that has none.
 *
 * Untagged belongs to every state, and a map with no state chosen shows the lot,
 * which is every other map.
 */
export const inState = (tags: string | undefined, want: string[] | undefined) => {
  if (!want?.length) return true;
  const own = tags?.trim();
  if (!own) return true;
  return own.split(/[\s,]+/).some(t => want.includes(t));
};

// a scrolling axis is driven by a timer rather than the camera, see BackPatch.cs
export const scrollsH = (s: MapSprite) => s.type === 4 || s.type === 6;
export const scrollsV = (s: MapSprite) => s.type === 5 || s.type === 7;

// which axes repeat. 1 and 3 tile across, 2 and 3 tile down, and the moving
// types carry their own axis plus, for 6 and 7, the other one as well
export const tilesH = (s: MapSprite) =>
  s.type === 1 || s.type === 3 || s.type === 4 || s.type === 6 || s.type === 7;
export const tilesV = (s: MapSprite) =>
  s.type === 2 || s.type === 3 || s.type === 5 || s.type === 6 || s.type === 7;

/**
 * Whether the Stage has to draw this one over the plate.
 *
 * Two ways to move. A sprite with frames is an apng and animates in place. A
 * sprite with a scrolling type holds one frame and drifts instead, which is
 * how every sky in the game works: seven cloud layers at seven speeds and not
 * an animation between them.
 *
 * Anything else is still, and the plate already has it.
 */
export const moves = (s: MapSprite) => s.frames > 1 || scrollsH(s) || scrollsV(s);

/**
 * How far apart the repeats go.
 *
 * cx and cy are the tile spacing, not the sprite size, so a 287px cloud on a
 * 900px step leaves 613px of sky between copies. Zero means butt them together
 */
export const stepH = (s: MapSprite) => s.cx || s.w;
export const stepV = (s: MapSprite) => s.cy || s.h;

/**
 * Pixels a second, from wz's rate number.
 *
 * On a scrolling layer rx and ry stop being parallax rates and become speeds,
 * which is why the parallax shift skips whichever axis is scrolling. The
 * multiplier is the client's, five pixels a second per unit, so this map's
 * clouds run 20 to 40 and its one vertical layer runs 250
 */
const PX_PER_RATE = 5;
export const speedH = (s: MapSprite) => (s.rx ?? 0) * PX_PER_RATE;
export const speedV = (s: MapSprite) => (s.ry ?? 0) * PX_PER_RATE;

export type MapLayers = {
  id: string;
  /**
   * The playable rect.
   *
   * Also the plate's top left, and the size of back.png, on every map captured
   * straight out of MapRender. A map whose art runs outside vr gets a plate of
   * its own instead: then MapInfo.plate is the origin and this is only a rect
   * somewhere in the middle of it
   */
  vr: { l: number; t: number; r: number; b: number };
  back: MapSprite[];
  obj: MapSprite[];
};

const useMapLayers = (mapId: string | null, has: boolean) => {
  const [layers, setLayers] = useState<MapLayers | null>(null);

  useEffect(() => {
    if (!mapId || !has) {
      setLayers(null);
      return;
    }
    // drop the old map's manifest before fetching the new one. prevent 404s
    setLayers(null);
    let stale = false;
    fetch(mapManifestUrl(`${mapId}/layers/layers.json`))
      .then(r => (r.ok ? r.json() : null))
      .then((data: MapLayers | null) => {
        if (!stale) setLayers(data);
      })
      .catch(() => {
        // no manifest just means the map stays a still picture
      });
    return () => {
      stale = true;
    };
  }, [mapId, has]);

  // only ever hand back the manifest that belongs to the map being asked about
  // checking the id here is synchronous with mapId, so that render never happens
  return layers && layers.id === mapId ? layers : null;
};

export default useMapLayers;
