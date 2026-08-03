'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

/**
 * Everything about the *setting* rather than the character.
 * Deliberately separate from `CharCtx`
 */

const KEY = 'scene';

export const DEFAULT_BG = '#262335';

type Scene = { bg: string };

type SceneApi = Scene & {
  setBg: (bg: string) => void;
  /** False until localStorage has been read, so nothing flashes the default. */
  hydrated: boolean;
};

const Ctx = createContext<SceneApi>({
  bg: DEFAULT_BG,
  setBg: () => {},
  hydrated: false,
});

export const SceneProvider = ({ children }: { children: React.ReactNode }) => {
  const [bg, setBgState] = useState(DEFAULT_BG);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const saved = raw ? (JSON.parse(raw) as Partial<Scene>) : null;
      if (typeof saved?.bg === 'string') setBgState(saved.bg);
    } catch {
      // A corrupt key shouldn't take the page down; the default is fine.
    }
    setHydrated(true);
  }, []);

  const setBg = useCallback((next: string) => {
    setBgState(next);
    localStorage.setItem(KEY, JSON.stringify({ bg: next }));
  }, []);

  const value = useMemo(
    () => ({ bg, setBg, hydrated }),
    [bg, setBg, hydrated],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

const useScene = () => useContext(Ctx);

export default useScene;
