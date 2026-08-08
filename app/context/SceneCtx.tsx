'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

/**
 * Everything about the *setting* rather than the character.
 * Deliberately separate from `CharCtx`
 */

const KEY = 'scene';

export const DEFAULT_BG = '#100E1A';

/** one entry of public/maps/index.json, written by `npm run maps` */
export type MapInfo = {
  id: string;
  name: string;
  street: string;
  w: number;
  h: number;
  front: boolean;
  layers: boolean;
  /** true once npm run webp has converted this map's plates and sprites */
  webp: boolean;
  // both from an optional capture.json
  /** MapRender's camera centre at capture time */
  cam?: { x: number; y: number };
  /** plate was captured with ctrl+3, so objects come from the manifest instead */
  objsHidden?: boolean;
  /** sprite files to drop, a trailing * matches a prefix. `keep` wins over `hide` */
  hide?: string[];
  keep?: string[];
};

// zoom scales .plates, which holds the map and every character standing in it,
// so it belongs to the scene and not to any one of them
export const ZOOM_MIN = 1;
export const ZOOM_MAX = 4;
export const ZOOM_STEP = 1;

type Scene = {
  bg: string;
  mapId: string | null;
  zoom: number;
};

type SceneApi = Scene & {
  setBg: (bg: string) => void;
  setMapId: (id: string | null) => void;
  setZoom: (update: number | ((zoom: number) => number)) => void;
  /** every map with plates on disk, name-sorted */
  maps: MapInfo[];
  /** False until localStorage has been read, so nothing flashes the default. */
  hydrated: boolean;
};

const Ctx = createContext<SceneApi>({
  bg: DEFAULT_BG,
  mapId: null,
  zoom: ZOOM_MIN,
  setBg: () => {},
  setMapId: () => {},
  setZoom: () => {},
  maps: [],
  hydrated: false,
});

export const SceneProvider = ({ children }: { children: React.ReactNode }) => {
  const [bg, setBgState] = useState(DEFAULT_BG);
  const [mapId, setMapIdState] = useState<string | null>(null);
  const [zoom, setZoomState] = useState(ZOOM_MIN);
  const [maps, setMaps] = useState<MapInfo[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // null is a real choice, it means "no map, just the backdrop colour"
  //
  // so we need to know whether the saved scene had ever picked one, otherwise
  // we would keep re-selecting a default over the top of a deliberate null
  const hadSavedMap = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const saved = raw ? (JSON.parse(raw) as Partial<Scene>) : null;
      if (typeof saved?.bg === 'string') setBgState(saved.bg);
      if (typeof saved?.zoom === 'number') setZoomState(saved.zoom);
      if (saved && 'mapId' in saved) {
        hadSavedMap.current = true;
        setMapIdState(saved.mapId ?? null);
      }
    } catch {
      // A corrupt key shouldn't take the page down; the default is fine.
    }
    setHydrated(true);
  }, []);

  // fetched rather than imported, so adding a map and re-running `npm run maps`
  // shows up without a rebuild
  useEffect(() => {
    let stale = false;
    fetch('/maps/index.json')
      .then(r => (r.ok ? r.json() : []))
      .then((list: MapInfo[]) => {
        if (stale) return;
        setMaps(list);
        if (!hadSavedMap.current && list.length) setMapIdState(list[0].id);
      })
      .catch(() => {
        // no index yet just means no maps, the backdrop colour still works
      });
    return () => {
      stale = true;
    };
  }, []);

  const save = useCallback((next: Partial<Scene>) => {
    const raw = localStorage.getItem(KEY);
    const prev = raw ? JSON.parse(raw) : {};
    localStorage.setItem(KEY, JSON.stringify({ ...prev, ...next }));
  }, []);

  const setBg = useCallback(
    (next: string) => {
      setBgState(next);
      save({ bg: next });
    },
    [save],
  );

  const setMapId = useCallback(
    (next: string | null) => {
      hadSavedMap.current = true;
      setMapIdState(next);
      save({ mapId: next });
    },
    [save],
  );

  const setZoom = useCallback(
    (update: number | ((zoom: number) => number)) =>
      setZoomState(prev => {
        const next = typeof update === 'function' ? update(prev) : update;
        save({ zoom: next });
        return next;
      }),
    [save],
  );

  const value = useMemo(
    () => ({
      bg,
      setBg,
      mapId,
      setMapId,
      zoom,
      setZoom,
      maps,
      hydrated,
    }),
    [bg, setBg, mapId, setMapId, zoom, setZoom, maps, hydrated],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

const useScene = () => useContext(Ctx);

export default useScene;
