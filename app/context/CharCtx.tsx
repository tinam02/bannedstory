'use client';
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export const CharContext = createContext<{
  equippedItems: any;
  setEquippedItems: any;
  equippedBodyItems: any;
  setEquippedBodyItems: any;
}>({
  equippedItems: [],
  setEquippedItems: () => {},
  equippedBodyItems: [],
  setEquippedBodyItems: () => {},
});

export function CharProvider({ children }: { children: React.ReactNode }) {
  const [equippedItems, setEquippedItems] = useState(null);
  const [equippedBodyItems, setEquippedBodyItems] = useState(null);

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
    }),
    [equippedItems, setEquippedItems, equippedBodyItems, setEquippedBodyItems]
  );

  return <CharContext.Provider value={value}>{children}</CharContext.Provider>;
}

export default function useChar() {
  return useContext(CharContext);
}
