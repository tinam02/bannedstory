'use client';
import { useEffect, useState } from 'react';

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
  // obj only
  layer?: number;
  z?: number;
  // back only
  front?: number;
};

export type MapLayers = {
  id: string;
  /** the playable rect, and also exactly the size of back.png */
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
    let stale = false;
    fetch(`/maps/${mapId}/layers/layers.json`)
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

  return layers;
};

export default useMapLayers;
