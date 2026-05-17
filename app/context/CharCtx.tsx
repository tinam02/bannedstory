'use client';
import { SelectedItems } from '@/types';
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 4;
export const ZOOM_STEP = 0.5;

export const DEFAULT_SKIN_ID = 2000;

export const CharContext = createContext<{
  selectedItems: SelectedItems | null;
  setSelectedItems: React.Dispatch<
    React.SetStateAction<SelectedItems | null>
  >;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  skinId: number;
  setSkinId: React.Dispatch<React.SetStateAction<number>>;
}>({
  selectedItems: null,
  setSelectedItems: () => {},
  zoom: 1,
  setZoom: () => {},
  skinId: DEFAULT_SKIN_ID,
  setSkinId: () => {},
});

export function CharProvider({ children }: { children: React.ReactNode }) {
  const [selectedItems, setSelectedItems] = useState<SelectedItems | null>(
    null
  );
  const [zoom, setZoom] = useState(2);
  const [skinId, setSkinId] = useState(DEFAULT_SKIN_ID);

  // save to ls
  useEffect(() => {
    if (!selectedItems) return;
    localStorage.setItem('selectedItems', JSON.stringify(selectedItems));
  }, [selectedItems]);

  useEffect(() => {
    localStorage.setItem('skinId', String(skinId));
  }, [skinId]);

  // load from ls
  useEffect(() => {
    const raw = localStorage.getItem('selectedItems');
    setSelectedItems(raw ? JSON.parse(raw) : {});
    const savedSkin = Number(localStorage.getItem('skinId'));
    if (Number.isFinite(savedSkin) && savedSkin > 0) setSkinId(savedSkin);
  }, []);

  const value = useMemo(
    () => ({ selectedItems, setSelectedItems, zoom, setZoom, skinId, setSkinId }),
    [selectedItems, zoom, skinId]
  );

  return <CharContext.Provider value={value}>{children}</CharContext.Provider>;
}

export default function useChar() {
  return useContext(CharContext);
}
