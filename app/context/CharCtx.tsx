'use client';
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

export const CharContext = createContext<{
  equippedItems: any;
  setEquippedItems: any;
  equippedBodyItems: any;
  setEquippedBodyItems: any;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
}>({
  equippedItems: [],
  setEquippedItems: () => {},
  equippedBodyItems: [],
  setEquippedBodyItems: () => {},
  zoom: 1,
  setZoom: () => {},
});

export function CharProvider({ children }: { children: React.ReactNode }) {
  const [equippedItems, setEquippedItems] = useState(null);
  const [equippedBodyItems, setEquippedBodyItems] = useState(null);
  const [zoom, setZoom] = useState(2);

  //save to ls
  useEffect(() => {
    if (!equippedItems) return;
    localStorage.setItem('equippedItems', JSON.stringify(equippedItems));
  }, [equippedItems]);

  useEffect(() => {
    if (!equippedBodyItems) return;
    localStorage.setItem(
      'equippedBodyItems',
      JSON.stringify(equippedBodyItems)
    );
  }, [equippedBodyItems]);

  //get from ls
  useEffect(() => {
    if (localStorage.getItem('equippedItems')) {
      setEquippedItems(
        JSON.parse(localStorage.getItem('equippedItems') || '[]')
      );
    }
    if (localStorage.getItem('equippedBodyItems')) {
      setEquippedBodyItems(
        JSON.parse(localStorage.getItem('equippedBodyItems') || '[]')
      );
    }
  }, []);

  const value = useMemo(
    () => ({
      equippedItems,
      setEquippedItems,
      equippedBodyItems,
      setEquippedBodyItems,
      zoom,
      setZoom,
    }),
    [
      equippedItems,
      setEquippedItems,
      equippedBodyItems,
      setEquippedBodyItems,
      zoom,
      setZoom,
    ]
  );

  return <CharContext.Provider value={value}>{children}</CharContext.Provider>;
}

export default function useChar() {
  return useContext(CharContext);
}
