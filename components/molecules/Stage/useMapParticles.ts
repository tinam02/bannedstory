'use client';
import { useEffect, useState } from 'react';
import { mapManifestUrl } from '@/lib/assets';
import type { MapParticles } from './particles';

// reads the particles.json that scripts/wz/dump-map-layers.lua writes
//
// separate from layers.json because most maps have no particle node at all, and
// the ones that do share nothing with the sprite entries: emitters are run, not
// drawn. only maps with particles: true in index.json have a file here

const useMapParticles = (mapId: string | null, has: boolean) => {
  const [data, setData] = useState<MapParticles | null>(null);

  useEffect(() => {
    if (!mapId || !has) {
      setData(null);
      return;
    }
    // drop the old map's emitters before fetching the new ones, same as the
    // layer manifest, or the wrong map paints for a frame
    setData(null);
    let stale = false;
    fetch(mapManifestUrl(`${mapId}/layers/particles.json`))
      .then(r => (r.ok ? r.json() : null))
      .then((next: MapParticles | null) => {
        if (!stale) setData(next);
      })
      .catch(() => {
        // no file just means the map has no emitters
      });
    return () => {
      stale = true;
    };
  }, [mapId, has]);

  return data && data.id === mapId ? data : null;
};

export default useMapParticles;
