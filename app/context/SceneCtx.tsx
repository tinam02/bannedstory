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

export const DEFAULT_BG = '#262335';

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

/**
 * A speech balloon or a name tag. Both are a UI.wz frame drawn around typed
 * text, so they carry the same three fields.
 *
 * Off by default. Most people are here to dress a character up, and a caption
 * nobody asked for sitting over the sprite is in the way.
 */
export type Caption = {
  on: boolean;
  text: string;
  /** keys into public/ui/<set>/<set>.json */
  style: string;
};

type Scene = {
  bg: string;
  mapId: string | null;
  speech: Caption;
  nametag: Caption;
};

type SceneApi = Scene & {
  setBg: (bg: string) => void;
  setMapId: (id: string | null) => void;
  /** merges a partial, so a caller can flip `on` without restating the text */
  setSpeech: (patch: Partial<Caption>) => void;
  setNametag: (patch: Partial<Caption>) => void;
  /** every map with plates on disk, name-sorted */
  maps: MapInfo[];
  /** False until localStorage has been read, so nothing flashes the default. */
  hydrated: boolean;
};

// balloon 0 is the plain white one every version of the game has had. name tags
// don't start until 3, and that one is the plain grey plate
const DEFAULT_SPEECH: Caption = { on: false, text: '', style: '0' };
const DEFAULT_NAMETAG: Caption = { on: false, text: '', style: '3' };

const Ctx = createContext<SceneApi>({
  bg: DEFAULT_BG,
  mapId: null,
  speech: DEFAULT_SPEECH,
  nametag: DEFAULT_NAMETAG,
  setBg: () => {},
  setMapId: () => {},
  setSpeech: () => {},
  setNametag: () => {},
  maps: [],
  hydrated: false,
});

export const SceneProvider = ({ children }: { children: React.ReactNode }) => {
  const [bg, setBgState] = useState(DEFAULT_BG);
  const [mapId, setMapIdState] = useState<string | null>(null);
  const [speech, setSpeechState] = useState(DEFAULT_SPEECH);
  const [nametag, setNametagState] = useState(DEFAULT_NAMETAG);
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
      // spread onto the default so a key added later doesn't come back undefined
      if (saved?.speech) setSpeechState({ ...DEFAULT_SPEECH, ...saved.speech });
      if (saved?.nametag)
        setNametagState({ ...DEFAULT_NAMETAG, ...saved.nametag });
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

  // patched off the previous value rather than the closed-over one, so two
  // updates in the same tick can't drop each other
  const setSpeech = useCallback(
    (patch: Partial<Caption>) =>
      setSpeechState(prev => {
        const next = { ...prev, ...patch };
        save({ speech: next });
        return next;
      }),
    [save],
  );

  const setNametag = useCallback(
    (patch: Partial<Caption>) =>
      setNametagState(prev => {
        const next = { ...prev, ...patch };
        save({ nametag: next });
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
      speech,
      setSpeech,
      nametag,
      setNametag,
      maps,
      hydrated,
    }),
    [
      bg,
      setBg,
      mapId,
      setMapId,
      speech,
      setSpeech,
      nametag,
      setNametag,
      maps,
      hydrated,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

const useScene = () => useContext(Ctx);

export default useScene;
