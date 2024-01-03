'use client';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export const CharContext = createContext<{
  equippedItems: any;
  setEquippedItems: any;
}>({
  equippedItems: [],
  setEquippedItems: () => {},
});

export function CharProvider({ children }: { children: React.ReactNode }) {
  const [equippedItems, setEquippedItems] = useState([]);

  const value = useMemo(
    () => ({
      equippedItems,
      setEquippedItems,
    }),
    [equippedItems, setEquippedItems]
  );

  return <CharContext.Provider value={value}>{children}</CharContext.Provider>;
}

export default function useChar() {
  return useContext(CharContext);
}
